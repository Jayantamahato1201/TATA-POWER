import { ColumnMetadata } from '../types/index.js';
import { extractUnitAndName } from '../utils/unitDetector.js';
import { ReportParser } from '../utils/reportParser.js';

export class SchemaDetectionService {
  public static analyzeColumns(rows: Record<string, any>[]): ColumnMetadata[] {
    if (!rows || rows.length === 0) return [];

    const columnNames = Object.keys(rows[0]);
    const metadataList: ColumnMetadata[] = [];

    // 1. First analyze top-level physical columns in the dataset
    for (const col of columnNames) {
      const values = rows.map((r) => r[col]).filter((v) => v !== undefined && v !== null && v !== '');
      const totalSampleCount = values.length;

      let numericCount = 0;
      let dateCount = 0;
      let booleanCount = 0;
      let minVal: number | undefined = undefined;
      let maxVal: number | undefined = undefined;
      let sumVal = 0;

      const distinctSet = new Set<string>();

      for (const val of values) {
        const strVal = String(val).trim();
        distinctSet.add(strVal);

        // Check boolean
        if (['true', 'false', '0', '1', 'yes', 'no'].includes(strVal.toLowerCase())) {
          booleanCount++;
        }

        // Check numeric (including clean string numbers)
        const extracted = ReportParser.extractNumericAndUnit(val);
        if (extracted.numericValue !== undefined && !isNaN(extracted.numericValue) && typeof val !== 'boolean') {
          numericCount++;
          const num = extracted.numericValue;
          if (minVal === undefined || num < minVal) minVal = num;
          if (maxVal === undefined || num > maxVal) maxVal = num;
          sumVal += num;
        }

        // Check date
        if (extracted.numericValue === undefined) {
          const parsedDate = Date.parse(strVal);
          if (!isNaN(parsedDate) && strVal.length > 5) {
            dateCount++;
          }
        }
      }

      const lowerCol = col.toLowerCase();
      let dataType: ColumnMetadata['dataType'] = 'string';

      if (totalSampleCount > 0 && numericCount / totalSampleCount > 0.75) {
        dataType = 'numeric';
      } else if (totalSampleCount > 0 && (dateCount / totalSampleCount > 0.75 || lowerCol.includes('date') || lowerCol.includes('time') || lowerCol.includes('timestamp'))) {
        dataType = 'datetime';
      } else if (totalSampleCount > 0 && booleanCount / totalSampleCount > 0.9 && distinctSet.size <= 2) {
        dataType = 'boolean';
      } else if (distinctSet.size <= Math.min(20, totalSampleCount * 0.2)) {
        dataType = 'category';
      }

      // Unit & Display Name detection using accurate header analysis
      const extracted = extractUnitAndName(col);
      const unit = extracted.unit;
      const displayName = extracted.cleanName;

      // Semantic role detection
      const isTimestamp =
        dataType === 'datetime' ||
        lowerCol.includes('time') ||
        lowerCol.includes('date') ||
        lowerCol.includes('timestamp') ||
        lowerCol === 'ts';

      const isEquipment =
        lowerCol.includes('equip') ||
        lowerCol.includes('gen') ||
        lowerCol.includes('unit') ||
        lowerCol.includes('machine') ||
        lowerCol.includes('asset') ||
        lowerCol.includes('tag');

      const isSensor =
        dataType === 'numeric' &&
        !lowerCol.includes('id') &&
        !lowerCol.includes('index') &&
        !lowerCol.includes('row');

      const isIdentifier =
        lowerCol.includes('id') ||
        lowerCol === 'id' ||
        (distinctSet.size === totalSampleCount && dataType !== 'datetime');

      const sampleValues = Array.from(distinctSet).slice(0, 5);

      metadataList.push({
        name: col,
        displayName: displayName || this.formatDisplayName(col),
        dataType,
        unit,
        min: minVal,
        max: maxVal,
        avg: numericCount > 0 ? Number((sumVal / numericCount).toFixed(2)) : undefined,
        distinctCount: distinctSet.size,
        sampleValues,
        isIdentifier,
        isTimestamp,
        isEquipment,
        isSensor,
      });
    }

    // 2. SMART DETECTION FOR NORMALIZED REPORT FORMATS (Section | Field | Value)
    // If the dataset contains Section, Field, Value, extract all discrete numeric channels from rows
    const isReport = ReportParser.isReportFormat(rows) || ReportParser.isReportFormat(metadataList);
    if (isReport) {
      const parsedReport = ReportParser.parseConsolidatedReport(rows);
      const existingNames = new Set(metadataList.map((m) => m.name.toLowerCase()));

      // 2A. Extract KPI rows with numeric values (e.g. total_power_kw: 791.7, avg_fuel_pct: 62.1, units_online: 3, units_total: 3)
      for (const kpi of parsedReport.kpis) {
        if (kpi.numericValue !== undefined && !isNaN(kpi.numericValue)) {
          const fieldKey = kpi.field;
          const lowerKey = fieldKey.toLowerCase();
          if (!existingNames.has(lowerKey)) {
            existingNames.add(lowerKey);
            metadataList.push({
              name: fieldKey,
              displayName: kpi.displayName || this.formatDisplayName(fieldKey),
              dataType: 'numeric',
              unit: kpi.unit || '',
              min: kpi.numericValue,
              max: kpi.numericValue,
              avg: kpi.numericValue,
              distinctCount: 1,
              sampleValues: [String(kpi.numericValue)],
              isIdentifier: false,
              isTimestamp: false,
              isEquipment: false,
              isSensor: true,
            });
          }
        }
      }

      // 2B. Extract numeric channels from Alarm Metric Groups
      for (const [groupKey, group] of Object.entries(parsedReport.alarmMetricGroups)) {
        const numRecords = group.records.filter((r) => r.numericValue !== undefined);
        if (numRecords.length > 0) {
          const vals = numRecords.map((r) => r.numericValue!);
          const minVal = Math.min(...vals);
          const maxVal = Math.max(...vals);
          const avgVal = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
          const safeName = group.alarmName;
          const lowerSafe = safeName.toLowerCase();

          if (!existingNames.has(lowerSafe)) {
            existingNames.add(lowerSafe);
            metadataList.push({
              name: safeName,
              displayName: group.displayName || this.formatDisplayName(safeName),
              dataType: 'numeric',
              unit: group.unit || '',
              min: minVal,
              max: maxVal,
              avg: avgVal,
              distinctCount: vals.length,
              sampleValues: vals.slice(0, 5).map(String),
              isIdentifier: false,
              isTimestamp: false,
              isEquipment: false,
              isSensor: true,
            });
          }
        }
      }

      // 2C. Extract numeric channels from Anomaly Metric Groups
      for (const [groupKey, group] of Object.entries(parsedReport.anomalyMetricGroups)) {
        const numRecords = group.records.filter((r) => r.numericValue !== undefined);
        if (numRecords.length > 0) {
          const vals = numRecords.map((r) => r.numericValue!);
          const minVal = Math.min(...vals);
          const maxVal = Math.max(...vals);
          const avgVal = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
          const safeName = group.metricName;
          const lowerSafe = safeName.toLowerCase();

          if (!existingNames.has(lowerSafe)) {
            existingNames.add(lowerSafe);
            metadataList.push({
              name: safeName,
              displayName: group.displayName || this.formatDisplayName(safeName),
              dataType: 'numeric',
              unit: group.unit || '',
              min: minVal,
              max: maxVal,
              avg: avgVal,
              distinctCount: vals.length,
              sampleValues: vals.slice(0, 5).map(String),
              isIdentifier: false,
              isTimestamp: false,
              isEquipment: false,
              isSensor: true,
            });
          }
        }
      }

      // 2D. Extract Maintenance summary metrics if present
      if (parsedReport.maintenance.length > 0) {
        const costRecords = parsedReport.maintenance.filter((m) => m.costInr !== undefined);
        if (costRecords.length > 0 && !existingNames.has('maintenance_cost_inr')) {
          existingNames.add('maintenance_cost_inr');
          const costVals = costRecords.map((m) => m.costInr!);
          metadataList.push({
            name: 'maintenance_cost_inr',
            displayName: 'Maintenance Cost',
            dataType: 'numeric',
            unit: 'INR',
            min: Math.min(...costVals),
            max: Math.max(...costVals),
            avg: Number((costVals.reduce((a, b) => a + b, 0) / costVals.length).toFixed(2)),
            distinctCount: costVals.length,
            sampleValues: costVals.slice(0, 5).map(String),
            isIdentifier: false,
            isTimestamp: false,
            isEquipment: false,
            isSensor: true,
          });
        }
      }
    }

    return metadataList;
  }

  private static formatDisplayName(col: string): string {
    return col
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
