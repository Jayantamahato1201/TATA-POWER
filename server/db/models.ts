import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// 1. User Schema & Model
// ==========================================
export interface IUserDoc extends Document {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STAFF' | 'VIEWER';
  passwordHash?: string;
  department?: string;
  designation?: string;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

const UserSchema = new Schema<IUserDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'STAFF', 'VIEWER'], default: 'STAFF' },
    passwordHash: { type: String },
    department: { type: String },
    designation: { type: String },
    permissions: [{ type: String }],
    createdAt: { type: String, default: () => new Date().toISOString() },
    lastLogin: { type: String },
  },
  { collection: 'users', timestamps: true }
);

// ==========================================
// 2. Dataset Schema & Model
// ==========================================
export interface IDatasetDoc extends Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'xls' | 'xlsx';
  category: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: any[];
  detectedMetrics?: string[];
  dateColumn?: string;
  timeColumn?: string;
  equipmentColumn?: string;
  description?: string;
  isArchived?: boolean;
  status?: 'ACTIVE' | 'ARCHIVED' | 'PROCESSING' | 'ERROR';
  updatedAt: string;
}

const DatasetSchema = new Schema<IDatasetDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    fileType: { type: String, enum: ['csv', 'xls', 'xlsx'], default: 'csv' },
    category: { type: String, default: 'Plant Telemetry' },
    uploadedBy: { type: String, required: true },
    uploadedByEmail: { type: String, required: true },
    uploadedAt: { type: String, default: () => new Date().toISOString(), index: true },
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 },
    columns: [{ type: Schema.Types.Mixed }],
    detectedMetrics: [{ type: String }],
    dateColumn: { type: String },
    timeColumn: { type: String },
    equipmentColumn: { type: String },
    description: { type: String },
    isArchived: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'PROCESSING', 'ERROR'], default: 'ACTIVE' },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'datasets', timestamps: true }
);

// ==========================================
// 3. DataRecord Schema & Model
// ==========================================
export interface IDataRecordDoc extends Document {
  id: string;
  datasetId: string;
  rowIndex: number;
  timestamp?: string;
  equipmentId?: string;
  data: Record<string, any>;
  createdAt: string;
}

const DataRecordSchema = new Schema<IDataRecordDoc>(
  {
    id: { type: String, required: true, index: true },
    datasetId: { type: String, required: true, index: true },
    rowIndex: { type: Number, required: true },
    timestamp: { type: String, index: true },
    equipmentId: { type: String, index: true },
    data: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'records' }
);

// Compound indexes for high performance querying & duplicate prevention
DataRecordSchema.index({ id: 1 }, { unique: true });
DataRecordSchema.index({ datasetId: 1, rowIndex: 1 });
DataRecordSchema.index({ datasetId: 1, timestamp: -1 });
DataRecordSchema.index({ datasetId: 1, equipmentId: 1 });

// ==========================================
// 4. AlarmRule Schema & Model
// ==========================================
export interface IAlarmRuleDoc extends Document {
  id: string;
  name: string;
  datasetId?: string;
  metricColumn: string;
  equipmentScope: string;
  condition: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ' | 'BETWEEN' | 'OUTSIDE';
  thresholdValue: number;
  secondaryThreshold?: number;
  alarmLevel: 'LOW' | 'NORMAL' | 'WARNING' | 'CRITICAL';
  customColor: string;
  priority: number;
  messageTemplate: string;
  isEnabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const AlarmRuleSchema = new Schema<IAlarmRuleDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    datasetId: { type: String, index: true },
    metricColumn: { type: String, required: true, index: true },
    equipmentScope: { type: String, default: 'ALL' },
    condition: {
      type: String,
      enum: ['GT', 'LT', 'GTE', 'LTE', 'EQ', 'NEQ', 'BETWEEN', 'OUTSIDE'],
      default: 'GT',
    },
    thresholdValue: { type: Number, required: true },
    secondaryThreshold: { type: Number },
    alarmLevel: {
      type: String,
      enum: ['LOW', 'NORMAL', 'WARNING', 'CRITICAL'],
      default: 'WARNING',
    },
    customColor: { type: String, default: '#EF4444' },
    priority: { type: Number, default: 1 },
    messageTemplate: { type: String, required: true },
    isEnabled: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'alarm_rules', timestamps: true }
);

// ==========================================
// 5. AlarmEvent (Alerts/Incidents) Schema & Model
// ==========================================
export interface IAlarmEventDoc extends Document {
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
  condition: string;
  equipmentId?: string;
  alarmLevel: 'CRITICAL' | 'HIGH' | 'WARNING' | 'NORMAL' | 'INFO';
  color: string;
  message: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CLEARED';
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

const AlarmEventSchema = new Schema<IAlarmEventDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ruleId: { type: String, required: true, index: true },
    ruleName: { type: String, default: 'Alarm Rule' },
    datasetId: { type: String, required: true, index: true },
    datasetName: { type: String, default: 'Telemetry Dataset' },
    recordId: { type: String, index: true },
    timestamp: { type: String, required: true, index: true },
    metricColumn: { type: String, required: true, index: true },
    actualValue: { type: Number, required: true },
    thresholdValue: { type: Number, required: true },
    condition: { type: String, default: 'GT' },
    equipmentId: { type: String, index: true },
    alarmLevel: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'WARNING', 'NORMAL', 'INFO'],
      default: 'WARNING',
    },
    color: { type: String, default: '#EF4444' },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CLEARED'],
      default: 'ACTIVE',
      index: true,
    },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: String },
    resolvedBy: { type: String },
    resolvedAt: { type: String },
    resolutionNotes: { type: String },
    clearedBy: { type: String },
    clearedAt: { type: String },
    assignedTo: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String },
  },
  { collection: 'alarm_events', timestamps: true }
);

AlarmEventSchema.index({ datasetId: 1, status: 1 });
AlarmEventSchema.index({ status: 1, timestamp: -1 });

// ==========================================
// 6. Metric Configuration Schema & Model
// ==========================================
export interface IMetricConfigDoc extends Document {
  metricKey: string;
  id?: string;
  datasetId?: string;
  key?: string;
  name?: string;
  unit?: string;
  category?: string;
  isCustom?: boolean;
  dataType?: string;
  colorScheme?: any;
  thresholds?: {
    low?: number;
    normalMin?: number;
    normalMax?: number;
    warning?: number;
    critical?: number;
  };
  isAlarmEnabled?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

const MetricConfigSchema = new Schema<IMetricConfigDoc>(
  {
    metricKey: { type: String, required: true, unique: true, index: true },
    id: { type: String },
    datasetId: { type: String, index: true },
    key: { type: String },
    name: { type: String },
    unit: { type: String },
    category: { type: String },
    isCustom: { type: Boolean, default: false },
    dataType: { type: String, default: 'numeric' },
    colorScheme: { type: Schema.Types.Mixed },
    thresholds: {
      low: { type: Number },
      normalMin: { type: Number },
      normalMax: { type: Number },
      warning: { type: Number },
      critical: { type: Number },
    },
    isAlarmEnabled: { type: Boolean, default: true },
    description: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'metric_configs', timestamps: true }
);

// ==========================================
// 7. Temperature Threshold Config Schema & Model
// ==========================================
export interface ITemperatureConfigDoc extends Document {
  id: string;
  datasetId?: string;
  metricColumn: string;
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
  defaultViewMode: 'surface' | 'heat' | 'mesh' | 'points';
  enableMonitoring: boolean;
  enableAboveAlarm: boolean;
  enableBelowAlarm: boolean;
  showAlarmsOnDashboard: boolean;
  alarmDisplayPosition: 'top_banner' | 'below_graph' | 'sidebar';
  showAlarmCount: boolean;
  playAlarmSound: boolean;
  requireAcknowledgement: boolean;
  enableAutoResolve: boolean;
  aboveAlarmSeverity: 'CRITICAL' | 'WARNING' | 'INFO';
  belowAlarmSeverity: 'CRITICAL' | 'WARNING' | 'INFO';
  updatedAt: string;
  updatedBy: string;
}

const TemperatureConfigSchema = new Schema<ITemperatureConfigDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    datasetId: { type: String, index: true },
    metricColumn: { type: String, default: 'temperature' },
    belowThreshold: { type: Number, default: 20 },
    normalMin: { type: Number, default: 20 },
    normalMax: { type: Number, default: 30 },
    aboveThreshold: { type: Number, default: 30 },
    belowLabel: { type: String, default: 'BELOW TEMPERATURE' },
    normalLabel: { type: String, default: 'NORMAL TEMPERATURE' },
    aboveLabel: { type: String, default: 'ABOVE TEMPERATURE' },
    belowColor: { type: String, default: '#06B6D4' },
    normalColor: { type: String, default: '#00FF41' },
    aboveColor: { type: String, default: '#EF4444' },
    belowOpacity: { type: Number, default: 0.85 },
    normalOpacity: { type: Number, default: 0.85 },
    aboveOpacity: { type: Number, default: 0.9 },
    isEnabled: { type: Boolean, default: true },
    unit: { type: String, default: '°C' },
    surfaceResolution: { type: Number, default: 40 },
    showGrid3D: { type: Boolean, default: true },
    showPoints3D: { type: Boolean, default: true },
    showMesh3D: { type: Boolean, default: true },
    wireframe: { type: Boolean, default: false },
    verticalScale: { type: Number, default: 1.0 },
    defaultViewMode: { type: String, default: 'surface' },
    enableMonitoring: { type: Boolean, default: true },
    enableAboveAlarm: { type: Boolean, default: true },
    enableBelowAlarm: { type: Boolean, default: true },
    showAlarmsOnDashboard: { type: Boolean, default: true },
    alarmDisplayPosition: { type: String, default: 'below_graph' },
    showAlarmCount: { type: Boolean, default: true },
    playAlarmSound: { type: Boolean, default: false },
    requireAcknowledgement: { type: Boolean, default: true },
    enableAutoResolve: { type: Boolean, default: false },
    aboveAlarmSeverity: { type: String, default: 'CRITICAL' },
    belowAlarmSeverity: { type: String, default: 'WARNING' },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    updatedBy: { type: String, default: 'admin@tatapower.com' },
  },
  { collection: 'temperature_configs', timestamps: true }
);

// ==========================================
// 8. ChartConfig Schema & Model
// ==========================================
export interface IChartConfigDoc extends Document {
  id: string;
  title: string;
  chartType: 'line' | 'bar' | 'area' | 'scatter' | 'histogram' | 'gauge' | 'pie' | 'surface3d';
  datasetId: string;
  xAxisColumn: string;
  yAxisColumns: string[];
  aggregation?: string;
  unit?: string;
  colorPalette?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showToolbox?: boolean;
  showDataZoom?: boolean;
  thresholdLines?: any[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

const ChartConfigSchema = new Schema<IChartConfigDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    chartType: { type: String, required: true },
    datasetId: { type: String, required: true, index: true },
    xAxisColumn: { type: String, required: true },
    yAxisColumns: [{ type: String }],
    aggregation: { type: String, default: 'none' },
    unit: { type: String },
    colorPalette: [{ type: String }],
    showLegend: { type: Boolean, default: true },
    showGrid: { type: Boolean, default: true },
    showToolbox: { type: Boolean, default: true },
    showDataZoom: { type: Boolean, default: true },
    thresholdLines: [{ type: Schema.Types.Mixed }],
    isDefault: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'chart_configs', timestamps: true }
);

// ==========================================
// 9. DashboardLayout Schema & Model
// ==========================================
export interface IDashboardLayoutDoc extends Document {
  id: string;
  userId?: string;
  name: string;
  isDefault: boolean;
  widgets: any[];
  updatedAt: string;
}

const DashboardLayoutSchema = new Schema<IDashboardLayoutDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    name: { type: String, default: 'Executive Command Center Layout' },
    isDefault: { type: Boolean, default: false },
    widgets: [{ type: Schema.Types.Mixed }],
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'dashboard_layouts', timestamps: true }
);

// ==========================================
// 10. ActivityLog Schema & Model
// ==========================================
export interface IActivityLogDoc extends Document {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  entityType: string;
  entityId?: string;
  timestamp: string;
}

const ActivityLogSchema = new Schema<IActivityLogDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    timestamp: { type: String, default: () => new Date().toISOString(), index: true },
  },
  { collection: 'activity_logs', timestamps: true }
);

// ==========================================
// 11. SystemConfig Schema & Model (Master Alarm toggle, Admin Settings)
// ==========================================
export interface ISystemConfigDoc extends Document {
  key: string;
  value: any;
  updatedAt: string;
}

const SystemConfigSchema = new Schema<ISystemConfigDoc>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'system_configs', timestamps: true }
);

// Re-use or compile models safely (prevent overwrite model error in serverless environments)
export const UserModel: Model<IUserDoc> = mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);
export const DatasetModel: Model<IDatasetDoc> = mongoose.models.Dataset || mongoose.model<IDatasetDoc>('Dataset', DatasetSchema);
export const RecordModel: Model<IDataRecordDoc> = mongoose.models.DataRecord || mongoose.model<IDataRecordDoc>('DataRecord', DataRecordSchema);
export const AlarmRuleModel: Model<IAlarmRuleDoc> = mongoose.models.AlarmRule || mongoose.model<IAlarmRuleDoc>('AlarmRule', AlarmRuleSchema);
export const AlarmEventModel: Model<IAlarmEventDoc> = mongoose.models.AlarmEvent || mongoose.model<IAlarmEventDoc>('AlarmEvent', AlarmEventSchema);
export const MetricConfigModel: Model<IMetricConfigDoc> = mongoose.models.MetricConfig || mongoose.model<IMetricConfigDoc>('MetricConfig', MetricConfigSchema);
export const TemperatureConfigModel: Model<ITemperatureConfigDoc> = mongoose.models.TemperatureConfig || mongoose.model<ITemperatureConfigDoc>('TemperatureConfig', TemperatureConfigSchema);
export const ChartConfigModel: Model<IChartConfigDoc> = mongoose.models.ChartConfig || mongoose.model<IChartConfigDoc>('ChartConfig', ChartConfigSchema);
export const DashboardLayoutModel: Model<IDashboardLayoutDoc> = mongoose.models.DashboardLayout || mongoose.model<IDashboardLayoutDoc>('DashboardLayout', DashboardLayoutSchema);
export const ActivityLogModel: Model<IActivityLogDoc> = mongoose.models.ActivityLog || mongoose.model<IActivityLogDoc>('ActivityLog', ActivityLogSchema);
export const SystemConfigModel: Model<ISystemConfigDoc> = mongoose.models.SystemConfig || mongoose.model<ISystemConfigDoc>('SystemConfig', SystemConfigSchema);

// ==========================================
// 12. Idempotency Record Schema & Model (Multi-instance / Serverless TTL)
// ==========================================
export interface IIdempotencyRecordDoc extends Document {
  key: string;
  datasetId: string;
  result: any;
  createdAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecordDoc>(
  {
    key: { type: String, required: true, unique: true, index: true },
    datasetId: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now, expires: 86400 }, // 24-hour TTL in MongoDB
  },
  { collection: 'idempotency_records' }
);

export const IdempotencyRecordModel: Model<IIdempotencyRecordDoc> =
  mongoose.models.IdempotencyRecord ||
  mongoose.model<IIdempotencyRecordDoc>('IdempotencyRecord', IdempotencyRecordSchema);

