export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  department: string;
  designation: string;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface ColumnMetadata {
  name: string;
  displayName: string;
  dataType: 'numeric' | 'string' | 'datetime' | 'category' | 'boolean';
  unit?: string;
  min?: number;
  max?: number;
  avg?: number;
  distinctCount?: number;
  sampleValues: any[];
  isIdentifier?: boolean;
  isTimestamp?: boolean;
  isEquipment?: boolean;
  isSensor?: boolean;
}

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xls' | 'xlsx';
  category: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: string;
  updatedAt?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  dateColumn?: string;
  timeColumn?: string;
  equipmentColumn?: string;
  columns: ColumnMetadata[];
  description?: string;
  tags?: string[];
  isArchived?: boolean;
  status?: 'ACTIVE' | 'ARCHIVED' | 'PROCESSING';
  detectedMetrics?: string[];
  sourceReference?: string;
}

export interface DataRecord {
  id: string;
  datasetId: string;
  rowIndex: number;
  timestamp?: string;
  equipmentId?: string;
  data: Record<string, any>;
  createdAt: string;
}

export type AlarmCondition = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'BETWEEN' | 'OUTSIDE';
export type AlarmLevel = 'CRITICAL' | 'HIGH' | 'WARNING' | 'NORMAL' | 'INFO';

export type TemperatureStatus = 'ABOVE' | 'NORMAL' | 'BELOW';
export type AlarmDisplayPosition = 'below_graph' | 'full_page' | 'floating_panel' | 'top_notification';

export interface TemperatureThresholdConfig {
  id?: string;
  datasetId?: string;
  metricColumn: string;
  timestampColumn?: string;
  equipmentColumn?: string;
  belowThreshold: number;
  normalMin: number;
  normalMax: number;
  aboveThreshold: number;
  belowLabel: string;
  normalLabel: string;
  aboveLabel: string;
  belowColor: string;
  normalColor: string;
  aboveColor: string;
  belowOpacity: number;
  normalOpacity: number;
  aboveOpacity: number;
  isEnabled: boolean;
  unit: string;
  surfaceResolution: number;
  showGrid3D: boolean;
  showPoints3D: boolean;
  showMesh3D: boolean;
  wireframe: boolean;
  verticalScale: number;
  defaultViewMode: 'surface' | 'infographic' | 'split';
  // Alarm Controls
  enableMonitoring?: boolean;
  enableAboveAlarm?: boolean;
  enableBelowAlarm?: boolean;
  showAlarmsOnDashboard?: boolean;
  alarmDisplayPosition?: AlarmDisplayPosition;
  showAlarmCount?: boolean;
  playAlarmSound?: boolean;
  requireAcknowledgement?: boolean;
  enableAutoResolve?: boolean;
  aboveAlarmSeverity?: AlarmLevel;
  belowAlarmSeverity?: AlarmLevel;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TemperatureDataPoint {
  id: string;
  rowIndex: number;
  timestamp: string;
  xLabel: string;
  xIndex: number;
  equipment: string;
  equipmentIndex: number;
  temperature: number;
  status: TemperatureStatus;
  statusLabel: string;
  color: string;
  data: Record<string, any>;
}

export interface TemperatureAlarmItem {
  id: string;
  pointId: string;
  rowIndex: number;
  timestamp: string;
  equipment: string;
  actualTemperature: number;
  configuredThreshold: number;
  thresholdType: 'ABOVE' | 'BELOW';
  status: TemperatureStatus;
  statusLabel: string;
  alarmLevel: AlarmLevel;
  color: string;
  message: string;
  datasetName: string;
  datasetId: string;
  isAcknowledged: boolean;
  isResolved: boolean;
  createdAt: string;
}

export interface TemperatureAnalyticsPayload {
  config: TemperatureThresholdConfig;
  points: TemperatureDataPoint[];
  alarms: TemperatureAlarmItem[];
  summary: {
    total: number;
    aboveCount: number;
    normalCount: number;
    belowCount: number;
    abovePercent: number;
    normalPercent: number;
    belowPercent: number;
    minTemp: number;
    maxTemp: number;
    avgTemp: number;
    activeAlarmsCount: number;
  };
  equipmentList: string[];
  xCategories: string[];
  metricColumn: string;
  unit: string;
}

export interface AlarmRule {
  id: string;
  name: string;
  datasetId?: string; // Optional: all or specific
  metricColumn: string;
  equipmentScope?: string; // Optional: specific equipment or 'ALL'
  condition: AlarmCondition;
  thresholdValue: number;
  secondaryThreshold?: number; // for BETWEEN
  alarmLevel: AlarmLevel;
  customColor: string; // e.g. '#EF4444' or '#F59E0B'
  priority: number; // 1-5
  messageTemplate: string;
  isEnabled: boolean;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AlarmStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLEARED';

export interface AlarmEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  datasetId: string;
  datasetName: string;
  recordId?: string;
  timestamp: string;
  metricColumn: string;
  actualValue: number;
  thresholdValue: number;
  condition: AlarmCondition;
  equipmentId?: string;
  alarmLevel: AlarmLevel;
  color: string;
  message: string;
  status: AlarmStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  clearedBy?: string;
  clearedAt?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ChartType = 'line' | 'area' | 'bar' | 'bar3d' | 'donut' | 'scatter' | 'heatmap' | 'gauge' | 'histogram';

export interface ChartConfig {
  id: string;
  title: string;
  chartType: ChartType;
  datasetId: string;
  xAxisColumn: string;
  yAxisColumns: string[];
  aggregation?: 'none' | 'avg' | 'sum' | 'min' | 'max' | 'count';
  unit?: string;
  colorPalette?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showToolbox?: boolean;
  showDataZoom?: boolean;
  filterEquipment?: string[];
  timeRange?: string; // 'all' | '24h' | '7d' | '30d' | 'custom'
  thresholdLines?: {
    value: number;
    label: string;
    color: string;
  }[];
  customOptions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'alarm_panel' | 'equipment_summary' | 'insight_panel' | 'recent_data_table' | 'plant_health_gauge';
  datasetId?: string;
  chartConfigId?: string;
  metricColumn?: string;
  equipmentId?: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  isVisible: boolean;
  refreshInterval?: number; // in seconds
  settings?: Record<string, any>;
}

export interface DashboardLayout {
  id: string;
  userId?: string;
  isDefault: boolean;
  name: string;
  widgets: DashboardWidget[];
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SmartInsight {
  id: string;
  type: 'peak' | 'threshold_breach' | 'equipment_performance' | 'trend' | 'anomaly';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  metric?: string;
  equipment?: string;
  value?: number;
  calculatedFrom: {
    datasetId: string;
    sampleSize: number;
    timeframe?: string;
  };
  timestamp: string;
}

export interface AlarmAudioSettings {
  masterEnabled: boolean;
  criticalAudioEnabled: boolean;
  warningAudioEnabled: boolean;
  volume: number;
  playbackMode: 'on_event' | 'continuous';
  repeatIntervalSec: number;
  soundType: 'industrial_siren' | 'urgent_beep' | 'chime';
  enableDesktopNotifications?: boolean;
}

export type MetricCategory =
  | 'temperature'
  | 'voltage'
  | 'power'
  | 'frequency'
  | 'fuel'
  | 'pressure'
  | 'current'
  | 'rpm'
  | 'vibration'
  | 'duration'
  | 'efficiency'
  | 'emissions'
  | 'flow'
  | 'other'
  | 'custom';

export interface MetricThresholdConfig {
  low?: number; // Below / Low Alarm Limit (e.g. 20)
  normalMin?: number; // Normal Minimum (e.g. 20)
  normalMax?: number; // Normal Maximum (e.g. 30)
  high?: number; // Above / High Alarm Limit (e.g. 30)
  warningLimit?: number; // Warning threshold (e.g. 35)
  criticalLimit?: number; // Critical threshold (e.g. 40)
  lowLabel?: string;
  normalLabel?: string;
  highLabel?: string;
  warningLabel?: string;
  criticalLabel?: string;
  lowColor?: string;
  normalColor?: string;
  highColor?: string;
  warningColor?: string;
  criticalColor?: string;
  enabled: boolean;
  alarmEnabled: boolean;
  alarmSeverity?: AlarmLevel;
}

export interface MetricDefinition {
  id: string;
  datasetId?: string;
  key: string;
  name: string;
  category: MetricCategory;
  unit: string;
  description?: string;
  isCustom?: boolean;
  dataType: 'numeric' | 'categorical' | 'alarm' | 'key_value';
  displayType?: 'time_series_chart' | 'kpi_card' | 'single_stat_card' | 'bar_comparison' | 'maintenance_table';
  isKPI?: boolean;
  isAlarmMetric?: boolean;
  isMaintenanceMetric?: boolean;
  isAnomalyMetric?: boolean;
  singleStat?: {
    value: number;
    unit: string;
    timestamp?: string;
    equipmentId?: string;
    status?: string;
    severity?: string;
    details?: string;
  };
  colorScheme: {
    primary: string;
    secondary?: string;
    gradient: string[];
    accent: string;
  };
  thresholds: MetricThresholdConfig;
  displayOrder: number;
  isVisible: boolean;
  graphType: '3d_surface' | '2d_multi_series' | 'distribution' | 'bar' | 'line' | 'area';
  show3D: boolean;
  threeDSettings?: {
    wireframe: boolean;
    verticalScale: number;
    surfaceResolution: number;
    showPoints: boolean;
    showGrid: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Metric3DDataPoint {
  id: string;
  rowIndex: number;
  timestamp: string;
  xLabel: string;
  xIndex: number;
  equipment: string;
  equipmentIndex: number;
  value: number;
  status: 'LOW' | 'NORMAL' | 'HIGH';
  statusLabel: string;
  color: string;
  data: Record<string, any>;
}

export interface MetricAnalyticsPayload {
  metric: MetricDefinition;
  points: Metric3DDataPoint[];
  xCategories: string[];
  equipmentList: string[];
  isSinglePoint?: boolean;
  singlePointData?: {
    value: number;
    unit: string;
    timestamp?: string;
    equipment?: string;
    status?: string;
    severity?: string;
    message?: string;
    rawData?: Record<string, any>;
  };
  kpiDetails?: {
    field: string;
    rawValue: string;
    category: string;
    numericValue?: number;
    unit: string;
  };
  maintenanceHistory?: {
    date?: string;
    equipment: string;
    type: string;
    status: string;
    costInr?: number;
    technician?: string;
    durationHrs?: number;
    notes?: string;
  }[];
  generatorSeries: {
    name: string;
    color: string;
    data: (number | null)[];
  }[];
  timeSeries: {
    timestamp: string;
    values: Record<string, number | null>;
  }[];
  distribution: {
    bins: { label: string; min: number; max: number; count: number }[];
    stats: {
      min: number;
      max: number;
      avg: number;
      median?: number;
      stdDev?: number;
      totalRecords: number;
      lowCount: number;
      normalCount: number;
      highCount: number;
      lowPercent: number;
      normalPercent: number;
      highPercent: number;
    };
  };
  alarms: {
    id: string;
    timestamp: string;
    equipment: string;
    actualValue: number;
    thresholdValue: number;
    thresholdType: 'HIGH' | 'LOW';
    severity: AlarmLevel;
    message: string;
    isAcknowledged: boolean;
  }[];
}

export interface AlarmAnalyticsPayload {
  timeline: { timestamp: string; count: number; critical: number; warning: number }[];
  bySeverity: { severity: string; count: number; color: string }[];
  byType: { type: string; count: number }[];
  byEquipment: { equipment: string; count: number }[];
  durationStats: { avgMinutes: number; maxMinutes: number; totalMinutes: number };
  valuesByUnit: {
    unit: string;
    metricType: string;
    alarms: { timestamp: string; equipment: string; alarm: string; value: number; unit: string }[];
  }[];
}

export interface DatasetMetricsOverview {
  datasetId: string;
  datasetName: string;
  detectedMetrics: MetricDefinition[];
  metricsData: Record<string, MetricAnalyticsPayload>;
  alarmAnalytics?: AlarmAnalyticsPayload;
  isReportFormat: boolean;
  isAlarmDataset: boolean;
  reportSummary?: {
    kpiCount: number;
    alarmCount: number;
    maintenanceCount: number;
    anomalyCount: number;
    totalMaintenanceCostInr?: number;
    metaInfo?: Record<string, string>;
  };
}

