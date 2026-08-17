import Papa from 'papaparse';
import { db } from '../db/database.js';
import { AnalyticsService } from './analyticsService.js';
import { Temperature3DService } from './temperature3DService.js';

export class ExportService {
  public static exportDatasetToCSV(datasetId: string, filters?: { equipment?: string; startDate?: string; endDate?: string }): string {
    const dataset = db.getDatasetById(datasetId);
    if (!dataset) {
      throw new Error('Dataset not found');
    }

    let records = db.getRecords(datasetId);

    if (filters?.equipment && filters.equipment !== 'ALL') {
      records = records.filter(
        (r) =>
          r.equipmentId === filters.equipment ||
          String(r.data[dataset.equipmentColumn || '']) === filters.equipment
      );
    }

    if (filters?.startDate && dataset.dateColumn) {
      records = records.filter((r) => {
        const ts = r.timestamp || r.data[dataset.dateColumn!];
        return ts && new Date(ts) >= new Date(filters.startDate!);
      });
    }

    if (filters?.endDate && dataset.dateColumn) {
      records = records.filter((r) => {
        const ts = r.timestamp || r.data[dataset.dateColumn!];
        return ts && new Date(ts) <= new Date(filters.endDate!);
      });
    }

    const rows = records.map((r) => r.data);
    return Papa.unparse(rows);
  }

  public static exportChartDataToCSV(
    chartId: string,
    filters?: { equipment?: string; startDate?: string; endDate?: string }
  ): { csv: string; chartTitle: string } {
    const chart = db.getChartConfigById(chartId);
    if (!chart) {
      throw new Error('Chart configuration not found');
    }

    const data = AnalyticsService.getChartData(chart, filters);
    const csv = Papa.unparse(data.rawRows);
    return {
      csv,
      chartTitle: chart.title,
    };
  }

  public static exportAlarmsToCSV(status?: string): string {
    const alarms = db.getAlarmEvents(status);
    const flattened = alarms.map((a) => ({
      'Alarm ID': a.id,
      'Rule Name': a.ruleName,
      'Dataset': a.datasetName,
      'Equipment': a.equipmentId || 'General',
      'Metric Column': a.metricColumn,
      'Actual Value': a.actualValue,
      'Threshold': a.thresholdValue,
      'Severity': a.alarmLevel,
      'Status': a.status,
      'Timestamp': a.timestamp,
      'Acknowledged By': a.acknowledgedBy || 'N/A',
      'Resolved By': a.resolvedBy || 'N/A',
      'Resolution Notes': a.resolutionNotes || 'N/A',
      'Message': a.message,
    }));

    return Papa.unparse(flattened);
  }

  public static exportTemperature3DToCSV(
    datasetId?: string,
    filters?: { equipment?: string; status?: string; startDate?: string; endDate?: string }
  ): string {
    const analytics = Temperature3DService.calculate3DAnalytics(datasetId, filters);
    const rows = analytics.points.map((pt) => ({
      'Record #': pt.rowIndex + 1,
      'Timestamp / Sequence': pt.timestamp,
      'Equipment Unit': pt.equipment,
      [`Recorded Temperature (${analytics.unit})`]: pt.temperature,
      'Temperature Status': pt.statusLabel,
      'Status Category': pt.status,
      'Above Threshold': `> ${analytics.config.aboveThreshold}${analytics.unit}`,
      'Normal Range': `[${analytics.config.normalMin} - ${analytics.config.normalMax}${analytics.unit}]`,
      'Below Threshold': `< ${analytics.config.belowThreshold}${analytics.unit}`,
      ...pt.data,
    }));

    return Papa.unparse(rows);
  }
}
