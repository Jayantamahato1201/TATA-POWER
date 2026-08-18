import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, DataRecord, User } from '../types/index.js';
import { SchemaDetectionService } from './schemaDetectionService.js';
import { AlarmEvaluationService } from './alarmEvaluationService.js';
import { ChartGeneratorService } from './chartGeneratorService.js';
import { db } from '../db/database.js';
import { saveFileToGridFS, deleteFileFromGridFS } from './gridFsStorageService.js';
import { isMongoConnected } from '../db/connection.js';

export interface IngestionOptions {
  name: string;
  category?: string;
  dateColumn?: string;
  timeColumn?: string;
  equipmentColumn?: string;
  description?: string;
}

export class DataIngestionService {
  public static parseFileBuffer(
    buffer: Buffer,
    fileName: string,
    fileType: 'csv' | 'xls' | 'xlsx'
  ): Record<string, any>[] {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    let rows: Record<string, any>[] = [];

    // Helper to sanitize row objects and header keys
    const cleanRows = (raw: Record<string, any>[]): Record<string, any>[] => {
      if (!raw || !Array.isArray(raw)) return [];
      return raw
        .filter((r) => r && typeof r === 'object')
        .map((r) => {
          const cleaned: Record<string, any> = {};
          for (const [key, val] of Object.entries(r)) {
            const cleanKey = String(key)
              .trim()
              .replace(/^[\uFEFF\xEF\xBB\xBF]+/, '')
              .replace(/[\x00-\x1F\x7F]/g, '');
            if (cleanKey.length > 0 && cleanKey !== '__EMPTY' && !cleanKey.startsWith('__EMPTY_')) {
              cleaned[cleanKey] = val;
            }
          }
          return cleaned;
        })
        .filter((r) => {
          const vals = Object.values(r);
          return vals.some((v) => v !== undefined && v !== null && String(v).trim() !== '');
        });
    };

    // Strategy 1: If CSV, TSV, TXT, try PapaParse
    if (ext === 'csv' || ext === 'tsv' || ext === 'txt' || fileType === 'csv') {
      try {
        let text = buffer.toString('utf-8');
        text = text.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
        const parsed = Papa.parse<Record<string, any>>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) =>
            header.trim().replace(/^[\uFEFF\xEF\xBB\xBF]+/, '').replace(/[\x00-\x1F\x7F]/g, ''),
        });

        if (parsed.data && parsed.data.length > 0) {
          rows = cleanRows(parsed.data);
        }
      } catch (csvErr) {
        console.warn('Papa parse failed on CSV buffer, attempting XLSX fallback:', csvErr);
      }
    }

    // Strategy 2: If Excel or if CSV strategy yielded nothing (e.g. binary disguised file)
    if (rows.length === 0) {
      try {
        const workbook = XLSX.read(buffer, {
          type: 'buffer',
          cellDates: true,
          raw: false,
          dateNF: 'yyyy-mm-dd hh:mm:ss',
        });

        if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) continue;
            const json = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
              defval: '',
              raw: false,
            });
            if (json && json.length > 0) {
              const candidate = cleanRows(json);
              if (candidate.length > 0) {
                rows = candidate;
                break;
              }
            }
          }
        }
      } catch (xlsxErr) {
        console.warn('XLSX parse attempt failed:', xlsxErr);
      }
    }

    // Strategy 3: Fallback CSV parsing if Excel was tried first and failed
    if (rows.length === 0) {
      try {
        let text = buffer.toString('utf-8');
        text = text.replace(/^\uFEFF/, '').replace(/^\xEF\xBB\xBF/, '');
        const parsed = Papa.parse<Record<string, any>>(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: 'greedy',
          transformHeader: (header: string) => header.trim(),
        });
        if (parsed.data && parsed.data.length > 0) {
          rows = cleanRows(parsed.data);
        }
      } catch (fallbackErr) {
        console.warn('Fallback CSV parser also failed:', fallbackErr);
      }
    }

    if (!rows || rows.length === 0) {
      throw new Error(
        `Unable to extract records from file "${fileName}". Please ensure the file contains tabular telemetry data with header rows.`
      );
    }

    return rows;
  }

  public static previewFile(buffer: Buffer, fileName: string, fileType: 'csv' | 'xls' | 'xlsx') {
    const rawRows = this.parseFileBuffer(buffer, fileName, fileType);
    if (!rawRows || rawRows.length === 0) {
      throw new Error('Uploaded file is empty or could not be parsed.');
    }

    const columns = SchemaDetectionService.analyzeColumns(rawRows);
    const dateCol = columns.find((c) => c.isTimestamp || c.dataType === 'datetime')?.name;
    const equipCol = columns.find((c) => c.isEquipment)?.name;

    return {
      fileName,
      fileSize: buffer.length,
      fileType,
      totalRows: rawRows.length,
      columns,
      suggestedDateColumn: dateCol,
      suggestedEquipmentColumn: equipCol,
      sampleRows: rawRows.slice(0, 10),
    };
  }

  public static async processAndSave(
    buffer: Buffer,
    fileName: string,
    fileType: 'csv' | 'xls' | 'xlsx',
    options: IngestionOptions,
    user: { id: string; name: string; email: string }
  ) {
    const rawRows = this.parseFileBuffer(buffer, fileName, fileType);
    if (!rawRows || rawRows.length === 0) {
      throw new Error('No valid records found in file.');
    }

    const columns = SchemaDetectionService.analyzeColumns(rawRows);
    const dateCol = options.dateColumn || columns.find((c) => c.isTimestamp || c.dataType === 'datetime')?.name;
    const equipCol = options.equipmentColumn || columns.find((c) => c.isEquipment)?.name;

    const datasetId = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let validRows = 0;
    let invalidRows = 0;

    const records: DataRecord[] = [];

    rawRows.forEach((row, idx) => {
      // Basic validation
      const hasAnyValue = Object.values(row).some((v) => v !== undefined && v !== null && v !== '');
      if (!hasAnyValue) {
        invalidRows++;
        return;
      }

      validRows++;
      const timestampVal = dateCol && row[dateCol] ? String(row[dateCol]) : undefined;
      const equipVal = equipCol && row[equipCol] ? String(row[equipCol]) : undefined;

      records.push({
        id: `rec_${datasetId}_${idx + 1}`,
        datasetId,
        rowIndex: idx + 1,
        timestamp: timestampVal,
        equipmentId: equipVal,
        data: row,
        createdAt: new Date().toISOString(),
      });
    });

    // GridFS File Persistence (Production Document Size Safety)
    let gridFsFileId: string | undefined = undefined;
    let fileStorageType: 'gridfs' | 'inline' | 'none' = 'none';

    if (isMongoConnected()) {
      try {
        const mimeType = fileType === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : fileType === 'xls'
          ? 'application/vnd.ms-excel'
          : 'text/csv';

        gridFsFileId = await saveFileToGridFS(fileName, buffer, mimeType, {
          datasetId,
          uploadedBy: user.email,
        });
        fileStorageType = 'gridfs';
      } catch (gridFsErr: any) {
        console.warn('[Ingestion] GridFS storage notice (proceeding with document metadata):', gridFsErr?.message || gridFsErr);
      }
    }

    const dataset: Dataset = {
      id: datasetId,
      name: options.name || fileName.replace(/\.[^/.]+$/, ''),
      fileName,
      fileSize: buffer.length,
      fileType,
      category: options.category || 'Thermal Generation Operations',
      uploadedBy: user.name,
      uploadedByEmail: user.email,
      uploadedAt: new Date().toISOString(),
      totalRows: rawRows.length,
      validRows,
      invalidRows,
      dateColumn: dateCol,
      timeColumn: options.timeColumn,
      equipmentColumn: equipCol,
      columns,
      description: options.description,
      status: 'ACTIVE',
      gridFsFileId,
      fileStorageType,
    };

    // Save Dataset & Records with atomic rollback resilience
    try {
      await db.addDataset(dataset);
      try {
        await db.addRecords(records);
      } catch (recErr: any) {
        console.error('[Ingestion] Failed to persist records, rolling back dataset and GridFS file:', recErr);
        if (gridFsFileId) {
          await deleteFileFromGridFS(gridFsFileId).catch(() => {});
        }
        await db.deleteDataset(datasetId).catch(() => {});
        throw new Error(`Failed to persist telemetry records to database: ${recErr.message}`);
      }

      // Dynamic Alarm Evaluation
      let alarmEvents: any[] = [];
      try {
        alarmEvents = AlarmEvaluationService.evaluateDataset(dataset, records);
        if (alarmEvents.length > 0) {
          await db.addAlarmEvents(alarmEvents);
        }
      } catch (alarmErr: any) {
        console.warn('[Ingestion] Alarm evaluation warning:', alarmErr?.message || alarmErr);
      }

      // Dynamic Chart Generation
      let autoCharts: any[] = [];
      try {
        autoCharts = ChartGeneratorService.generateDefaultChartsForDataset(dataset);
        for (const chart of autoCharts) {
          await db.addChartConfig(chart);
        }
      } catch (chartErr: any) {
        console.warn('[Ingestion] Chart generation warning:', chartErr?.message || chartErr);
      }

      // Log Activity
      try {
        await db.addActivityLog({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          action: 'DATASET_INGESTED',
          details: `Successfully uploaded dataset "${dataset.name}" with ${validRows} records and generated ${autoCharts.length} dynamic charts & ${alarmEvents.length} alarms.`,
          entityType: 'DATASET',
          entityId: dataset.id,
        });
      } catch (logErr: any) {
        console.warn('[Ingestion] Activity log notice:', logErr?.message || logErr);
      }

      return {
        dataset,
        totalRecords: records.length,
        validRecords: validRows,
        invalidRecords: invalidRows,
        alarmEventsCount: alarmEvents.length,
        generatedChartsCount: autoCharts.length,
        generatedCharts: autoCharts,
      };
    } catch (fatalErr: any) {
      await db.deleteDataset(datasetId).catch(() => {});
      throw fatalErr;
    }
  }

  public static async replaceDatasetData(
    datasetId: string,
    buffer: Buffer,
    fileName: string,
    fileType: 'csv' | 'xls' | 'xlsx',
    user: { id: string; name: string; email: string }
  ) {
    const dataset = db.getDatasetById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset [ID: ${datasetId}] not found`);
    }

    const rawRows = this.parseFileBuffer(buffer, fileName, fileType);
    if (!rawRows || rawRows.length === 0) {
      throw new Error('No valid records found in file for replacement.');
    }

    const columns = SchemaDetectionService.analyzeColumns(rawRows);
    const dateCol = dataset.dateColumn || columns.find((c) => c.isTimestamp || c.dataType === 'datetime')?.name;
    const equipCol = dataset.equipmentColumn || columns.find((c) => c.isEquipment)?.name;

    const records: DataRecord[] = [];
    rawRows.forEach((row, idx) => {
      const timestampVal = dateCol && row[dateCol] ? String(row[dateCol]) : undefined;
      const equipVal = equipCol && row[equipCol] ? String(row[equipCol]) : undefined;

      records.push({
        id: `rec_${datasetId}_${idx + 1}`,
        datasetId,
        rowIndex: idx + 1,
        timestamp: timestampVal,
        equipmentId: equipVal,
        data: row,
        createdAt: new Date().toISOString(),
      });
    });

    // Clean up old GridFS file and store new replacement in GridFS
    let newGridFsFileId: string | undefined = undefined;
    let fileStorageType: 'gridfs' | 'inline' | 'none' = 'none';

    if (isMongoConnected()) {
      if (dataset.gridFsFileId) {
        await deleteFileFromGridFS(dataset.gridFsFileId).catch(() => {});
      }
      try {
        const mimeType = fileType === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : fileType === 'xls'
          ? 'application/vnd.ms-excel'
          : 'text/csv';

        newGridFsFileId = await saveFileToGridFS(fileName, buffer, mimeType, {
          datasetId,
          uploadedBy: user.email,
        });
        fileStorageType = 'gridfs';
      } catch (gridFsErr: any) {
        console.warn('[Ingestion] GridFS replacement storage notice:', gridFsErr?.message || gridFsErr);
      }
    }

    await db.replaceDatasetRecords(datasetId, records, {
      fileName,
      fileSize: buffer.length,
      fileType,
      columns,
      dateColumn: dateCol,
      equipmentColumn: equipCol,
      gridFsFileId: newGridFsFileId,
      fileStorageType,
    });

    // Re-evaluate alarms
    const updatedDataset = db.getDatasetById(datasetId)!;
    await db.clearAlarmEvents(datasetId);
    const alarmEvents = AlarmEvaluationService.evaluateDataset(updatedDataset, records);
    if (alarmEvents.length > 0) {
      await db.addAlarmEvents(alarmEvents);
    }

    await db.addActivityLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'DATASET_REPLACED',
      details: `Replaced dataset "${dataset.name}" records with ${records.length} new records from ${fileName}.`,
      entityType: 'DATASET',
      entityId: dataset.id,
    });

    return {
      dataset: updatedDataset,
      totalRecords: records.length,
      alarmEventsCount: alarmEvents.length,
    };
  }

  public static async appendDatasetData(
    datasetId: string,
    buffer: Buffer,
    fileName: string,
    fileType: 'csv' | 'xls' | 'xlsx',
    user: { id: string; name: string; email: string },
    duplicateStrategy: 'skip' | 'overwrite' = 'skip'
  ) {
    const dataset = db.getDatasetById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset [ID: ${datasetId}] not found`);
    }

    const rawRows = this.parseFileBuffer(buffer, fileName, fileType);
    if (!rawRows || rawRows.length === 0) {
      throw new Error('No valid records found in file for append.');
    }

    const dateCol = dataset.dateColumn;
    const equipCol = dataset.equipmentColumn;

    const newCandidateRecords: DataRecord[] = rawRows.map((row, idx) => {
      const timestampVal = dateCol && row[dateCol] ? String(row[dateCol]) : undefined;
      const equipVal = equipCol && row[equipCol] ? String(row[equipCol]) : undefined;

      return {
        id: `cand_${idx}`,
        datasetId,
        rowIndex: 0,
        timestamp: timestampVal,
        equipmentId: equipVal,
        data: row,
        createdAt: new Date().toISOString(),
      };
    });

    const appendResult = await db.appendDatasetRecords(datasetId, newCandidateRecords, duplicateStrategy);

    // Re-evaluate alarms on the expanded dataset
    const updatedDataset = db.getDatasetById(datasetId)!;
    const allRecords = db.getRecords(datasetId);
    await db.clearAlarmEvents(datasetId);
    const alarmEvents = AlarmEvaluationService.evaluateDataset(updatedDataset, allRecords);
    if (alarmEvents.length > 0) {
      await db.addAlarmEvents(alarmEvents);
    }

    await db.addActivityLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'DATASET_APPENDED',
      details: `Appended ${appendResult.added} new records to dataset "${dataset.name}" (skipped ${appendResult.duplicatesSkipped} duplicates). Total records: ${appendResult.totalRecords}.`,
      entityType: 'DATASET',
      entityId: dataset.id,
    });

    return {
      dataset: updatedDataset,
      ...appendResult,
      alarmEventsCount: alarmEvents.length,
    };
  }

  // Pre-seed helper for real-style sample dataset if operator clicks "Load Jojobera Verified Sample Telemetry"
  public static async seedSampleDataset(user: { id: string; name: string; email: string }) {
    const sampleRows: Record<string, any>[] = [];
    const baseDate = new Date('2026-08-15T00:00:00.000Z');
    const units = ['Unit-1 (67.5 MW)', 'Unit-2 (120 MW)', 'Unit-3 (120 MW)', 'Unit-4 (120 MW)'];

    // 48 half-hour telemetry intervals across 4 units (192 records) - deterministic mathematical model
    for (let i = 0; i < 48; i++) {
      const time = new Date(baseDate.getTime() + i * 30 * 60 * 1000).toISOString();
      units.forEach((unit, unitIdx) => {
        const isUnit1 = unit.includes('67.5');
        const baseLoad = isUnit1 ? 62.4 : 114.8;
        const tempBase = 28.5 + (unitIdx * 0.8);

        // Deterministic operational cycle oscillations
        const load = Number((baseLoad + (Math.sin((i + unitIdx * 2) / 6) * 3.2) + (Math.cos(i / 4) * 0.8)).toFixed(1));
        const temp = Number((tempBase + (Math.cos((i + unitIdx * 3) / 8) * 4.2) + (Math.sin(i / 5) * 0.6)).toFixed(1));
        const vibration = Number((2.8 + (Math.sin((i + unitIdx) / 4) * 1.3) + (Math.cos(i / 3) * 0.4)).toFixed(2));
        const pressure = Number((148.5 + (Math.cos((i + unitIdx) / 5) * 3.5) + (Math.sin(i / 6) * 0.7)).toFixed(1));
        const nox = Number((165 + (Math.sin((i + unitIdx * 4) / 7) * 22) + (Math.cos(i / 4) * 4)).toFixed(1));
        const status = temp > 32 || vibration > 4.5 ? 'Warning' : 'Normal';

        sampleRows.push({
          Timestamp: time,
          Equipment_ID: unit,
          Power_Output_MW: load,
          Temperature_C: temp,
          Vibration_mm_s: vibration,
          Steam_Pressure_Bar: pressure,
          DE_NOx_Emission_mg_Nm3: nox,
          Status: status,
        });
      });
    }

    const csvContent = Papa.unparse(sampleRows);
    const buffer = Buffer.from(csvContent, 'utf-8');

    return await this.processAndSave(
      buffer,
      'Jojobera_Plant_Operational_Telemetry_Sample.csv',
      'csv',
      {
        name: 'Jojobera Units 1-4 Synchronous Operational Telemetry',
        category: 'Thermal Generation Monitoring',
        dateColumn: 'Timestamp',
        equipmentColumn: 'Equipment_ID',
        description: 'Synchronous telemetry log for Jojobera Units 1-4 covering Power Output, Temperature, Vibration, Steam Pressure, and DE-NOx emissions.',
      },
      user
    );
  }
}
