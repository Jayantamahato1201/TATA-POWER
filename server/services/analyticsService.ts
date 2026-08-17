import { Dataset, DataRecord, SmartInsight, ChartConfig } from '../types/index.js';
import { db } from '../db/database.js';

export class AnalyticsService {
  public static calculateOverview(datasetId?: string) {
    const datasets = db.getDatasets();
    if (datasets.length === 0) {
      return {
        hasData: false,
        totalDatasets: 0,
        totalRecords: 0,
        activeEquipmentCount: 0,
        equipmentList: [],
        activeAlarmsCount: 0,
        criticalAlarmsCount: 0,
        metrics: {},
        latestTimestamp: null,
      };
    }

    const targetDatasets = datasetId ? datasets.filter((d) => d.id === datasetId) : datasets;
    if (targetDatasets.length === 0) {
      return {
        hasData: false,
        totalDatasets: datasets.length,
        totalRecords: 0,
        activeEquipmentCount: 0,
        equipmentList: [],
        activeAlarmsCount: 0,
        criticalAlarmsCount: 0,
        metrics: {},
        latestTimestamp: null,
      };
    }

    const records = db.getRecords(datasetId);
    const alarmEvents = db.getAlarmEvents();

    const equipmentSet = new Set<string>();
    let latestTs: string | null = null;

    for (const r of records) {
      if (r.equipmentId) equipmentSet.add(r.equipmentId);
      if (r.timestamp) {
        if (!latestTs || new Date(r.timestamp) > new Date(latestTs)) {
          latestTs = r.timestamp;
        }
      }
    }

    const activeAlarms = alarmEvents.filter(
      (a) => a.status === 'ACTIVE' && (!datasetId || a.datasetId === datasetId)
    );
    const criticalAlarms = activeAlarms.filter((a) => a.alarmLevel === 'CRITICAL');

    // Extract sensor summary metrics from dataset columns
    const metrics: Record<string, { min?: number; max?: number; avg?: number; unit?: string; count: number }> = {};
    for (const ds of targetDatasets) {
      for (const col of ds.columns) {
        if (col.dataType === 'numeric' && !col.isIdentifier) {
          if (!metrics[col.name]) {
            metrics[col.name] = {
              min: col.min,
              max: col.max,
              avg: col.avg,
              unit: col.unit,
              count: records.length,
            };
          }
        }
      }
    }

    return {
      hasData: records.length > 0,
      totalDatasets: datasets.length,
      currentDataset: targetDatasets[0],
      totalRecords: records.length,
      activeEquipmentCount: equipmentSet.size,
      equipmentList: Array.from(equipmentSet),
      activeAlarmsCount: activeAlarms.length,
      criticalAlarmsCount: criticalAlarms.length,
      metrics,
      latestTimestamp: latestTs,
    };
  }

  public static generateSmartInsights(datasetId?: string): SmartInsight[] {
    const datasets = db.getDatasets();
    if (datasets.length === 0) return [];

    const targetDataset = datasetId ? db.getDatasetById(datasetId) : datasets[0];
    if (!targetDataset) return [];

    const records = db.getRecords(targetDataset.id);
    if (records.length === 0) return [];

    const alarmEvents = db.getAlarmEvents().filter((a) => a.datasetId === targetDataset.id);
    const insights: SmartInsight[] = [];

    // 1. Critical Alarm Insight
    const criticalAlarms = alarmEvents.filter((a) => a.alarmLevel === 'CRITICAL');
    if (criticalAlarms.length > 0) {
      const equipmentCounts: Record<string, number> = {};
      criticalAlarms.forEach((a) => {
        const eq = a.equipmentId || 'General';
        equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
      });

      const topOffender = Object.entries(equipmentCounts).sort((a, b) => b[1] - a[1])[0];

      insights.push({
        id: `ins_crit_${targetDataset.id}`,
        type: 'threshold_breach',
        severity: 'critical',
        title: 'Critical Threshold Violations Detected',
        description: `${criticalAlarms.length} critical alarm event(s) recorded in dataset "${targetDataset.name}". Equipment "${topOffender[0]}" had the highest frequency (${topOffender[1]} events).`,
        equipment: topOffender[0],
        value: criticalAlarms.length,
        calculatedFrom: {
          datasetId: targetDataset.id,
          sampleSize: records.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Temperature Specific Insight
    const tempCol = targetDataset.columns.find((c) => c.name.toLowerCase().includes('temp'));
    if (tempCol && tempCol.max !== undefined && tempCol.avg !== undefined) {
      insights.push({
        id: `ins_temp_${targetDataset.id}`,
        type: 'peak',
        severity: tempCol.max > (tempCol.avg * 1.25) ? 'warning' : 'info',
        title: 'Thermal Dynamic Range Analysis',
        description: `Peak observed temperature reached ${tempCol.max}${tempCol.unit || '°C'} against an operational average of ${tempCol.avg}${tempCol.unit || '°C'} across ${records.length} time points.`,
        metric: tempCol.name,
        value: tempCol.max,
        calculatedFrom: {
          datasetId: targetDataset.id,
          sampleSize: records.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 3. Equipment Load / Vibration Variance
    const equipCol = targetDataset.columns.find((c) => c.isEquipment);
    const numericCol = targetDataset.columns.find((c) => c.dataType === 'numeric' && !c.isIdentifier && !c.name.toLowerCase().includes('temp'));

    if (equipCol && numericCol) {
      const equipAverages: Record<string, { sum: number; count: number }> = {};
      records.forEach((r) => {
        const eq = String(r.data[equipCol.name] || 'Unit');
        const val = Number(r.data[numericCol.name]);
        if (!isNaN(val)) {
          if (!equipAverages[eq]) equipAverages[eq] = { sum: 0, count: 0 };
          equipAverages[eq].sum += val;
          equipAverages[eq].count += 1;
        }
      });

      const equipCalculated = Object.entries(equipAverages)
        .map(([eq, data]) => ({ equipment: eq, avg: Number((data.sum / data.count).toFixed(2)) }))
        .sort((a, b) => b.avg - a.avg);

      if (equipCalculated.length >= 2) {
        const top = equipCalculated[0];
        const lowest = equipCalculated[equipCalculated.length - 1];
        insights.push({
          id: `ins_equip_${targetDataset.id}`,
          type: 'equipment_performance',
          severity: 'info',
          title: `Equipment Performance Variance: ${numericCol.displayName}`,
          description: `Highest average ${numericCol.displayName} observed on ${top.equipment} (${top.avg} ${numericCol.unit || ''}), compared to lowest on ${lowest.equipment} (${lowest.avg} ${numericCol.unit || ''}).`,
          equipment: top.equipment,
          value: top.avg,
          calculatedFrom: {
            datasetId: targetDataset.id,
            sampleSize: records.length,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return insights;
  }

  public static getChartData(config: ChartConfig, filters?: { equipment?: string; startDate?: string; endDate?: string }) {
    const dataset = db.getDatasetById(config.datasetId);
    if (!dataset) return { categories: [], series: [], rawRows: [] };

    let records = db.getRecords(config.datasetId);

    // Apply equipment filter
    if (filters?.equipment && filters.equipment !== 'ALL') {
      records = records.filter(
        (r) =>
          r.equipmentId === filters.equipment ||
          String(r.data[dataset.equipmentColumn || '']) === filters.equipment
      );
    }

    // Apply date filter
    if (filters?.startDate && config.xAxisColumn) {
      records = records.filter((r) => {
        const ts = r.timestamp || r.data[config.xAxisColumn];
        return ts && new Date(ts) >= new Date(filters.startDate!);
      });
    }

    if (filters?.endDate && config.xAxisColumn) {
      records = records.filter((r) => {
        const ts = r.timestamp || r.data[config.xAxisColumn];
        return ts && new Date(ts) <= new Date(filters.endDate!);
      });
    }

    // Sort by x-axis if timestamp
    const xColMeta = dataset.columns.find((c) => c.name === config.xAxisColumn);
    if (xColMeta?.isTimestamp || xColMeta?.dataType === 'datetime') {
      records.sort((a, b) => {
        const ta = new Date(a.timestamp || a.data[config.xAxisColumn] || 0).getTime();
        const tb = new Date(b.timestamp || b.data[config.xAxisColumn] || 0).getTime();
        return ta - tb;
      });
    }

    // Handle Aggregation or Standard Sequence
    if (config.aggregation === 'count' || config.chartType === 'donut') {
      const counts: Record<string, number> = {};
      records.forEach((r) => {
        const key = String(r.data[config.xAxisColumn] || 'Unknown');
        counts[key] = (counts[key] || 0) + 1;
      });

      const donutData = Object.entries(counts).map(([name, value]) => ({ name, value }));
      return {
        categories: Object.keys(counts),
        series: [{ name: config.title, data: donutData }],
        rawRows: records.map((r) => r.data),
      };
    }

    if (config.aggregation && config.aggregation !== 'none') {
      const grouped: Record<string, Record<string, number[]>> = {};

      records.forEach((r) => {
        const xKey = String(r.data[config.xAxisColumn] || 'Unknown');
        if (!grouped[xKey]) grouped[xKey] = {};

        for (const yCol of config.yAxisColumns) {
          if (!grouped[xKey][yCol]) grouped[xKey][yCol] = [];
          const val = Number(r.data[yCol]);
          if (!isNaN(val)) grouped[xKey][yCol].push(val);
        }
      });

      const categories = Object.keys(grouped);
      const series = config.yAxisColumns.map((yCol) => {
        const data = categories.map((cat) => {
          const vals = grouped[cat][yCol] || [];
          if (vals.length === 0) return 0;
          if (config.aggregation === 'avg') return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
          if (config.aggregation === 'sum') return Number(vals.reduce((a, b) => a + b, 0).toFixed(2));
          if (config.aggregation === 'min') return Math.min(...vals);
          if (config.aggregation === 'max') return Math.max(...vals);
          return vals.length;
        });
        return {
          name: yCol,
          data,
        };
      });

      return { categories, series, rawRows: records.map((r) => r.data) };
    }

    // Direct Time-Series / Sequence
    const categories = records.map((r) => String(r.data[config.xAxisColumn] || r.rowIndex));
    const series = config.yAxisColumns.map((yCol) => {
      const data = records.map((r) => {
        const v = Number(r.data[yCol]);
        return isNaN(v) ? null : v;
      });
      return {
        name: yCol,
        data,
      };
    });

    return {
      categories,
      series,
      rawRows: records.map((r) => r.data),
    };
  }
}
