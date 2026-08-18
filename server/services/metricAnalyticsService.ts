import { db } from '../db/database.js';
import {
  Dataset,
  DataRecord,
  MetricDefinition,
  MetricCategory,
  MetricAnalyticsPayload,
  Metric3DDataPoint,
  AlarmAnalyticsPayload,
  DatasetMetricsOverview,
  AlarmLevel,
} from '../types/index.js';
import { extractUnitAndName, classifyCategory, normalizeUnit } from '../utils/unitDetector.js';
import { ReportParser, ParsedReportData } from '../utils/reportParser.js';

export class MetricAnalyticsService {
  /**
   * Intelligently classify a column/field name into a semantic metric category and extracted unit
   * Never invents fake/default/sample units - extracts only actual unit from dataset headers/metadata
   */
  public static classifyMetric(key: string, detectedUnit?: string, sampleValues: number[] = []): {
    category: MetricCategory;
    displayName: string;
    unit: string;
    colorScheme: MetricDefinition['colorScheme'];
    defaultThresholds: MetricDefinition['thresholds'];
  } {
    const extracted = extractUnitAndName(key, detectedUnit);
    const unit = extracted.unit || '';
    const category = extracted.category;
    const displayName = extracted.cleanName || key;

    const minVal = sampleValues.length > 0 ? Math.min(...sampleValues) : 0;
    const maxVal = sampleValues.length > 0 ? Math.max(...sampleValues) : 100;

    // Palette & Thresholds by semantic category
    switch (category) {
      case 'temperature':
        return {
          category: 'temperature',
          displayName,
          unit,
          colorScheme: {
            primary: '#EF4444',
            secondary: '#F97316',
            gradient: ['#06B6D4', '#00FF41', '#F59E0B', '#EF4444'],
            accent: '#00FF41',
          },
          defaultThresholds: {
            low: Math.max(0, Math.floor(minVal <= 20 ? 20 : minVal * 0.85)),
            normalMin: Math.max(0, Math.floor(minVal <= 20 ? 20 : minVal * 0.85)),
            normalMax: Math.ceil(maxVal >= 35 ? 35 : maxVal * 1.15),
            high: Math.ceil(maxVal >= 35 ? 35 : maxVal * 1.15),
            warningLimit: Math.ceil((maxVal >= 35 ? 35 : maxVal * 1.15) * 1.1),
            criticalLimit: Math.ceil((maxVal >= 35 ? 35 : maxVal * 1.15) * 1.25),
            lowLabel: 'BELOW TEMPERATURE',
            normalLabel: 'NORMAL TEMPERATURE',
            highLabel: 'ABOVE TEMPERATURE',
            warningLabel: 'TEMPERATURE WARNING',
            criticalLabel: 'CRITICAL HIGH TEMPERATURE',
            lowColor: '#06B6D4',
            normalColor: '#00FF41',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'voltage':
        const isKV = unit.toLowerCase() === 'kv';
        const defaultVLow = isKV ? (minVal > 0 ? Number((minVal * 0.9).toFixed(2)) : 10.2) : (minVal > 0 ? Math.floor(minVal * 0.9) : 380);
        const defaultVHigh = isKV ? (maxVal > 0 ? Number((maxVal * 1.1).toFixed(2)) : 11.8) : (maxVal > 0 ? Math.ceil(maxVal * 1.1) : 440);
        return {
          category: 'voltage',
          displayName,
          unit,
          colorScheme: {
            primary: '#38BDF8',
            secondary: '#0284C7',
            gradient: ['#0369A1', '#38BDF8', '#7DD3FC', '#E0F2FE'],
            accent: '#38BDF8',
          },
          defaultThresholds: {
            low: defaultVLow,
            normalMin: defaultVLow,
            normalMax: defaultVHigh,
            high: defaultVHigh,
            warningLimit: isKV ? Number((defaultVHigh * 1.05).toFixed(2)) : Math.ceil(defaultVHigh * 1.05),
            criticalLimit: isKV ? Number((defaultVHigh * 1.1).toFixed(2)) : Math.ceil(defaultVHigh * 1.1),
            lowLabel: 'UNDER VOLTAGE',
            normalLabel: 'NOMINAL VOLTAGE',
            highLabel: 'OVER VOLTAGE',
            warningLabel: 'VOLTAGE DEVIATION WARNING',
            criticalLabel: 'CRITICAL OVERVOLTAGE TRIP',
            lowColor: '#F59E0B',
            normalColor: '#38BDF8',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'power':
        const defaultPLow = minVal > 0 ? Math.floor(minVal * 0.8) : 20;
        const defaultPHigh = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 130;
        return {
          category: 'power',
          displayName,
          unit,
          colorScheme: {
            primary: '#F59E0B',
            secondary: '#D97706',
            gradient: ['#78350F', '#D97706', '#F59E0B', '#FDE68A'],
            accent: '#F59E0B',
          },
          defaultThresholds: {
            low: defaultPLow,
            normalMin: defaultPLow,
            normalMax: defaultPHigh,
            high: defaultPHigh,
            warningLimit: Math.ceil(defaultPHigh * 1.05),
            criticalLimit: Math.ceil(defaultPHigh * 1.15),
            lowLabel: 'LOW GENERATION / RESERVE',
            normalLabel: 'ACTIVE BASELOAD POWER',
            highLabel: 'OVERLOAD CAPACITY BREACH',
            warningLabel: 'HIGH LOAD ADVISORY',
            criticalLabel: 'MAXIMUM CAPACITY OVERLOAD',
            lowColor: '#6B7280',
            normalColor: '#F59E0B',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'frequency':
        return {
          category: 'frequency',
          displayName,
          unit,
          colorScheme: {
            primary: '#10B981',
            secondary: '#059669',
            gradient: ['#064E3B', '#059669', '#10B981', '#6EE7B7'],
            accent: '#10B981',
          },
          defaultThresholds: {
            low: minVal > 40 ? Number((minVal <= 49.5 ? minVal : 49.5).toFixed(2)) : 49.5,
            normalMin: minVal > 40 ? Number((minVal <= 49.8 ? minVal : 49.8).toFixed(2)) : 49.8,
            normalMax: maxVal > 40 ? Number((maxVal >= 50.2 ? maxVal : 50.2).toFixed(2)) : 50.2,
            high: maxVal > 40 ? Number((maxVal >= 50.5 ? maxVal : 50.5).toFixed(2)) : 50.5,
            warningLimit: 50.4,
            criticalLimit: 50.6,
            lowLabel: 'UNDER FREQUENCY DEVIATION',
            normalLabel: 'GRID SYNCHRONIZED FREQUENCY',
            highLabel: 'OVER FREQUENCY TRIP RISK',
            warningLabel: 'FREQUENCY IMBALANCE',
            criticalLabel: 'CRITICAL FREQUENCY BREACH',
            lowColor: '#F59E0B',
            normalColor: '#10B981',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'current':
        const defaultCLow = minVal > 0 ? Math.floor(minVal * 0.8) : 50;
        const defaultCHigh = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 480;
        return {
          category: 'current',
          displayName,
          unit,
          colorScheme: {
            primary: '#F43F5E',
            secondary: '#E11D48',
            gradient: ['#881337', '#BE123C', '#F43F5E', '#FECDD3'],
            accent: '#F43F5E',
          },
          defaultThresholds: {
            low: defaultCLow,
            normalMin: defaultCLow,
            normalMax: defaultCHigh,
            high: defaultCHigh,
            warningLimit: Math.ceil(defaultCHigh * 1.05),
            criticalLimit: Math.ceil(defaultCHigh * 1.15),
            lowLabel: 'LOW LOAD CURRENT',
            normalLabel: 'RATED CURRENT',
            highLabel: 'OVERCURRENT TRIP WARNING',
            warningLabel: 'OVERCURRENT ADVISORY',
            criticalLabel: 'CRITICAL OVERCURRENT TRIP',
            lowColor: '#6B7280',
            normalColor: '#F43F5E',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'pressure':
        const defaultPressLow = minVal > 0 ? Math.floor(minVal * 0.8) : 100;
        const defaultPressHigh = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 165;
        return {
          category: 'pressure',
          displayName,
          unit,
          colorScheme: {
            primary: '#06B6D4',
            secondary: '#0891B2',
            gradient: ['#164E63', '#0891B2', '#06B6D4', '#CFFAFE'],
            accent: '#06B6D4',
          },
          defaultThresholds: {
            low: defaultPressLow,
            normalMin: defaultPressLow,
            normalMax: defaultPressHigh,
            high: defaultPressHigh,
            warningLimit: Math.ceil(defaultPressHigh * 1.05),
            criticalLimit: Math.ceil(defaultPressHigh * 1.15),
            lowLabel: 'LOW OPERATING PRESSURE',
            normalLabel: 'NOMINAL OPERATING PRESSURE',
            highLabel: 'OVERPRESSURE SAFETY RISK',
            warningLabel: 'HIGH PRESSURE WARNING',
            criticalLabel: 'CRITICAL OVERPRESSURE TRIP',
            lowColor: '#F59E0B',
            normalColor: '#06B6D4',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'fuel':
        return {
          category: 'fuel',
          displayName,
          unit,
          colorScheme: {
            primary: '#A855F7',
            secondary: '#9333EA',
            gradient: ['#581C87', '#7E22CE', '#A855F7', '#E9D5FF'],
            accent: '#A855F7',
          },
          defaultThresholds: {
            low: 25,
            normalMin: 25,
            normalMax: 100,
            high: 98,
            warningLimit: 20,
            criticalLimit: 10,
            lowLabel: 'LOW FUEL ADVISORY',
            normalLabel: 'SUFFICIENT FUEL RESERVE',
            highLabel: 'TANK AT FULL CAPACITY',
            warningLabel: 'LOW FUEL WARNING',
            criticalLabel: 'CRITICAL FUEL DEPLETION',
            lowColor: '#EF4444',
            normalColor: '#A855F7',
            highColor: '#10B981',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'WARNING',
          },
        };

      case 'rpm':
        const defaultRpmLow = minVal > 500 ? Math.floor(minVal * 0.95) : 2800;
        const defaultRpmHigh = maxVal > 500 ? Math.ceil(maxVal * 1.05) : 3150;
        return {
          category: 'rpm',
          displayName,
          unit,
          colorScheme: {
            primary: '#EAB308',
            secondary: '#CA8A04',
            gradient: ['#713F12', '#CA8A04', '#EAB308', '#FEF08A'],
            accent: '#EAB308',
          },
          defaultThresholds: {
            low: defaultRpmLow,
            normalMin: defaultRpmLow,
            normalMax: defaultRpmHigh,
            high: defaultRpmHigh,
            warningLimit: Math.ceil(defaultRpmHigh * 1.02),
            criticalLimit: Math.ceil(defaultRpmHigh * 1.05),
            lowLabel: 'SUB-SYNCHRONOUS SPEED',
            normalLabel: 'SYNCHRONOUS SPEED',
            highLabel: 'OVERSPEED TRIP CONDITION',
            warningLabel: 'SPEED VARIATION WARNING',
            criticalLabel: 'CRITICAL OVERSPEED TRIP',
            lowColor: '#F59E0B',
            normalColor: '#EAB308',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'vibration':
        const defaultVibHigh = maxVal > 0 ? Number((maxVal * 1.1).toFixed(2)) : 4.5;
        return {
          category: 'vibration',
          displayName,
          unit,
          colorScheme: {
            primary: '#FB923C',
            secondary: '#EA580C',
            gradient: ['#7C2D12', '#C2410C', '#FB923C', '#FFEDD5'],
            accent: '#FB923C',
          },
          defaultThresholds: {
            low: 0,
            normalMin: 0,
            normalMax: Number((defaultVibHigh * 0.8).toFixed(2)),
            high: defaultVibHigh,
            warningLimit: Number((defaultVibHigh * 0.85).toFixed(2)),
            criticalLimit: defaultVibHigh,
            lowLabel: 'SMOOTH OPERATION',
            normalLabel: 'ACCEPTABLE VIBRATION BAND',
            highLabel: 'EXCESSIVE VIBRATION ALARM',
            warningLabel: 'HIGH VIBRATION WARNING',
            criticalLabel: 'CRITICAL VIBRATION TRIP',
            lowColor: '#10B981',
            normalColor: '#FB923C',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'CRITICAL',
          },
        };

      case 'emissions':
        const defaultEmissHigh = maxVal > 0 ? Math.ceil(maxVal * 1.1) : 200;
        return {
          category: 'emissions',
          displayName,
          unit,
          colorScheme: {
            primary: '#F87171',
            secondary: '#DC2626',
            gradient: ['#7F1D1D', '#B91C1C', '#F87171', '#FEE2E2'],
            accent: '#F87171',
          },
          defaultThresholds: {
            low: 0,
            normalMin: 0,
            normalMax: Math.floor(defaultEmissHigh * 0.9),
            high: defaultEmissHigh,
            warningLimit: Math.floor(defaultEmissHigh * 0.95),
            criticalLimit: defaultEmissHigh,
            lowLabel: 'CLEAN FLUE GAS',
            normalLabel: 'COMPLIANT EMISSION LEVEL',
            highLabel: 'EMISSION THRESHOLD EXCEEDED',
            warningLabel: 'EMISSION LEVEL ADVISORY',
            criticalLabel: 'CRITICAL EMISSION LIMIT BREACH',
            lowColor: '#10B981',
            normalColor: '#F87171',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'WARNING',
          },
        };

      case 'efficiency':
        return {
          category: 'efficiency',
          displayName,
          unit,
          colorScheme: {
            primary: '#4ADE80',
            secondary: '#16A34A',
            gradient: ['#14532D', '#15803D', '#4ADE80', '#DCFCE7'],
            accent: '#4ADE80',
          },
          defaultThresholds: {
            low: minVal > 50 ? Math.floor(minVal * 0.95) : 75,
            normalMin: minVal > 50 ? Math.floor(minVal * 0.98) : 80,
            normalMax: maxVal > 50 ? Math.ceil(maxVal) : 98,
            high: 100,
            warningLimit: minVal > 50 ? Math.floor(minVal * 0.95) : 75,
            criticalLimit: minVal > 50 ? Math.floor(minVal * 0.9) : 70,
            lowLabel: 'DEGRADED EFFICIENCY',
            normalLabel: 'OPTIMAL EFFICIENCY BAND',
            highLabel: 'PEAK DESIGN EFFICIENCY',
            warningLabel: 'LOW EFFICIENCY ADVISORY',
            criticalLabel: 'CRITICAL EFFICIENCY LOSS',
            lowColor: '#EF4444',
            normalColor: '#4ADE80',
            highColor: '#10B981',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'WARNING',
          },
        };

      case 'duration':
        return {
          category: 'duration',
          displayName,
          unit,
          colorScheme: {
            primary: '#14B8A6',
            secondary: '#0D9488',
            gradient: ['#134E4A', '#0F766E', '#14B8A6', '#CCFBF1'],
            accent: '#14B8A6',
          },
          defaultThresholds: {
            low: 0,
            normalMin: 0,
            normalMax: maxVal > 0 ? Math.ceil(maxVal) : 720,
            high: maxVal > 0 ? Math.ceil(maxVal * 1.5) : 1440,
            lowLabel: 'INITIAL CYCLE',
            normalLabel: 'STANDARD RUNNING WINDOW',
            highLabel: 'EXTENDED RUNNING DURATION',
            lowColor: '#14B8A6',
            normalColor: '#14B8A6',
            highColor: '#F59E0B',
            enabled: true,
            alarmEnabled: false,
            alarmSeverity: 'INFO',
          },
        };

      default:
        // Generic Numeric Metric with no fake units
        return {
          category: 'custom',
          displayName,
          unit,
          colorScheme: {
            primary: '#60A5FA',
            secondary: '#2563EB',
            gradient: ['#1E3A8A', '#1D4ED8', '#60A5FA', '#DBEAFE'],
            accent: '#60A5FA',
          },
          defaultThresholds: {
            low: Number(minVal.toFixed(2)),
            normalMin: Number((minVal + (maxVal - minVal) * 0.1).toFixed(2)),
            normalMax: Number((maxVal - (maxVal - minVal) * 0.1).toFixed(2)),
            high: Number(maxVal.toFixed(2)),
            warningLimit: Number((maxVal + (maxVal - minVal) * 0.05).toFixed(2)),
            criticalLimit: Number((maxVal + (maxVal - minVal) * 0.15).toFixed(2)),
            lowLabel: 'LOW RANGE',
            normalLabel: 'NOMINAL OPERATING RANGE',
            highLabel: 'HIGH RANGE',
            warningLabel: 'WARNING THRESHOLD',
            criticalLabel: 'CRITICAL LIMIT',
            lowColor: '#F59E0B',
            normalColor: '#60A5FA',
            highColor: '#EF4444',
            warningColor: '#F59E0B',
            criticalColor: '#EF4444',
            enabled: true,
            alarmEnabled: true,
            alarmSeverity: 'WARNING',
          },
        };
    }
  }

  /**
   * Check if records follow Key-Value report format (e.g. Section | Field | Value)
   */
  public static isKeyValueReport(records: DataRecord[]): boolean {
    if (!records.length) return false;
    return ReportParser.isReportFormat(records.map((r) => r.data));
  }

  /**
   * Check if dataset is an Alarm Log dataset
   */
  public static isAlarmDataset(records: DataRecord[]): boolean {
    if (!records.length) return false;
    const sample = records[0].data;
    const keys = Object.keys(sample).map((k) => k.toLowerCase());
    return (
      keys.includes('alarm') ||
      keys.includes('alarm_name') ||
      keys.includes('alarm_type') ||
      keys.includes('severity') ||
      keys.includes('alarm_id')
    );
  }

  /**
   * Main Dynamic Dataset Metric Discovery & Processing (Async / Mongo-aware)
   */
  public static async analyzeDatasetAsync(
    datasetId?: string,
    filters?: {
      equipment?: string;
      startDate?: string;
      endDate?: string;
      searchMetric?: string;
    }
  ): Promise<DatasetMetricsOverview> {
    const datasets = db.getDatasets();
    const activeDataset = datasetId ? db.getDatasetById(datasetId) : datasets[0];

    if (!activeDataset) {
      return {
        datasetId: '',
        datasetName: 'No Dataset Loaded',
        detectedMetrics: [],
        metricsData: {},
        isReportFormat: false,
        isAlarmDataset: false,
      };
    }

    let allRecords = await db.getRecordsAsync(activeDataset.id, 50000);
    if (allRecords.length === 0) {
      allRecords = db.getRecords(activeDataset.id);
    }

    return this.processAnalytics(activeDataset, allRecords, filters);
  }

  /**
   * Main Dynamic Dataset Metric Discovery & Processing (Sync fallback)
   */
  public static analyzeDataset(
    datasetId?: string,
    filters?: {
      equipment?: string;
      startDate?: string;
      endDate?: string;
      searchMetric?: string;
    }
  ): DatasetMetricsOverview {
    const datasets = db.getDatasets();
    const activeDataset = datasetId ? db.getDatasetById(datasetId) : datasets[0];

    if (!activeDataset) {
      return {
        datasetId: '',
        datasetName: 'No Dataset Loaded',
        detectedMetrics: [],
        metricsData: {},
        isReportFormat: false,
        isAlarmDataset: false,
      };
    }

    const allRecords = db.getRecords(activeDataset.id);
    return this.processAnalytics(activeDataset, allRecords, filters);
  }

  public static processAnalytics(
    activeDataset: Dataset,
    allRecords: DataRecord[],
    filters?: {
      equipment?: string;
      startDate?: string;
      endDate?: string;
      searchMetric?: string;
    }
  ): DatasetMetricsOverview {
    const isReport = ReportParser.isReportFormat(allRecords.map((r) => r.data)) || ReportParser.isReportFormat(activeDataset.columns);
    const isAlarm = this.isAlarmDataset(allRecords);

    // 1. Detect Equipment / Timestamp Columns
    const timeCol =
      activeDataset.dateColumn ||
      activeDataset.columns.find((c) => c.isTimestamp || c.dataType === 'datetime')?.name ||
      'Timestamp';

    const equipCol =
      activeDataset.equipmentColumn ||
      activeDataset.columns.find((c) => c.isEquipment)?.name ||
      'Equipment_ID';

    const metricDefinitions: MetricDefinition[] = [];
    const metricsData: Record<string, MetricAnalyticsPayload> = {};
    const savedMetricConfigs = db.getMetricConfigs();

    const genColors = [
      '#00FF41', '#38BDF8', '#F59E0B', '#EC4899', '#A855F7', '#14B8A6', '#F97316', '#6366F1',
    ];

    // =========================================================================
    // CASE 1: CONSOLIDATED REPORT FORMAT (Section | Field | Value)
    // =========================================================================
    if (isReport) {
      const parsedReport = ReportParser.parseConsolidatedReport(allRecords);
      let order = 1;

      // 1A. KPI METRICS (Render as KPI Cards / Single stat cards with real values)
      parsedReport.kpis.forEach((kpi) => {
        const baseKey = kpi.field.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const metricId = `kpi_${baseKey}`;
        const datasetKey = `${activeDataset.id}__${metricId}`;
        const classification = this.classifyMetric(kpi.field, kpi.unit, kpi.numericValue !== undefined ? [kpi.numericValue] : []);
        const saved = savedMetricConfigs[datasetKey] || savedMetricConfigs[metricId] || {};
        const finalUnit = saved.unit !== undefined ? saved.unit : (kpi.unit || classification.unit || '');
        const numVal = kpi.numericValue;

        const kpiDef: MetricDefinition = {
          id: datasetKey,
          datasetId: activeDataset.id,
          key: kpi.field,
          name: saved.name || kpi.displayName || kpi.field,
          category: (saved.category as MetricCategory) || kpi.category || classification.category,
          unit: finalUnit,
          dataType: 'key_value',
          displayType: 'kpi_card',
          isKPI: true,
          singleStat: {
            value: numVal !== undefined ? numVal : 0,
            unit: finalUnit,
            details: kpi.rawValue,
            status: 'NORMAL',
          },
          colorScheme: classification.colorScheme,
          thresholds: {
            ...classification.defaultThresholds,
            ...(saved.thresholds || {}),
          },
          displayOrder: saved.displayOrder || order++,
          isVisible: saved.isVisible !== undefined ? saved.isVisible : true,
          graphType: 'bar',
          show3D: false,
        };

        metricDefinitions.push(kpiDef);

        const effectiveVal = numVal !== undefined ? numVal : 0;
        const kpiPayload: MetricAnalyticsPayload = {
          metric: kpiDef,
          points: numVal !== undefined ? [
            {
              id: `pt_${metricId}`,
              rowIndex: 0,
              timestamp: 'Report KPI',
              xLabel: 'Report KPI',
              xIndex: 0,
              equipment: 'Plant System',
              equipmentIndex: 0,
              value: effectiveVal,
              status: 'NORMAL',
              statusLabel: 'KPI METRIC',
              color: classification.colorScheme.primary,
              data: { Field: kpi.field, Value: kpi.rawValue },
            },
          ] : [],
          xCategories: ['Report KPI'],
          equipmentList: ['Plant System'],
          isSinglePoint: true,
          singlePointData: {
            value: effectiveVal,
            unit: finalUnit,
            equipment: 'Plant System',
            status: 'NORMAL',
            message: `${kpi.displayName}: ${kpi.rawValue}`,
            rawData: { Field: kpi.field, Value: kpi.rawValue },
          },
          kpiDetails: {
            field: kpi.field,
            rawValue: kpi.rawValue,
            category: kpi.category,
            numericValue: numVal,
            unit: finalUnit,
          },
          generatorSeries: [
            {
              name: 'Plant System',
              color: classification.colorScheme.primary,
              data: [effectiveVal],
            },
          ],
          timeSeries: [
            {
              timestamp: 'Report KPI',
              values: { 'Plant System': effectiveVal },
            },
          ],
          distribution: {
            bins: [
              {
                label: `${effectiveVal} ${finalUnit}`,
                min: effectiveVal,
                max: effectiveVal,
                count: 1,
              },
            ],
            stats: {
              min: effectiveVal,
              max: effectiveVal,
              avg: effectiveVal,
              median: effectiveVal,
              stdDev: 0,
              totalRecords: 1,
              lowCount: 0,
              normalCount: 1,
              highCount: 0,
              lowPercent: 0,
              normalPercent: 100,
              highPercent: 0,
            },
          },
          alarms: [],
        };

        metricsData[datasetKey] = kpiPayload;
        metricsData[metricId] = kpiPayload;
        metricsData[kpi.field] = kpiPayload;
        metricsData[kpi.field.toLowerCase()] = kpiPayload;
      });

      // 1A.2 Ensure all detected numeric columns from dataset metadata are also mapped
      (activeDataset.columns || []).forEach((col) => {
        if (col.dataType === 'numeric' && col.isSensor !== false && !col.isIdentifier) {
          const lowerName = col.name.toLowerCase();
          const already = metricDefinitions.some(
            (m) =>
              m.key.toLowerCase() === lowerName ||
              m.name.toLowerCase() === lowerName ||
              m.name.toLowerCase() === (col.displayName || '').toLowerCase()
          );
          if (!already) {
            const baseKey = col.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const metricId = `kpi_${baseKey}`;
            const datasetKey = `${activeDataset.id}__${metricId}`;
            const classification = this.classifyMetric(col.name, col.unit, col.avg !== undefined ? [col.avg] : []);
            const numVal = col.avg !== undefined ? col.avg : col.max !== undefined ? col.max : col.min !== undefined ? col.min : 0;
            const finalUnit = col.unit || classification.unit || '';

            const kpiDef: MetricDefinition = {
              id: datasetKey,
              datasetId: activeDataset.id,
              key: col.name,
              name: col.displayName || col.name,
              category: classification.category,
              unit: finalUnit,
              dataType: 'numeric',
              displayType: 'kpi_card',
              isKPI: true,
              singleStat: {
                value: numVal,
                unit: finalUnit,
                status: 'NORMAL',
                details: `${col.displayName || col.name}: ${numVal} ${finalUnit}`,
              },
              colorScheme: classification.colorScheme,
              thresholds: classification.defaultThresholds,
              displayOrder: order++,
              isVisible: true,
              graphType: 'bar',
              show3D: false,
            };

            metricDefinitions.push(kpiDef);

            const kpiPayload: MetricAnalyticsPayload = {
              metric: kpiDef,
              points: [
                {
                  id: `pt_${metricId}`,
                  rowIndex: 0,
                  timestamp: 'Report KPI',
                  xLabel: 'Report KPI',
                  xIndex: 0,
                  equipment: 'Plant System',
                  equipmentIndex: 0,
                  value: numVal,
                  status: 'NORMAL',
                  statusLabel: 'NOMINAL',
                  color: classification.colorScheme.primary,
                  data: { Field: col.name, Value: numVal },
                },
              ],
              xCategories: ['Report KPI'],
              equipmentList: ['Plant System'],
              isSinglePoint: true,
              singlePointData: {
                value: numVal,
                unit: finalUnit,
                equipment: 'Plant System',
                status: 'NORMAL',
                message: `${col.displayName || col.name}: ${numVal} ${finalUnit}`,
                rawData: { Field: col.name, Value: numVal },
              },
              kpiDetails: {
                field: col.name,
                rawValue: String(numVal),
                category: classification.category,
                numericValue: numVal,
                unit: finalUnit,
              },
              generatorSeries: [
                {
                  name: 'Plant System',
                  color: classification.colorScheme.primary,
                  data: [numVal],
                },
              ],
              timeSeries: [
                {
                  timestamp: 'Report KPI',
                  values: { 'Plant System': numVal },
                },
              ],
              distribution: {
                bins: [
                  {
                    label: `${numVal} ${finalUnit}`,
                    min: numVal,
                    max: numVal,
                    count: 1,
                  },
                ],
                stats: {
                  min: col.min !== undefined ? col.min : numVal,
                  max: col.max !== undefined ? col.max : numVal,
                  avg: col.avg !== undefined ? col.avg : numVal,
                  median: numVal,
                  stdDev: 0,
                  totalRecords: col.distinctCount || 1,
                  lowCount: 0,
                  normalCount: 1,
                  highCount: 0,
                  lowPercent: 0,
                  normalPercent: 100,
                  highPercent: 0,
                },
              },
              alarms: [],
            };

            metricsData[datasetKey] = kpiPayload;
            metricsData[metricId] = kpiPayload;
            metricsData[col.name] = kpiPayload;
            metricsData[col.name.toLowerCase()] = kpiPayload;
          }
        }
      });

      // 1B. ALARM METRIC GROUPS (Convert pipe-separated data to real structured records)
      Object.entries(parsedReport.alarmMetricGroups).forEach(([groupKey, group]) => {
        const numRecords = group.records.filter((r) => r.numericValue !== undefined);
        const classification = this.classifyMetric(group.alarmName, group.unit, numRecords.map((r) => r.numericValue!));
        const metricId = `alm_grp_${groupKey}`;
        const datasetKey = `${activeDataset.id}__${metricId}`;
        const hasMultiple = numRecords.length > 1;

        const alarmDef: MetricDefinition = {
          id: datasetKey,
          datasetId: activeDataset.id,
          key: group.alarmName,
          name: `${group.displayName} Alarm Log`,
          category: classification.category,
          unit: group.unit || classification.unit || '',
          dataType: 'alarm',
          displayType: hasMultiple ? 'time_series_chart' : 'single_stat_card',
          isAlarmMetric: true,
          colorScheme: classification.colorScheme,
          thresholds: classification.defaultThresholds,
          displayOrder: order++,
          isVisible: true,
          graphType: 'line',
          show3D: hasMultiple,
        };

        metricDefinitions.push(alarmDef);

        const timestamps: string[] = [];
        const equipSet = new Set<string>();
        group.records.forEach((r) => {
          if (!timestamps.includes(r.timestamp)) timestamps.push(r.timestamp);
          if (r.generatorId) equipSet.add(r.generatorId);
        });

        const equipList = Array.from(equipSet).sort();
        if (equipList.length === 0) equipList.push('GEN-01');

        const points: Metric3DDataPoint[] = [];
        const alarmsPayloadList: MetricAnalyticsPayload['alarms'] = [];

        group.records.forEach((r) => {
          const val = r.numericValue !== undefined ? r.numericValue : 1;
          points.push({
            id: r.id,
            rowIndex: r.rowIndex,
            timestamp: r.timestamp,
            xLabel: r.timestamp,
            xIndex: timestamps.indexOf(r.timestamp),
            equipment: r.generatorId,
            equipmentIndex: Math.max(0, equipList.indexOf(r.generatorId)),
            value: val,
            status: r.severity === 'CRITICAL' ? 'HIGH' : 'NORMAL',
            statusLabel: `${r.severity} ALARM`,
            color: r.severity === 'CRITICAL' ? '#EF4444' : '#F59E0B',
            data: r.rawData,
          });

          alarmsPayloadList.push({
            id: r.id,
            timestamp: r.timestamp,
            equipment: r.generatorId,
            actualValue: val,
            thresholdValue: 0,
            thresholdType: 'HIGH',
            severity: r.severity,
            message: r.message || `${group.alarmName} triggered on ${r.generatorId}`,
            isAcknowledged: r.status === 'ACKNOWLEDGED' || r.status === 'RESOLVED',
          });
        });

        const numericVals = numRecords.map((r) => r.numericValue!);
        const minV = numericVals.length > 0 ? Math.min(...numericVals) : 0;
        const maxV = numericVals.length > 0 ? Math.max(...numericVals) : 0;
        const sumV = numericVals.length > 0 ? numericVals.reduce((a, b) => a + b, 0) : 0;
        const avgV = numericVals.length > 0 ? sumV / numericVals.length : 0;

        const timeSeries = timestamps.map((ts) => {
          const vals: Record<string, number | null> = {};
          equipList.forEach((eq) => {
            const found = group.records.find((r) => r.timestamp === ts && r.generatorId === eq && r.numericValue !== undefined);
            vals[eq] = found ? found.numericValue! : null;
          });
          return { timestamp: ts, values: vals };
        });

        const generatorSeries = equipList.map((eq, eqIdx) => ({
          name: eq,
          color: genColors[eqIdx % genColors.length],
          data: timestamps.map((ts) => {
            const found = group.records.find((r) => r.timestamp === ts && r.generatorId === eq && r.numericValue !== undefined);
            return found ? found.numericValue! : null;
          }),
        }));

        const payload: MetricAnalyticsPayload = {
          metric: alarmDef,
          points,
          xCategories: timestamps,
          equipmentList: equipList,
          isSinglePoint: !hasMultiple,
          singlePointData: group.records[0] ? {
            value: group.records[0].numericValue !== undefined ? group.records[0].numericValue : 1,
            unit: group.unit || classification.unit || '',
            timestamp: group.records[0].timestamp,
            equipment: group.records[0].generatorId,
            severity: group.records[0].severity,
            status: group.records[0].status,
            message: group.records[0].message,
            rawData: group.records[0].rawData,
          } : undefined,
          generatorSeries,
          timeSeries,
          distribution: {
            bins: [
              {
                label: `${minV.toFixed(1)}-${maxV.toFixed(1)} ${group.unit || classification.unit || ''}`,
                min: minV,
                max: maxV,
                count: group.records.length,
              },
            ],
            stats: {
              min: minV,
              max: maxV,
              avg: Number(avgV.toFixed(2)),
              median: avgV,
              stdDev: 0,
              totalRecords: group.records.length,
              lowCount: 0,
              normalCount: group.records.filter((r) => r.severity !== 'CRITICAL').length,
              highCount: group.records.filter((r) => r.severity === 'CRITICAL').length,
              lowPercent: 0,
              normalPercent: Math.round(((group.records.length - alarmsPayloadList.length) / (group.records.length || 1)) * 100),
              highPercent: 100,
            },
          },
          alarms: alarmsPayloadList,
        };

        metricsData[datasetKey] = payload;
        metricsData[metricId] = payload;
        metricsData[group.alarmName] = payload;
        metricsData[group.alarmName.toLowerCase()] = payload;
      });

      // 1C. MAINTENANCE METRICS
      if (parsedReport.maintenance.length > 0) {
        const maintDef: MetricDefinition = {
          id: `${activeDataset.id}__metric_maintenance`,
          datasetId: activeDataset.id,
          key: 'maintenance_operations',
          name: 'Maintenance & Service History',
          category: 'other',
          unit: 'INR',
          dataType: 'numeric',
          displayType: 'maintenance_table',
          isMaintenanceMetric: true,
          colorScheme: {
            primary: '#F59E0B',
            secondary: '#D97706',
            gradient: ['#78350F', '#D97706', '#F59E0B', '#FDE68A'],
            accent: '#F59E0B',
          },
          thresholds: {
            enabled: false,
            alarmEnabled: false,
          },
          displayOrder: order++,
          isVisible: true,
          graphType: 'bar',
          show3D: false,
        };

        metricDefinitions.push(maintDef);

        const maintEquips = Array.from(new Set(parsedReport.maintenance.map((m) => m.equipment)));
        const costsByEquip = maintEquips.map((eq) => {
          const recs = parsedReport.maintenance.filter((m) => m.equipment === eq && m.costInr !== undefined);
          return recs.reduce((acc, curr) => acc + (curr.costInr || 0), 0);
        });

        const totalCost = parsedReport.maintenanceSummary.totalCostInr;
        const avgCost = parsedReport.maintenance.length > 0 ? totalCost / parsedReport.maintenance.length : 0;

        metricsData[maintDef.id] = {
          metric: maintDef,
          points: [],
          xCategories: maintEquips,
          equipmentList: maintEquips,
          maintenanceHistory: parsedReport.maintenance,
          generatorSeries: [
            {
              name: 'Maintenance Cost (INR)',
              color: '#F59E0B',
              data: costsByEquip,
            },
          ],
          timeSeries: [],
          distribution: {
            bins: [],
            stats: {
              min: 0,
              max: Math.max(0, ...costsByEquip),
              avg: Number(avgCost.toFixed(2)),
              median: avgCost,
              stdDev: 0,
              totalRecords: parsedReport.maintenance.length,
              lowCount: 0,
              normalCount: parsedReport.maintenance.length,
              highCount: 0,
              lowPercent: 0,
              normalPercent: 100,
              highPercent: 0,
            },
          },
          alarms: [],
        };
        metricsData['maintenance_operations'] = metricsData[maintDef.id];
      }

      // Build structured Alarm Analytics from parsed report alarms
      let alarmAnalytics: AlarmAnalyticsPayload | undefined = undefined;
      if (parsedReport.alarms.length > 0) {
        const timeCounts: Record<string, { total: number; critical: number; warning: number }> = {};
        const sevCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        const eqCounts: Record<string, number> = {};

        parsedReport.alarms.forEach((alm) => {
          const ts = alm.timestamp || '2026-08-17';
          if (!timeCounts[ts]) timeCounts[ts] = { total: 0, critical: 0, warning: 0 };
          timeCounts[ts].total++;
          if (alm.severity === 'CRITICAL') timeCounts[ts].critical++;
          else timeCounts[ts].warning++;

          sevCounts[alm.severity] = (sevCounts[alm.severity] || 0) + 1;
          typeCounts[alm.alarmName] = (typeCounts[alm.alarmName] || 0) + 1;
          eqCounts[alm.generatorId] = (eqCounts[alm.generatorId] || 0) + 1;
        });

        alarmAnalytics = {
          timeline: Object.entries(timeCounts).map(([timestamp, counts]) => ({
            timestamp,
            count: counts.total,
            critical: counts.critical,
            warning: counts.warning,
          })),
          bySeverity: Object.entries(sevCounts).map(([severity, count]) => ({
            severity,
            count,
            color: severity === 'CRITICAL' ? '#EF4444' : severity === 'HIGH' ? '#F97316' : '#F59E0B',
          })),
          byType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
          byEquipment: Object.entries(eqCounts).map(([equipment, count]) => ({ equipment, count })),
          durationStats: {
            avgMinutes: 0,
            maxMinutes: 0,
            totalMinutes: 0,
          },
          valuesByUnit: [],
        };
      }

      return {
        datasetId: activeDataset.id,
        datasetName: activeDataset.name,
        detectedMetrics: metricDefinitions,
        metricsData,
        alarmAnalytics,
        isReportFormat: true,
        isAlarmDataset: isAlarm || parsedReport.alarms.length > 0,
        reportSummary: {
          kpiCount: parsedReport.kpis.length,
          alarmCount: parsedReport.alarms.length,
          maintenanceCount: parsedReport.maintenance.length,
          anomalyCount: parsedReport.anomalies.length,
          totalMaintenanceCostInr: parsedReport.maintenanceSummary.totalCostInr,
          metaInfo: parsedReport.meta,
        },
      };
    }

    // =========================================================================
    // CASE 2: STANDARD MULTI-COLUMN TELEMETRY DATASET
    // =========================================================================
    const numericColumns = activeDataset.columns.filter((c) => {
      const lower = c.name.toLowerCase();
      if (c.dataType !== 'numeric' || c.isIdentifier || c.isTimestamp || c.isEquipment) return false;
      if (['timestamp', 'date', 'time', 'generator_id', 'equipment_id', 'unit', 'id'].includes(lower)) return false;
      return true;
    });

    let order = 1;
    for (const col of numericColumns) {
      const samples = allRecords
        .map((r) => Number(r.data[col.name]))
        .filter((v) => !isNaN(v));

      const classification = this.classifyMetric(col.name, col.unit, samples);
      const baseMetricKey = col.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const metricId = `metric_${baseMetricKey}`;
      const datasetSpecificKey = `${activeDataset.id}__${metricId}`;

      const saved = savedMetricConfigs[datasetSpecificKey] || savedMetricConfigs[metricId] || savedMetricConfigs[col.name.toLowerCase()] || {};
      const finalUnit = saved.unit !== undefined ? saved.unit : (classification.unit || col.unit || '');

      metricDefinitions.push({
        id: datasetSpecificKey,
        datasetId: activeDataset.id,
        key: col.name,
        name: saved.name || classification.displayName,
        category: (saved.category as MetricCategory) || classification.category,
        unit: finalUnit,
        dataType: 'numeric',
        displayType: samples.length <= 1 ? 'single_stat_card' : 'time_series_chart',
        colorScheme: classification.colorScheme,
        thresholds: {
          ...classification.defaultThresholds,
          ...(saved.thresholds || {}),
        },
        displayOrder: saved.displayOrder || order++,
        isVisible: saved.isVisible !== undefined ? saved.isVisible : true,
        graphType: saved.graphType || '3d_surface',
        show3D: samples.length > 1,
        threeDSettings: {
          wireframe: false,
          verticalScale: 1.0,
          surfaceResolution: 40,
          showPoints: true,
          showGrid: true,
          ...(saved.threeDSettings || {}),
        },
      });
    }

    // Add custom metrics defined for this dataset
    for (const [key, cfg] of Object.entries(savedMetricConfigs)) {
      if (cfg.isCustom) {
        const isThisDataset = key.startsWith(`${activeDataset.id}__`) || cfg.datasetId === activeDataset.id;
        if (isThisDataset) {
          const alreadyPresent = metricDefinitions.some(
            (m) => m.id === key || m.name.toLowerCase() === (cfg.name || '').toLowerCase()
          );
          if (!alreadyPresent) {
            const customUnit = cfg.unit !== undefined ? cfg.unit : '';
            metricDefinitions.push({
              id: key,
              datasetId: activeDataset.id,
              key: cfg.key || key,
              name: cfg.name || 'Custom Metric',
              category: (cfg.category as MetricCategory) || 'custom',
              unit: customUnit,
              isCustom: true,
              dataType: 'numeric',
              displayType: 'time_series_chart',
              colorScheme: cfg.colorScheme || {
                primary: '#F27D26',
                secondary: '#EA580C',
                gradient: ['#7C2D12', '#C2410C', '#F27D26', '#FDBA74'],
                accent: '#F27D26',
              },
              thresholds: {
                low: cfg.thresholds?.low,
                normalMin: cfg.thresholds?.normalMin,
                normalMax: cfg.thresholds?.normalMax,
                high: cfg.thresholds?.high,
                warningLimit: cfg.thresholds?.warningLimit,
                criticalLimit: cfg.thresholds?.criticalLimit,
                lowLabel: cfg.thresholds?.lowLabel || 'LOW LIMIT',
                normalLabel: cfg.thresholds?.normalLabel || 'NORMAL OPERATING',
                highLabel: cfg.thresholds?.highLabel || 'HIGH LIMIT',
                warningLabel: cfg.thresholds?.warningLabel || 'WARNING LIMIT',
                criticalLabel: cfg.thresholds?.criticalLabel || 'CRITICAL LIMIT',
                lowColor: '#06B6D4',
                normalColor: '#00FF41',
                highColor: '#EF4444',
                warningColor: '#F59E0B',
                criticalColor: '#EF4444',
                enabled: cfg.thresholds?.enabled !== false,
                alarmEnabled: cfg.thresholds?.alarmEnabled !== false,
                alarmSeverity: cfg.thresholds?.alarmSeverity || 'CRITICAL',
              },
              displayOrder: cfg.displayOrder || order++,
              isVisible: cfg.isVisible !== undefined ? cfg.isVisible : true,
              graphType: '3d_surface',
              show3D: true,
            });
          }
        }
      }
    }

    // Process Equipment List
    const equipSet = new Set<string>();
    allRecords.forEach((r) => {
      const eq = r.data[equipCol] || r.data['equipment'] || r.data['equipment_id'] || r.data['Unit'] || r.data['unit'] || 'GEN-01';
      if (eq) equipSet.add(String(eq));
    });
    const equipmentList = Array.from(equipSet).sort();
    if (equipmentList.length === 0) equipmentList.push('GEN-01');

    for (const metric of metricDefinitions) {
      let recordsToProcess = allRecords;

      if (filters?.equipment && filters.equipment !== 'ALL') {
        recordsToProcess = recordsToProcess.filter((r) => {
          const eq = String(r.data[equipCol] || r.data['equipment'] || r.data['equipment_id'] || r.data['Unit'] || r.data['unit'] || '');
          return eq === filters.equipment;
        });
      }

      if (filters?.startDate || filters?.endDate) {
        recordsToProcess = recordsToProcess.filter((r) => {
          const tsStr = String(r.data[timeCol] || r.timestamp || '');
          const tsNum = Date.parse(tsStr);
          if (isNaN(tsNum)) return true;
          if (filters?.startDate && tsNum < Date.parse(filters.startDate)) return false;
          if (filters?.endDate && tsNum > Date.parse(filters.endDate)) return false;
          return true;
        });
      }

      const allDatasetTimestamps: string[] = [];
      recordsToProcess.forEach((rec, idx) => {
        const timeStr = String(rec.data[timeCol] || rec.timestamp || `T-${idx + 1}`);
        if (!allDatasetTimestamps.includes(timeStr)) {
          allDatasetTimestamps.push(timeStr);
        }
      });

      const points: Metric3DDataPoint[] = [];
      const alarms: MetricAnalyticsPayload['alarms'] = [];

      let totalSum = 0;
      let minVal = Number.POSITIVE_INFINITY;
      let maxVal = Number.NEGATIVE_INFINITY;
      let lowCount = 0;
      let normalCount = 0;
      let highCount = 0;
      const validNumbers: number[] = [];

      const timeSeriesMap: Map<string, Record<string, number | null>> = new Map();
      allDatasetTimestamps.forEach((ts) => {
        const initialEqMap: Record<string, number | null> = {};
        equipmentList.forEach((eq) => {
          initialEqMap[eq] = null;
        });
        timeSeriesMap.set(ts, initialEqMap);
      });

      recordsToProcess.forEach((rec, idx) => {
        let rawVal = rec.data[metric.key];
        if (rawVal === undefined || rawVal === null || rawVal === '') {
          rawVal = rec.data[metric.name];
        }
        if (rawVal === undefined || rawVal === null || rawVal === '') {
          const cleanKTarget = metric.key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanNTarget = (metric.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          for (const [k, v] of Object.entries(rec.data)) {
            if (v === undefined || v === null || v === '') continue;
            const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (cleanK === cleanKTarget || (cleanNTarget && cleanK === cleanNTarget)) {
              rawVal = v;
              break;
            }
            const baseK = k.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').replace(/[^a-z0-9]/g, '');
            if (baseK && (baseK === cleanKTarget || (cleanNTarget && baseK === cleanNTarget))) {
              rawVal = v;
              break;
            }
          }
        }

        const numVal = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));
        const timeStr = String(rec.data[timeCol] || rec.timestamp || `T-${idx + 1}`);
        const equipStr = String(rec.data[equipCol] || rec.data['equipment'] || rec.data['equipment_id'] || rec.data['Unit'] || rec.data['unit'] || 'GEN-01');

        if (isNaN(numVal)) {
          return;
        }

        const xIdx = allDatasetTimestamps.indexOf(timeStr);
        const eqIdx = Math.max(0, equipmentList.indexOf(equipStr));

        const thresh = metric.thresholds;
        let status: 'LOW' | 'NORMAL' | 'HIGH' = 'NORMAL';
        let statusLabel = thresh.normalLabel || 'NORMAL';
        let color = thresh.normalColor || metric.colorScheme.primary;

        if (thresh.enabled) {
          if (thresh.criticalLimit !== undefined && numVal >= thresh.criticalLimit) {
            status = 'HIGH';
            statusLabel = thresh.criticalLabel || thresh.highLabel || `CRITICAL ${metric.name.toUpperCase()} LIMIT EXCEEDED`;
            color = thresh.criticalColor || thresh.highColor || '#EF4444';
            highCount++;

            if (thresh.alarmEnabled) {
              alarms.push({
                id: `alm_${metric.id}_crit_${rec.id || idx}`,
                timestamp: timeStr,
                equipment: equipStr,
                actualValue: Number(numVal.toFixed(2)),
                thresholdValue: thresh.criticalLimit,
                thresholdType: 'HIGH',
                severity: 'CRITICAL',
                message: `${metric.name} critical breach: ${numVal.toFixed(2)} ${metric.unit} reached/exceeded critical limit of ${thresh.criticalLimit} ${metric.unit} on ${equipStr}`,
                isAcknowledged: false,
              });
            }
          } else if (thresh.warningLimit !== undefined && numVal >= thresh.warningLimit) {
            status = 'HIGH';
            statusLabel = thresh.warningLabel || `WARNING ${metric.name.toUpperCase()} BAND`;
            color = thresh.warningColor || '#F59E0B';
            highCount++;

            if (thresh.alarmEnabled) {
              alarms.push({
                id: `alm_${metric.id}_warn_${rec.id || idx}`,
                timestamp: timeStr,
                equipment: equipStr,
                actualValue: Number(numVal.toFixed(2)),
                thresholdValue: thresh.warningLimit,
                thresholdType: 'HIGH',
                severity: 'WARNING',
                message: `${metric.name} warning: ${numVal.toFixed(2)} ${metric.unit} exceeded warning limit of ${thresh.warningLimit} ${metric.unit} on ${equipStr}`,
                isAcknowledged: false,
              });
            }
          } else if (thresh.high !== undefined && numVal > thresh.high) {
            status = 'HIGH';
            statusLabel = thresh.highLabel || `HIGH ${metric.name.toUpperCase()} ALERT`;
            color = thresh.highColor || '#EF4444';
            highCount++;

            if (thresh.alarmEnabled) {
              alarms.push({
                id: `alm_${metric.id}_high_${rec.id || idx}`,
                timestamp: timeStr,
                equipment: equipStr,
                actualValue: Number(numVal.toFixed(2)),
                thresholdValue: thresh.high,
                thresholdType: 'HIGH',
                severity: thresh.alarmSeverity || 'CRITICAL',
                message: `${metric.name} reading ${numVal.toFixed(2)} ${metric.unit} exceeded high limit of ${thresh.high} ${metric.unit} on ${equipStr}`,
                isAcknowledged: false,
              });
            }
          } else if (thresh.low !== undefined && numVal < thresh.low) {
            status = 'LOW';
            statusLabel = thresh.lowLabel || `LOW ${metric.name.toUpperCase()} WARNING`;
            color = thresh.lowColor || '#06B6D4';
            lowCount++;

            if (thresh.alarmEnabled) {
              alarms.push({
                id: `alm_${metric.id}_low_${rec.id || idx}`,
                timestamp: timeStr,
                equipment: equipStr,
                actualValue: Number(numVal.toFixed(2)),
                thresholdValue: thresh.low,
                thresholdType: 'LOW',
                severity: thresh.alarmSeverity || 'WARNING',
                message: `${metric.name} reading ${numVal.toFixed(2)} ${metric.unit} dropped below low limit of ${thresh.low} ${metric.unit} on ${equipStr}`,
                isAcknowledged: false,
              });
            }
          } else if (thresh.normalMin !== undefined && numVal < thresh.normalMin) {
            status = 'LOW';
            statusLabel = thresh.lowLabel || `BELOW NORMAL ${metric.name.toUpperCase()}`;
            color = thresh.lowColor || '#F59E0B';
            lowCount++;
          } else if (thresh.normalMax !== undefined && numVal > thresh.normalMax) {
            status = 'HIGH';
            statusLabel = thresh.highLabel || `ABOVE NORMAL ${metric.name.toUpperCase()}`;
            color = thresh.highColor || '#F59E0B';
            highCount++;
          } else {
            normalCount++;
          }
        } else {
          normalCount++;
        }

        totalSum += numVal;
        if (numVal < minVal) minVal = numVal;
        if (numVal > maxVal) maxVal = numVal;
        validNumbers.push(numVal);

        points.push({
          id: `pt_${metric.id}_${rec.id || idx}`,
          rowIndex: idx,
          timestamp: timeStr,
          xLabel: timeStr,
          xIndex: xIdx >= 0 ? xIdx : idx,
          equipment: equipStr,
          equipmentIndex: eqIdx,
          value: Number(numVal.toFixed(2)),
          status,
          statusLabel,
          color,
          data: rec.data,
        });

        if (!timeSeriesMap.has(timeStr)) {
          timeSeriesMap.set(timeStr, {});
        }
        timeSeriesMap.get(timeStr)![equipStr] = Number(numVal.toFixed(2));
      });

      const xCategories = allDatasetTimestamps.length > 0 ? allDatasetTimestamps : points.map((p) => p.timestamp);

      const generatorSeries = equipmentList.map((eq, eqIdx) => {
        const seriesData = xCategories.map((ts) => {
          const pt = points.find((p) => p.timestamp === ts && p.equipment === eq);
          return pt !== undefined ? pt.value : (timeSeriesMap.get(ts)?.[eq] ?? null);
        });

        return {
          name: eq,
          color: genColors[eqIdx % genColors.length],
          data: seriesData,
        };
      });

      const timeSeries = xCategories.map((ts) => ({
        timestamp: ts,
        values: timeSeriesMap.get(ts) || {},
      }));

      const effectiveMin = minVal === Number.POSITIVE_INFINITY ? (metric.thresholds?.normalMin ?? 0) : minVal;
      const effectiveMax = maxVal === Number.NEGATIVE_INFINITY ? (metric.thresholds?.normalMax ?? 100) : maxVal;
      const binCount = 7;
      const binSpan = (effectiveMax - effectiveMin) / binCount || 1;

      const bins = Array.from({ length: binCount }, (_, bIdx) => {
        const bMin = effectiveMin + bIdx * binSpan;
        const bMax = effectiveMin + (bIdx + 1) * binSpan;
        const count = validNumbers.filter((v) => (bIdx === binCount - 1 ? v >= bMin && v <= bMax : v >= bMin && v < bMax)).length;
        const unitSuffix = metric.unit ? ` ${metric.unit}` : '';
        return {
          label: `${bMin.toFixed(1)}-${bMax.toFixed(1)}${unitSuffix}`,
          min: Number(bMin.toFixed(1)),
          max: Number(bMax.toFixed(1)),
          count,
        };
      });

      const totalRecords = validNumbers.length;
      const avg = totalRecords > 0 ? Number((totalSum / totalRecords).toFixed(2)) : (effectiveMin + effectiveMax) / 2;

      const sortedNums = [...validNumbers].sort((a, b) => a - b);
      const median =
        sortedNums.length > 0
          ? sortedNums.length % 2 === 0
            ? (sortedNums[sortedNums.length / 2 - 1] + sortedNums[sortedNums.length / 2]) / 2
            : sortedNums[Math.floor(sortedNums.length / 2)]
          : avg;

      const variance =
        sortedNums.length > 1
          ? sortedNums.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / (sortedNums.length - 1)
          : 0;
      const stdDev = Math.sqrt(variance);

      const metricPayload: MetricAnalyticsPayload = {
        metric,
        points,
        xCategories,
        equipmentList,
        isSinglePoint: validNumbers.length <= 1,
        singlePointData: validNumbers.length === 1 && points[0] ? {
          value: points[0].value,
          unit: metric.unit,
          timestamp: points[0].timestamp,
          equipment: points[0].equipment,
          status: points[0].status,
          message: `${metric.name}: ${points[0].value} ${metric.unit}`,
          rawData: points[0].data,
        } : undefined,
        generatorSeries,
        timeSeries,
        distribution: {
          bins,
          stats: {
            min: Number(effectiveMin.toFixed(2)),
            max: Number(effectiveMax.toFixed(2)),
            avg: Number(avg.toFixed(2)),
            median: Number(median.toFixed(2)),
            stdDev: Number(stdDev.toFixed(2)),
            totalRecords,
            lowCount,
            normalCount,
            highCount,
            lowPercent: totalRecords > 0 ? Math.round((lowCount / totalRecords) * 100) : 0,
            normalPercent: totalRecords > 0 ? Math.round((normalCount / totalRecords) * 100) : 0,
            highPercent: totalRecords > 0 ? Math.round((highCount / totalRecords) * 100) : 0,
          },
        },
        alarms,
      };

      metricsData[metric.id] = metricPayload;
      if (metric.key) {
        metricsData[metric.key] = metricPayload;
        metricsData[metric.key.toLowerCase()] = metricPayload;
      }
      if (metric.name) {
        metricsData[metric.name] = metricPayload;
        metricsData[metric.name.toLowerCase()] = metricPayload;
      }
    }

    let alarmAnalytics: AlarmAnalyticsPayload | undefined = undefined;
    if (isAlarm) {
      alarmAnalytics = this.processAlarmDataset(allRecords);
    }

    return {
      datasetId: activeDataset.id,
      datasetName: activeDataset.name,
      detectedMetrics: metricDefinitions,
      metricsData,
      alarmAnalytics,
      isReportFormat: false,
      isAlarmDataset: isAlarm,
    };
  }

  /**
   * Specialized aggregation parser for dedicated alarm datasets
   */
  private static processAlarmDataset(records: DataRecord[]): AlarmAnalyticsPayload {
    const timeCounts: Record<string, { total: number; critical: number; warning: number }> = {};
    const severityCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const equipCounts: Record<string, number> = {};
    let totalDurationMin = 0;
    let durationEntriesCount = 0;
    let maxDurationMin = 0;

    const unitAlarmsMap: Record<
      string,
      {
        unit: string;
        metricType: string;
        alarms: Array<{
          timestamp: string;
          equipment: string;
          alarm: string;
          value: number;
          unit: string;
        }>;
      }
    > = {};

    records.forEach((r) => {
      const d = r.data;
      const ts = String(d['Timestamp'] || d['Date'] || r.timestamp || '2026-01-01');
      const sev = String(d['Severity'] || d['severity'] || 'CRITICAL').toUpperCase();
      const alarmType = String(d['Alarm_Type'] || d['alarm_type'] || d['Type'] || 'General Alarm');
      const equip = String(d['Equipment_ID'] || d['Generator_ID'] || d['equipment_id'] || 'GEN-01');
      const dur = Number(d['Duration_Minutes'] || d['duration_minutes'] || 0);
      const val = Number(d['Value'] || d['value'] || 0);
      const rawUnit = String(d['Unit'] || d['unit'] || '');
      const extracted = extractUnitAndName(alarmType, rawUnit);
      const unit = extracted.unit || rawUnit || '';

      // Timeline
      if (!timeCounts[ts]) timeCounts[ts] = { total: 0, critical: 0, warning: 0 };
      timeCounts[ts].total++;
      if (sev === 'CRITICAL') timeCounts[ts].critical++;
      else timeCounts[ts].warning++;

      // Severity
      severityCounts[sev] = (severityCounts[sev] || 0) + 1;

      // Type
      typeCounts[alarmType] = (typeCounts[alarmType] || 0) + 1;

      // Equip
      equipCounts[equip] = (equipCounts[equip] || 0) + 1;

      // Duration
      if (!isNaN(dur) && dur > 0) {
        totalDurationMin += dur;
        durationEntriesCount++;
        if (dur > maxDurationMin) maxDurationMin = dur;
      }

      // Group Values STRICTLY BY UNIT
      if (!isNaN(val)) {
        const unitKey = unit || 'No unit';
        if (!unitAlarmsMap[unitKey]) {
          const detectedCat = this.classifyMetric(alarmType, unit).displayName;
          unitAlarmsMap[unitKey] = { unit, metricType: detectedCat, alarms: [] };
        }
        unitAlarmsMap[unitKey].alarms.push({
          timestamp: ts,
          equipment: equip,
          alarm: alarmType,
          value: val,
          unit,
        });
      }
    });

    const alarmAnalytics: AlarmAnalyticsPayload = {
      timeline: Object.entries(timeCounts).map(([timestamp, counts]) => ({
        timestamp,
        count: counts.total,
        critical: counts.critical,
        warning: counts.warning,
      })),
      bySeverity: Object.entries(severityCounts).map(([severity, count]) => ({
        severity,
        count,
        color: severity === 'CRITICAL' ? '#EF4444' : severity === 'WARNING' ? '#F59E0B' : '#3B82F6',
      })),
      byType: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
      byEquipment: Object.entries(equipCounts).map(([equipment, count]) => ({ equipment, count })),
      durationStats: {
        avgMinutes: durationEntriesCount > 0 ? Number((totalDurationMin / durationEntriesCount).toFixed(1)) : 0,
        maxMinutes: maxDurationMin,
        totalMinutes: totalDurationMin,
      },
      valuesByUnit: Object.values(unitAlarmsMap),
    };

    return alarmAnalytics;
  }
}
