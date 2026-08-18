import { Dataset, ChartConfig } from '../types/index.js';
import { db } from '../db/database.js';
import { MetricAnalyticsService } from './metricAnalyticsService.js';
import { ReportParser } from '../utils/reportParser.js';

export class ChartGeneratorService {
  /**
   * Generates ONE SEPARATE VISUALIZATION per detected metric in the dataset.
   * STRICT CORE RULE: Never mix different metrics or units in the same chart.
   * NEVER generate fake or arbitrary data.
   */
  public static generateDefaultChartsForDataset(dataset: Dataset): ChartConfig[] {
    const charts: ChartConfig[] = [];
    const allRecords = db.getRecords(dataset.id);
    const dateCol = dataset.columns.find((c) => c.isTimestamp || c.dataType === 'datetime');
    const equipmentCol = dataset.columns.find(
      (c) =>
        c.isEquipment ||
        ['equipment', 'equipment_id', 'generator_id', 'unit', 'unit_id'].includes(c.name.toLowerCase())
    );
    const rules = db.getAlarmRules().filter((r) => r.isEnabled);

    // 1. Check if dataset is a Section | Field | Value Consolidated Report
    const isReportFormat =
      ReportParser.isReportFormat(allRecords.map((r) => r.data)) ||
      ReportParser.isReportFormat(dataset.columns);

    if (isReportFormat) {
      const report = ReportParser.parseConsolidatedReport(allRecords);

      // 1A.0 Generate KPI Overview Chart if report has numeric KPIs
      const numericKpis = report.kpis.filter((k) => k.numericValue !== undefined);
      if (numericKpis.length > 0) {
        charts.push({
          id: `chart_${dataset.id}_kpi_overview_bar`,
          title: 'Key Performance Indicators (KPI Summary)',
          chartType: 'bar',
          datasetId: dataset.id,
          xAxisColumn: 'Field',
          yAxisColumns: ['Value'],
          aggregation: 'none',
          unit: 'Value',
          colorPalette: ['#38BDF8', '#00FF41', '#F59E0B', '#A855F7'],
          showLegend: true,
          showGrid: true,
          showToolbox: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // 1A. Generate charts for Alarm Metric Groups with MULTIPLE records
      Object.values(report.alarmMetricGroups).forEach((group) => {
        const numRecords = group.records.filter((r) => r.numericValue !== undefined);
        if (numRecords.length > 1) {
          const classification = MetricAnalyticsService.classifyMetric(
            group.alarmName,
            group.unit,
            numRecords.map((r) => r.numericValue!)
          );
          const safeKey = group.alarmName.toLowerCase().replace(/[^a-z0-9]/g, '_');

          charts.push({
            id: `chart_${dataset.id}_alarm_${safeKey}_timeseries`,
            title: `${group.alarmName} (${group.unit || classification.unit || 'Units'}) Alarm Trend`,
            chartType: 'line',
            datasetId: dataset.id,
            xAxisColumn: 'Timestamp',
            yAxisColumns: ['Value'],
            aggregation: 'none',
            unit: group.unit || classification.unit,
            colorPalette: [classification.colorScheme.primary, classification.colorScheme.secondary || classification.colorScheme.primary],
            showLegend: true,
            showGrid: true,
            showToolbox: true,
            showDataZoom: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      });

      // 1B. Generate Maintenance Cost Bar Chart if multiple maintenance records exist
      if (report.maintenance.length > 0) {
        const hasCosts = report.maintenance.some((m) => m.costInr !== undefined && m.costInr > 0);
        if (hasCosts) {
          charts.push({
            id: `chart_${dataset.id}_maintenance_cost_bar`,
            title: 'Maintenance Cost Distribution by Equipment (INR)',
            chartType: 'bar',
            datasetId: dataset.id,
            xAxisColumn: 'Equipment',
            yAxisColumns: ['Cost'],
            aggregation: 'sum',
            unit: 'INR',
            colorPalette: ['#F59E0B', '#D97706', '#B45309'],
            showLegend: true,
            showGrid: true,
            showToolbox: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return charts;
    }

    // 2. Standard Multi-Column Telemetry Table
    // Exclude timestamp/date columns and identifier/equipment columns from numeric metric list
    const numericCols = dataset.columns.filter((c) => {
      const lower = c.name.toLowerCase();
      if (c.isTimestamp || c.dataType === 'datetime' || c.isIdentifier || c.isEquipment) return false;
      if (['timestamp', 'date', 'time', 'generator_id', 'equipment_id', 'unit', 'id'].includes(lower)) return false;
      return c.dataType === 'numeric';
    });

    // 2A. ONE DEDICATED GRAPH PER NUMERIC METRIC
    for (const col of numericCols) {
      const classification = MetricAnalyticsService.classifyMetric(col.name, col.unit);

      // Match alarm rules for this specific metric
      const matchingRules = rules.filter(
        (r) =>
          r.metricColumn.toLowerCase() === col.name.toLowerCase() ||
          col.name.toLowerCase().includes(r.metricColumn.toLowerCase())
      );

      const thresholdLines = matchingRules.map((r) => ({
        value: r.thresholdValue,
        label: `${r.name} (${r.thresholdValue} ${col.unit || classification.unit || ''})`,
        color: r.customColor,
      }));

      // Time-series Trend Graph for this single metric
      if (dateCol) {
        charts.push({
          id: `chart_${dataset.id}_${col.name}_timeseries`,
          title: `${classification.displayName} (${classification.unit || 'Units'}) Time Series`,
          chartType: classification.category === 'temperature' ? 'area' : 'line',
          datasetId: dataset.id,
          xAxisColumn: dateCol.name,
          yAxisColumns: [col.name],
          aggregation: 'none',
          unit: col.unit || classification.unit,
          colorPalette: [classification.colorScheme.primary, classification.colorScheme.secondary || classification.colorScheme.primary],
          showLegend: true,
          showGrid: true,
          showToolbox: true,
          showDataZoom: true,
          thresholdLines,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // If equipment column exists, generate Equipment Performance Comparison for THIS SINGLE METRIC
      if (equipmentCol) {
        charts.push({
          id: `chart_${dataset.id}_${col.name}_equipment_bar`,
          title: `${classification.displayName} (${classification.unit || 'Units'}) by Generator / Equipment`,
          chartType: 'bar',
          datasetId: dataset.id,
          xAxisColumn: equipmentCol.name,
          yAxisColumns: [col.name],
          aggregation: 'avg',
          unit: col.unit || classification.unit,
          colorPalette: [classification.colorScheme.primary, classification.colorScheme.secondary || classification.colorScheme.primary],
          showLegend: true,
          showGrid: true,
          showToolbox: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 2B. Status / Operational State Distribution (if category column exists)
    const statusCol = dataset.columns.find(
      (c) =>
        ['status', 'state', 'severity', 'alarm', 'mode'].includes(c.name.toLowerCase()) &&
        !c.isTimestamp &&
        !c.isEquipment
    );
    if (statusCol) {
      charts.push({
        id: `chart_${dataset.id}_status_donut`,
        title: `${statusCol.displayName || statusCol.name} Distribution`,
        chartType: 'donut',
        datasetId: dataset.id,
        xAxisColumn: statusCol.name,
        yAxisColumns: [statusCol.name],
        aggregation: 'count',
        colorPalette: ['#10B981', '#38BDF8', '#F59E0B', '#EF4444', '#8B5CF6'],
        showLegend: true,
        showToolbox: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return charts;
  }
}
