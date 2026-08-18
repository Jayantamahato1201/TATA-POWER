import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  Dataset,
  DataRecord,
  AlarmRule,
  AlarmEvent,
  ChartConfig,
  DashboardLayout,
  ActivityLog,
  TemperatureThresholdConfig,
  MetricDefinition,
  MetricThresholdConfig,
} from '../types/index.js';
import { connectToDatabase, isMongoConnected } from './connection.js';
import {
  UserModel,
  DatasetModel,
  RecordModel,
  AlarmRuleModel,
  AlarmEventModel,
  MetricConfigModel,
  TemperatureConfigModel,
  ChartConfigModel,
  DashboardLayoutModel,
  ActivityLogModel,
  SystemConfigModel,
  IdempotencyRecordModel,
} from './models.js';
import { migrateJsonToMongo } from './migration.js';

interface DatabaseSchema {
  users: User[];
  datasets: Dataset[];
  records: DataRecord[];
  alarmRules: AlarmRule[];
  alarmEvents: AlarmEvent[];
  chartConfigs: ChartConfig[];
  dashboardLayouts: DashboardLayout[];
  activityLogs: ActivityLog[];
  temperatureConfigs: TemperatureThresholdConfig[];
  metricConfigs?: Record<string, Partial<MetricDefinition>>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tatapower_database.json');

export class MongoDatabase {
  private data: DatabaseSchema;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private saveTimeout: NodeJS.Timeout | null = null;
  private masterAlarmEnabled = true;

  constructor() {
    // Initial local in-memory structure
    this.data = this.loadLocalFallback();
    // Non-blocking initialization of MongoDB
    this.init().catch((err) => {
      console.warn('[MongoDB] Database init warning:', err.message);
    });
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const mongo = await connectToDatabase();
        if (mongo && isMongoConnected()) {
          console.info('[MongoDB] Syncing runtime state from MongoDB Atlas...');

          // Run one-time migration if Mongo is fresh and not yet initialized
          const initConfig = await SystemConfigModel.findOne({ key: 'system_initialized' });
          if (!initConfig) {
            const existingCount = await DatasetModel.countDocuments();
            if (existingCount === 0 && fs.existsSync(DB_FILE)) {
              await migrateJsonToMongo();
            } else {
              await SystemConfigModel.findOneAndUpdate(
                { key: 'system_initialized' },
                { key: 'system_initialized', value: true, initializedAt: new Date().toISOString() },
                { upsert: true }
              );
            }
          }

          // Hydrate in-memory cache directly from MongoDB Atlas
          await this.hydrateFromMongo();
          console.info(
            `[MongoDB] Synchronized ${this.data.datasets.length} datasets, ${this.data.records.length} records, ${this.data.alarmRules.length} alarm rules, and ${this.data.alarmEvents.length} alarm events from MongoDB Atlas.`
          );
        }
      } catch (err: any) {
        console.warn('[MongoDB] Init connection issue (using local fallback):', err.message);
      } finally {
        this.isInitialized = true;
      }
    })();

    return this.initPromise;
  }

  private async hydrateFromMongo(): Promise<void> {
    try {
      const [
        usersDocs,
        datasetsDocs,
        recordsDocs,
        alarmRulesDocs,
        alarmEventsDocs,
        metricConfigsDocs,
        tempConfigsDocs,
        chartConfigsDocs,
        layoutsDocs,
        logsDocs,
        masterAlarmConfigDoc,
      ] = await Promise.all([
        UserModel.find({}).lean(),
        DatasetModel.find({}).lean(),
        RecordModel.find({}).lean(),
        AlarmRuleModel.find({}).lean(),
        AlarmEventModel.find({}).lean(),
        MetricConfigModel.find({}).lean(),
        TemperatureConfigModel.find({}).lean(),
        ChartConfigModel.find({}).lean(),
        DashboardLayoutModel.find({}).lean(),
        ActivityLogModel.find({}).sort({ timestamp: -1 }).limit(500).lean(),
        SystemConfigModel.findOne({ key: 'masterAlarmEnabled' }).lean(),
      ]);

      if (usersDocs.length > 0) {
        this.data.users = usersDocs.map((u: any) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: u.passwordHash,
          department: u.department,
          designation: u.designation,
          permissions: u.permissions || [],
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
        }));
      }

      if (datasetsDocs.length > 0) {
        this.data.datasets = datasetsDocs.map((d: any) => ({
          id: d.id,
          name: d.name,
          fileName: d.fileName,
          fileSize: d.fileSize,
          fileType: d.fileType,
          category: d.category,
          uploadedBy: d.uploadedBy,
          uploadedByEmail: d.uploadedByEmail,
          uploadedAt: d.uploadedAt,
          totalRows: d.totalRows,
          validRows: d.validRows,
          invalidRows: d.invalidRows,
          columns: d.columns || [],
          detectedMetrics: d.detectedMetrics || [],
          dateColumn: d.dateColumn,
          timeColumn: d.timeColumn,
          equipmentColumn: d.equipmentColumn,
          description: d.description,
          isArchived: d.isArchived,
          status: d.status,
          updatedAt: d.updatedAt,
        }));
      } else {
        this.data.datasets = [];
      }

      const validDatasetIds = new Set(this.data.datasets.map((d) => d.id));
      if (recordsDocs.length > 0) {
        this.data.records = recordsDocs
          .filter((r: any) => validDatasetIds.has(r.datasetId))
          .map((r: any) => ({
            id: r.id,
            datasetId: r.datasetId,
            rowIndex: r.rowIndex,
            timestamp: r.timestamp,
            equipmentId: r.equipmentId,
            data: r.data || {},
            createdAt: r.createdAt,
          }));
      } else {
        this.data.records = [];
      }

      if (alarmRulesDocs.length > 0) {
        this.data.alarmRules = alarmRulesDocs.map((r: any) => ({
          id: r.id,
          name: r.name,
          datasetId: r.datasetId,
          metricColumn: r.metricColumn,
          equipmentScope: r.equipmentScope || 'ALL',
          condition: r.condition,
          thresholdValue: r.thresholdValue,
          secondaryThreshold: r.secondaryThreshold,
          alarmLevel: r.alarmLevel,
          customColor: r.customColor || '#EF4444',
          priority: r.priority || 1,
          messageTemplate: r.messageTemplate,
          isEnabled: r.isEnabled !== false,
          createdBy: r.createdBy,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }

      if (alarmEventsDocs.length > 0) {
        const seenIds = new Set<string>();
        const mappedEvents: AlarmEvent[] = [];
        for (const e of alarmEventsDocs as any[]) {
          if (e.id && seenIds.has(e.id)) continue;
          if (e.id) seenIds.add(e.id);
          mappedEvents.push({
            id: e.id,
            ruleId: e.ruleId,
            ruleName: e.ruleName || 'Alarm Rule',
            datasetId: e.datasetId,
            datasetName: e.datasetName || 'Telemetry Dataset',
            recordId: e.recordId,
            timestamp: e.timestamp,
            metricColumn: e.metricColumn || e.metricName,
            actualValue: e.actualValue !== undefined ? e.actualValue : (e.value || 0),
            thresholdValue: e.thresholdValue !== undefined ? e.thresholdValue : (e.thresholdViolated || 0),
            condition: e.condition || 'GT',
            equipmentId: e.equipmentId,
            alarmLevel: e.alarmLevel || e.level || 'WARNING',
            color: e.color || '#EF4444',
            message: e.message,
            status: (e.status || 'ACTIVE') as any,
            acknowledgedBy: e.acknowledgedBy,
            acknowledgedAt: e.acknowledgedAt,
            resolvedBy: e.resolvedBy,
            resolvedAt: e.resolvedAt,
            resolutionNotes: e.resolutionNotes,
            assignedTo: e.assignedTo,
            createdAt: e.createdAt,
          });
        }
        this.data.alarmEvents = mappedEvents;
      }

      if (metricConfigsDocs.length > 0) {
        this.data.metricConfigs = {};
        for (const m of metricConfigsDocs) {
          const { _id, __v, metricKey, ...cleanConfig } = m as any;
          this.data.metricConfigs[metricKey] = cleanConfig;
        }
      }

      if (tempConfigsDocs.length > 0) {
        this.data.temperatureConfigs = tempConfigsDocs.map((t: any) => {
          const { _id, __v, ...clean } = t;
          return clean;
        });
      }

      if (chartConfigsDocs.length > 0) {
        this.data.chartConfigs = chartConfigsDocs.map((c: any) => {
          const { _id, __v, ...clean } = c;
          return clean;
        });
      }

      if (layoutsDocs.length > 0) {
        this.data.dashboardLayouts = layoutsDocs.map((l: any) => {
          const { _id, __v, ...clean } = l;
          return clean;
        });
      }

      if (logsDocs.length > 0) {
        this.data.activityLogs = logsDocs.map((log: any) => {
          const { _id, __v, ...clean } = log;
          return clean;
        });
      }

      if (masterAlarmConfigDoc) {
        this.masterAlarmEnabled = masterAlarmConfigDoc.value !== false;
      }
    } catch (err: any) {
      console.error('[MongoDB] Error hydrating state from MongoDB:', err.message);
    }
  }

  private loadLocalFallback(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        // Deduplicate alarm events from local file
        const rawEvents = parsed.alarmEvents || [];
        const seenEventIds = new Set<string>();
        const dedupedEvents: AlarmEvent[] = [];
        for (const e of rawEvents) {
          if (!e.id || seenEventIds.has(e.id)) continue;
          seenEventIds.add(e.id);
          dedupedEvents.push(e);
        }

        // Deduplicate datasets
        const rawDatasets = parsed.datasets || [];
        const seenDsIds = new Set<string>();
        const dedupedDatasets: Dataset[] = [];
        for (const d of rawDatasets) {
          if (!d.id || seenDsIds.has(d.id)) continue;
          seenDsIds.add(d.id);
          dedupedDatasets.push(d);
        }

        // Deduplicate alarm rules
        const rawRules = parsed.alarmRules || [];
        const seenRuleIds = new Set<string>();
        const dedupedRules: AlarmRule[] = [];
        for (const r of rawRules) {
          if (!r.id || seenRuleIds.has(r.id)) continue;
          seenRuleIds.add(r.id);
          dedupedRules.push(r);
        }

        return {
          users: parsed.users || [],
          datasets: dedupedDatasets,
          records: parsed.records || [],
          alarmRules: dedupedRules,
          alarmEvents: dedupedEvents,
          chartConfigs: parsed.chartConfigs || [],
          dashboardLayouts: parsed.dashboardLayouts || [],
          activityLogs: parsed.activityLogs || [],
          temperatureConfigs: parsed.temperatureConfigs || [],
          metricConfigs: parsed.metricConfigs || {},
        };
      } catch (err) {
        console.error('Error loading fallback database file:', err);
      }
    }

    return this.getInitialSeed();
  }

  private getInitialSeed(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('TataAdmin2026!', salt);
    const staffPasswordHash = bcrypt.hashSync('TataStaff2026!', salt);
    const viewerPasswordHash = bcrypt.hashSync('TataViewer2026!', salt);

    const users: User[] = [
      {
        id: 'usr_admin_01',
        email: 'admin@tatapower.com',
        name: 'Command Center Lead Administrator',
        role: 'ADMIN',
        passwordHash: adminPasswordHash,
        department: 'Jamshedpur Intelligent Operations Center',
        designation: 'Chief Operational Technologist',
        permissions: [
          'VIEW_DASHBOARD',
          'UPLOAD_DATA',
          'DOWNLOAD_DATA',
          'MANAGE_RULES',
          'ACKNOWLEDGE_ALARMS',
          'RESOLVE_ALARMS',
          'MANAGE_WIDGETS',
          'MANAGE_USERS',
          'SYSTEM_CONFIG',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_staff_01',
        email: 'operator@tatapower.com',
        name: 'Jojobera Control Room Engineer',
        role: 'STAFF',
        passwordHash: staffPasswordHash,
        department: 'Jojobera Thermal Power Station',
        designation: 'Senior Plant Operations Specialist',
        permissions: [
          'VIEW_DASHBOARD',
          'UPLOAD_DATA',
          'DOWNLOAD_DATA',
          'VIEW_ALARMS',
          'ACKNOWLEDGE_ALARMS',
          'RESOLVE_ALARMS',
          'VIEW_REPORTS',
        ],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'usr_viewer_01',
        email: 'viewer@tatapower.com',
        name: 'Technical Auditor',
        role: 'VIEWER',
        passwordHash: viewerPasswordHash,
        department: 'Operations & Reliability',
        designation: 'Operations Analyst',
        permissions: ['VIEW_DASHBOARD', 'VIEW_ALARMS', 'DOWNLOAD_DATA', 'VIEW_REPORTS'],
        createdAt: new Date().toISOString(),
      },
    ];

    const alarmRules: AlarmRule[] = [
      {
        id: 'rule_temp_crit',
        name: 'Critical High Temperature Alarm',
        metricColumn: 'temperature',
        equipmentScope: 'ALL',
        condition: 'GT',
        thresholdValue: 30,
        alarmLevel: 'CRITICAL',
        customColor: '#EF4444',
        priority: 1,
        messageTemplate: 'Temperature exceeded critical limit of {{threshold}}°C (Actual: {{value}}°C) on {{equipment}}',
        isEnabled: true,
        createdBy: 'admin@tatapower.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rule_temp_warn',
        name: 'High Temperature Advisory Warning',
        metricColumn: 'temperature',
        equipmentScope: 'ALL',
        condition: 'BETWEEN',
        thresholdValue: 26,
        secondaryThreshold: 30,
        alarmLevel: 'WARNING',
        customColor: '#F59E0B',
        priority: 2,
        messageTemplate: 'Temperature operating in warning band [{{threshold}}°C - {{secondary}}°C] on {{equipment}}',
        isEnabled: true,
        createdBy: 'admin@tatapower.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const defaultLayout: DashboardLayout = {
      id: 'default_layout',
      isDefault: true,
      name: 'Executive Command Center Layout',
      widgets: [
        {
          id: 'w_kpi_overview',
          title: 'Operational Status & KPI Metrics',
          type: 'kpi',
          position: { x: 0, y: 0, w: 12, h: 2 },
          isVisible: true,
        },
        {
          id: 'w_main_trend',
          title: 'Live Operational Parameter Trends',
          type: 'chart',
          position: { x: 0, y: 2, w: 8, h: 4 },
          isVisible: true,
        },
        {
          id: 'w_alarm_summary',
          title: 'Active Alarms & Threshold Events',
          type: 'alarm_panel',
          position: { x: 8, y: 2, w: 4, h: 4 },
          isVisible: true,
        },
        {
          id: 'w_equipment_comp',
          title: 'Equipment Performance Matrix',
          type: 'equipment_summary',
          position: { x: 0, y: 6, w: 6, h: 4 },
          isVisible: true,
        },
        {
          id: 'w_smart_insights',
          title: 'Calculated Intelligent Operational Insights',
          type: 'insight_panel',
          position: { x: 6, y: 6, w: 6, h: 4 },
          isVisible: true,
        },
        {
          id: 'w_recent_records',
          title: 'Ingested Sensor Telemetry Stream',
          type: 'recent_data_table',
          position: { x: 0, y: 10, w: 12, h: 4 },
          isVisible: true,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const defaultTempConfig: TemperatureThresholdConfig = {
      id: 'default_temp_config',
      metricColumn: 'temperature',
      belowThreshold: 20,
      normalMin: 20,
      normalMax: 30,
      aboveThreshold: 30,
      belowLabel: 'BELOW TEMPERATURE',
      normalLabel: 'NORMAL TEMPERATURE',
      aboveLabel: 'ABOVE TEMPERATURE',
      belowColor: '#06B6D4',
      normalColor: '#00FF41',
      aboveColor: '#EF4444',
      belowOpacity: 0.85,
      normalOpacity: 0.85,
      aboveOpacity: 0.9,
      isEnabled: true,
      unit: '°C',
      surfaceResolution: 40,
      showGrid3D: true,
      showPoints3D: true,
      showMesh3D: true,
      wireframe: false,
      verticalScale: 1.0,
      defaultViewMode: 'surface',
      enableMonitoring: true,
      enableAboveAlarm: true,
      enableBelowAlarm: true,
      showAlarmsOnDashboard: true,
      alarmDisplayPosition: 'below_graph',
      showAlarmCount: true,
      playAlarmSound: false,
      requireAcknowledgement: true,
      enableAutoResolve: false,
      aboveAlarmSeverity: 'CRITICAL',
      belowAlarmSeverity: 'WARNING',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin@tatapower.com',
    };

    return {
      users,
      datasets: [],
      records: [],
      alarmRules,
      alarmEvents: [],
      chartConfigs: [],
      dashboardLayouts: [defaultLayout],
      temperatureConfigs: [defaultTempConfig],
      activityLogs: [
        {
          id: 'log_seed_init',
          userId: 'usr_admin_01',
          userName: 'Command Center Lead Administrator',
          userEmail: 'admin@tatapower.com',
          action: 'SYSTEM_INITIALIZATION',
          details: 'Initialized Tata Power Jamshedpur Intelligent Operations Command Center database.',
          entityType: 'SYSTEM',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  // Backup write to local file for resilience
  private saveFallbackLocal() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const tmpPath = `${DB_FILE}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
        fs.renameSync(tmpPath, DB_FILE);
      } catch (err) {
        // In read-only serverless environments (e.g. Vercel), fall back to /tmp
        try {
          const tmpTmp = '/tmp/tatapower_database.json.tmp';
          const tmpFinal = '/tmp/tatapower_database.json';
          fs.writeFileSync(tmpTmp, JSON.stringify(this.data, null, 2), 'utf-8');
          fs.renameSync(tmpTmp, tmpFinal);
        } catch (tmpErr) {
          // In-memory runtime state is maintained
        }
      }
      this.saveTimeout = null;
    }, 150);
  }

  // ==========================================
  // MASTER ALARM SYSTEM
  // ==========================================
  public getMasterAlarmStatus(): boolean {
    return this.masterAlarmEnabled;
  }

  public async setMasterAlarmStatus(enabled: boolean): Promise<boolean> {
    this.masterAlarmEnabled = enabled;
    if (isMongoConnected()) {
      try {
        await SystemConfigModel.findOneAndUpdate(
          { key: 'masterAlarmEnabled' },
          { key: 'masterAlarmEnabled', value: enabled, updatedAt: new Date().toISOString() },
          { upsert: true }
        );
      } catch (err: any) {
        console.error('[MongoDB] Failed to update masterAlarmEnabled:', err.message);
      }
    }
    this.saveFallbackLocal();
    return this.masterAlarmEnabled;
  }

  // ==========================================
  // USERS
  // ==========================================
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public async addUser(user: User): Promise<User> {
    const idx = this.data.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      this.data.users[idx] = user;
    } else {
      this.data.users.push(user);
    }

    if (isMongoConnected()) {
      try {
        await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true, new: true });
      } catch (err: any) {
        console.error('[MongoDB] Error inserting user:', err.message);
      }
    }
    this.saveFallbackLocal();
    return user;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };

    if (isMongoConnected()) {
      try {
        await UserModel.findOneAndUpdate({ id }, { $set: updates });
      } catch (err: any) {
        console.error('[MongoDB] Error updating user:', err.message);
      }
    }
    this.saveFallbackLocal();
    return this.data.users[idx];
  }

  public async deleteUser(id: string): Promise<boolean> {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);

    if (isMongoConnected()) {
      try {
        await UserModel.deleteOne({ id });
      } catch (err: any) {
        console.error('[MongoDB] Error deleting user:', err.message);
      }
    }
    this.saveFallbackLocal();
    return true;
  }

  // ==========================================
  // DATASETS
  // ==========================================
  public getDatasets(): Dataset[] {
    return this.data.datasets;
  }

  public getDatasetById(id: string): Dataset | undefined {
    return this.data.datasets.find((d) => d.id === id);
  }

  public async addDataset(dataset: Dataset): Promise<Dataset> {
    const idx = this.data.datasets.findIndex((d) => d.id === dataset.id);
    if (idx >= 0) {
      this.data.datasets[idx] = dataset;
    } else {
      this.data.datasets.push(dataset);
    }

    if (isMongoConnected()) {
      try {
        await DatasetModel.findOneAndUpdate({ id: dataset.id }, dataset, { upsert: true, new: true });
      } catch (err: any) {
        console.error('[MongoDB] Error saving dataset to MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return dataset;
  }

  public async updateDataset(id: string, updates: Partial<Dataset>): Promise<Dataset | undefined> {
    const idx = this.data.datasets.findIndex((d) => d.id === id);
    let current = idx !== -1 ? this.data.datasets[idx] : undefined;
    const now = new Date().toISOString();
    const updatedMeta = { ...updates, updatedAt: now };

    if (current) {
      this.data.datasets[idx] = { ...current, ...updatedMeta };
      current = this.data.datasets[idx];
    }

    if (isMongoConnected()) {
      try {
        const doc = await DatasetModel.findOneAndUpdate(
          { id },
          { $set: updatedMeta },
          { new: true }
        ).lean();
        if (doc && !current) {
          current = doc as any;
          this.data.datasets.push(current!);
        }
      } catch (err: any) {
        console.error('[MongoDB] Error updating dataset in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return current;
  }

  public async deleteDataset(id: string): Promise<boolean> {
    const idx = this.data.datasets.findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.data.datasets.splice(idx, 1);
    }
    this.data.records = this.data.records.filter((r) => r.datasetId !== id);
    this.data.alarmEvents = this.data.alarmEvents.filter((a) => a.datasetId !== id);
    this.data.chartConfigs = this.data.chartConfigs.filter((c) => c.datasetId !== id);
    if (this.data.temperatureConfigs) {
      this.data.temperatureConfigs = this.data.temperatureConfigs.filter((t) => t.datasetId !== id);
    }

    if (isMongoConnected()) {
      try {
        await Promise.all([
          DatasetModel.deleteOne({ id }),
          RecordModel.deleteMany({ datasetId: id }),
          AlarmEventModel.deleteMany({ datasetId: id }),
          ChartConfigModel.deleteMany({ datasetId: id }),
          TemperatureConfigModel.deleteMany({ datasetId: id }),
          IdempotencyRecordModel.deleteMany({ datasetId: id }),
        ]);
        console.info(`[MongoDB] Successfully deleted dataset "${id}" and all associated records permanently.`);
      } catch (err: any) {
        console.error('[MongoDB] Error deleting dataset resources in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return true;
  }

  public async clearAllDatasets(): Promise<{ deletedDatasets: number; deletedRecords: number }> {
    const deletedDatasets = this.data.datasets.length;
    const deletedRecords = this.data.records.length;
    this.data.datasets = [];
    this.data.records = [];
    this.data.alarmEvents = [];
    this.data.chartConfigs = [];
    if (this.data.temperatureConfigs) {
      this.data.temperatureConfigs = [];
    }

    if (isMongoConnected()) {
      try {
        await Promise.all([
          DatasetModel.deleteMany({}),
          RecordModel.deleteMany({}),
          AlarmEventModel.deleteMany({}),
          ChartConfigModel.deleteMany({}),
          TemperatureConfigModel.deleteMany({}),
          IdempotencyRecordModel.deleteMany({}),
        ]);
        console.info('[MongoDB] Permanently cleared all datasets, records, and related events from MongoDB Atlas.');
      } catch (err: any) {
        console.error('[MongoDB] Error clearing all datasets in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return { deletedDatasets, deletedRecords };
  }

  // ==========================================
  // RECORDS
  // ==========================================
  public getRecords(datasetId?: string, limit?: number, offset = 0): DataRecord[] {
    let filtered = datasetId
      ? this.data.records.filter((r) => r.datasetId === datasetId)
      : this.data.records;
    if (limit !== undefined) {
      return filtered.slice(offset, offset + limit);
    }
    return filtered;
  }

  public getRecordById(datasetId: string, recordId: string): DataRecord | undefined {
    return this.data.records.find(
      (r) => r.datasetId === datasetId && (r.id === recordId || String(r.rowIndex) === recordId)
    );
  }

  public queryRecords(params: {
    datasetId: string;
    search?: string;
    equipment?: string;
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): { records: DataRecord[]; total: number } {
    let filtered = this.data.records.filter((r) => r.datasetId === params.datasetId);

    // Filter by equipment
    if (params.equipment && params.equipment !== 'ALL') {
      const eqLower = params.equipment.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.equipmentId && r.equipmentId.toLowerCase() === eqLower) ||
          Object.values(r.data).some((v) => String(v).toLowerCase() === eqLower)
      );
    }

    // Filter by date range
    if (params.startDate) {
      const startMs = new Date(params.startDate).getTime();
      filtered = filtered.filter((r) => {
        if (!r.timestamp) return true;
        return new Date(r.timestamp).getTime() >= startMs;
      });
    }
    if (params.endDate) {
      const endMs = new Date(params.endDate).getTime();
      filtered = filtered.filter((r) => {
        if (!r.timestamp) return true;
        return new Date(r.timestamp).getTime() <= endMs;
      });
    }

    // Search across all record fields
    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        if (r.equipmentId && r.equipmentId.toLowerCase().includes(q)) return true;
        if (r.timestamp && r.timestamp.toLowerCase().includes(q)) return true;
        return Object.values(r.data).some((val) => String(val).toLowerCase().includes(q));
      });
    }

    const total = filtered.length;

    // Sorting
    if (params.sortBy) {
      const sortKey = params.sortBy;
      const order = params.sortOrder === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        const valA = a.data[sortKey] !== undefined ? a.data[sortKey] : (a as any)[sortKey];
        const valB = b.data[sortKey] !== undefined ? b.data[sortKey] : (b as any)[sortKey];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * order;
        }

        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return (numA - numB) * order;
        }

        return String(valA).localeCompare(String(valB)) * order;
      });
    }

    const offset = params.offset || 0;
    const limit = params.limit !== undefined ? params.limit : 100;
    const paginated = filtered.slice(offset, offset + limit);

    return { records: paginated, total };
  }

  public async addRecord(datasetId: string, recordData: Record<string, any>): Promise<DataRecord | null> {
    const dataset = this.getDatasetById(datasetId);
    if (!dataset) return null;

    const existingRecords = this.data.records.filter((r) => r.datasetId === datasetId);
    const newRowIndex =
      existingRecords.length > 0
        ? Math.max(...existingRecords.map((r) => r.rowIndex || 0)) + 1
        : 1;

    let timestamp = new Date().toISOString();
    if (dataset.dateColumn && recordData[dataset.dateColumn] !== undefined) {
      timestamp = String(recordData[dataset.dateColumn]);
    } else if (
      recordData['timestamp'] ||
      recordData['Timestamp'] ||
      recordData['time'] ||
      recordData['Time'] ||
      recordData['date'] ||
      recordData['Date']
    ) {
      timestamp = String(
        recordData['timestamp'] ||
          recordData['Timestamp'] ||
          recordData['time'] ||
          recordData['Time'] ||
          recordData['date'] ||
          recordData['Date']
      );
    }

    let equipmentId = 'GEN-01';
    if (dataset.equipmentColumn && recordData[dataset.equipmentColumn] !== undefined) {
      equipmentId = String(recordData[dataset.equipmentColumn]);
    } else if (
      recordData['equipment'] ||
      recordData['Equipment'] ||
      recordData['unit'] ||
      recordData['Unit'] ||
      recordData['equipment_id']
    ) {
      equipmentId = String(
        recordData['equipment'] ||
          recordData['Equipment'] ||
          recordData['unit'] ||
          recordData['Unit'] ||
          recordData['equipment_id']
      );
    }

    const newRecord: DataRecord = {
      id: `rec_${datasetId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      datasetId,
      rowIndex: newRowIndex,
      timestamp,
      equipmentId,
      data: { ...recordData },
      createdAt: new Date().toISOString(),
    };

    this.data.records.push(newRecord);
    this.recalculateDatasetStats(datasetId);

    if (isMongoConnected()) {
      try {
        await RecordModel.create(newRecord);
      } catch (err: any) {
        console.error('[MongoDB] Error creating record in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return newRecord;
  }

  public async updateRecord(
    datasetId: string,
    recordId: string,
    updatedValues: Record<string, any>
  ): Promise<DataRecord | null> {
    const idx = this.data.records.findIndex(
      (r) => r.datasetId === datasetId && (r.id === recordId || String(r.rowIndex) === recordId)
    );
    if (idx === -1) return null;

    const current = this.data.records[idx];
    const dataset = this.getDatasetById(datasetId);
    const mergedData = { ...current.data, ...updatedValues };

    let newTimestamp = current.timestamp;
    if (dataset?.dateColumn && mergedData[dataset.dateColumn] !== undefined) {
      newTimestamp = String(mergedData[dataset.dateColumn]);
    }

    let newEquipment = current.equipmentId;
    if (dataset?.equipmentColumn && mergedData[dataset.equipmentColumn] !== undefined) {
      newEquipment = String(mergedData[dataset.equipmentColumn]);
    }

    this.data.records[idx] = {
      ...current,
      timestamp: newTimestamp,
      equipmentId: newEquipment,
      data: mergedData,
    };

    if (dataset) {
      this.recalculateDatasetStats(datasetId);
    }

    if (isMongoConnected()) {
      try {
        await RecordModel.findOneAndUpdate(
          { id: current.id },
          {
            $set: {
              timestamp: newTimestamp,
              equipmentId: newEquipment,
              data: mergedData,
            },
          }
        );
      } catch (err: any) {
        console.error('[MongoDB] Error updating record in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return this.data.records[idx];
  }

  public async deleteRecord(datasetId: string, recordId: string): Promise<boolean> {
    const idx = this.data.records.findIndex(
      (r) => r.datasetId === datasetId && (r.id === recordId || String(r.rowIndex) === recordId)
    );
    if (idx === -1) return false;

    const target = this.data.records[idx];
    this.data.records.splice(idx, 1);

    const dataset = this.getDatasetById(datasetId);
    if (dataset) {
      this.recalculateDatasetStats(datasetId);
    }

    if (isMongoConnected()) {
      try {
        await RecordModel.deleteOne({ id: target.id });
      } catch (err: any) {
        console.error('[MongoDB] Error deleting record in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return true;
  }

  public async bulkUpdateRecords(
    datasetId: string,
    action: 'delete' | 'update',
    payload: { recordIds?: string[]; updates?: { id: string; data: Record<string, any> }[] }
  ): Promise<{ affected: number }> {
    let affected = 0;

    if (action === 'delete' && payload.recordIds && payload.recordIds.length > 0) {
      const idSet = new Set(payload.recordIds);
      const beforeLen = this.data.records.length;
      this.data.records = this.data.records.filter(
        (r) => !(r.datasetId === datasetId && (idSet.has(r.id) || idSet.has(String(r.rowIndex))))
      );
      affected = beforeLen - this.data.records.length;

      if (isMongoConnected()) {
        try {
          await RecordModel.deleteMany({
            datasetId,
            $or: [{ id: { $in: payload.recordIds } }],
          });
        } catch (err: any) {
          console.error('[MongoDB] Error in bulk delete records:', err.message);
        }
      }
    } else if (action === 'update' && payload.updates && payload.updates.length > 0) {
      for (const item of payload.updates) {
        const res = await this.updateRecord(datasetId, item.id, item.data);
        if (res) affected++;
      }
    }

    if (affected > 0) {
      this.recalculateDatasetStats(datasetId);
      this.saveFallbackLocal();
    }

    return { affected };
  }

  public async replaceDatasetRecords(
    datasetId: string,
    newRecords: DataRecord[],
    newMetadata?: Partial<Dataset>
  ): Promise<boolean> {
    const dataset = this.getDatasetById(datasetId);
    if (!dataset) return false;

    // Remove old records for this dataset
    this.data.records = this.data.records.filter((r) => r.datasetId !== datasetId);
    this.data.records.push(...newRecords);

    // Update dataset metadata
    const updatedMeta: Partial<Dataset> = {
      ...newMetadata,
      totalRows: newRecords.length,
      validRows: newRecords.length,
      invalidRows: 0,
      updatedAt: new Date().toISOString(),
    };

    await this.updateDataset(datasetId, updatedMeta);
    this.recalculateDatasetStats(datasetId);

    if (isMongoConnected()) {
      try {
        await RecordModel.deleteMany({ datasetId });
        if (newRecords.length > 0) {
          await RecordModel.insertMany(newRecords, { ordered: false });
        }
      } catch (err: any) {
        console.error('[MongoDB] Error in replaceDatasetRecords:', err.message);
      }
    }

    this.saveFallbackLocal();
    return true;
  }

  public async appendDatasetRecords(
    datasetId: string,
    newRecords: DataRecord[],
    duplicateStrategy: 'skip' | 'overwrite' = 'skip'
  ): Promise<{ added: number; duplicatesSkipped: number; totalRecords: number }> {
    const dataset = this.getDatasetById(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const existing = this.data.records.filter((r) => r.datasetId === datasetId);

    const getFingerprint = (r: DataRecord): string => {
      const ts = r.timestamp || '';
      const eq = r.equipmentId || '';
      const dataKeys = Object.keys(r.data).sort();
      const sampleVals = dataKeys.map((k) => `${k}:${r.data[k]}`).join('|');
      return `${ts}#${eq}#${sampleVals}`;
    };

    const existingFingerprints = new Set(existing.map(getFingerprint));
    const recordsToInsert: DataRecord[] = [];
    let duplicatesSkipped = 0;

    let nextIndex = existing.length + 1;

    for (const rec of newRecords) {
      const fp = getFingerprint(rec);
      if (existingFingerprints.has(fp)) {
        duplicatesSkipped++;
        if (duplicateStrategy === 'overwrite') {
          const existIdx = this.data.records.findIndex(
            (r) => r.datasetId === datasetId && getFingerprint(r) === fp
          );
          if (existIdx >= 0) {
            this.data.records[existIdx] = {
              ...rec,
              id: this.data.records[existIdx].id,
              rowIndex: this.data.records[existIdx].rowIndex,
              datasetId,
            };
            if (isMongoConnected()) {
              RecordModel.findOneAndUpdate(
                { id: this.data.records[existIdx].id },
                { $set: this.data.records[existIdx] }
              ).catch(() => {});
            }
          }
        }
      } else {
        existingFingerprints.add(fp);
        const recordToAdd: DataRecord = {
          ...rec,
          id: `rec_${datasetId}_${nextIndex++}`,
          rowIndex: nextIndex - 1,
          datasetId,
          createdAt: new Date().toISOString(),
        };
        recordsToInsert.push(recordToAdd);
      }
    }

    if (recordsToInsert.length > 0) {
      this.data.records.push(...recordsToInsert);
      if (isMongoConnected()) {
        try {
          await RecordModel.insertMany(recordsToInsert, { ordered: false });
        } catch (err: any) {
          console.error('[MongoDB] Error inserting appended records into MongoDB:', err.message);
        }
      }
    }

    const totalRecords = this.getRecordCount(datasetId);
    await this.updateDataset(datasetId, {
      totalRows: totalRecords,
      validRows: totalRecords,
      updatedAt: new Date().toISOString(),
    });

    this.recalculateDatasetStats(datasetId);
    this.saveFallbackLocal();

    return {
      added: recordsToInsert.length,
      duplicatesSkipped,
      totalRecords,
    };
  }

  public recalculateDatasetStats(datasetId: string) {
    const dataset = this.getDatasetById(datasetId);
    if (!dataset) return;

    const records = this.data.records.filter((r) => r.datasetId === datasetId);
    if (records.length === 0) {
      dataset.validRows = 0;
      dataset.totalRows = 0;
      dataset.updatedAt = new Date().toISOString();
      return;
    }

    const rawRows = records.map((r) => r.data);
    const existingColNames = dataset.columns?.length > 0
      ? dataset.columns.map((c) => c.name)
      : [];
    const allFoundKeys = new Set<string>(existingColNames);
    rawRows.forEach((r) => {
      if (r && typeof r === 'object') {
        Object.keys(r).forEach((k) => allFoundKeys.add(k));
      }
    });
    const colNames = Array.from(allFoundKeys);

    // Recalculate min, max, avg, distinct count for each column
    const updatedColumns = colNames.map((colName) => {
      const existingCol = dataset.columns?.find((c) => c.name === colName);
      const values = rawRows
        .map((r) => r[colName])
        .filter((v) => v !== undefined && v !== null && v !== '');

      let numericCount = 0;
      let minVal: number | undefined = undefined;
      let maxVal: number | undefined = undefined;
      let sumVal = 0;
      const distinctSet = new Set<string>();

      for (const val of values) {
        const strVal = String(val).trim();
        distinctSet.add(strVal);

        const num = Number(val);
        if (!isNaN(num) && typeof val !== 'boolean' && strVal !== '') {
          numericCount++;
          if (minVal === undefined || num < minVal) minVal = num;
          if (maxVal === undefined || num > maxVal) maxVal = num;
          sumVal += num;
        }
      }

      const avgVal = numericCount > 0 ? Number((sumVal / numericCount).toFixed(2)) : undefined;

      return {
        ...(existingCol || {
          name: colName,
          displayName: colName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          dataType: numericCount / (values.length || 1) > 0.75 ? 'numeric' : 'string',
        }),
        min: minVal,
        max: maxVal,
        avg: avgVal,
        distinctCount: distinctSet.size,
      };
    });

    const detectedMetricsList = updatedColumns
      .filter((c: any) => c.dataType === 'numeric' && !c.isIdentifier)
      .map((c) => c.displayName || c.name);

    dataset.columns = updatedColumns as any;
    dataset.validRows = records.length;
    dataset.totalRows = records.length;
    dataset.detectedMetrics = detectedMetricsList;
    dataset.updatedAt = new Date().toISOString();

    if (isMongoConnected()) {
      DatasetModel.findOneAndUpdate(
        { id: datasetId },
        {
          $set: {
            columns: dataset.columns,
            validRows: dataset.validRows,
            totalRows: dataset.totalRows,
            detectedMetrics: dataset.detectedMetrics,
            updatedAt: dataset.updatedAt,
          },
        }
      ).catch(() => {});
    }
  }

  public async addRecords(records: DataRecord[]) {
    this.data.records.push(...records);
    if (isMongoConnected() && records.length > 0) {
      try {
        await RecordModel.insertMany(records, { ordered: false });
      } catch (err: any) {
        console.error('[MongoDB] Error bulk inserting records into MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
  }

  public getRecordCount(datasetId?: string): number {
    if (datasetId) {
      return this.data.records.filter((r) => r.datasetId === datasetId).length;
    }
    return this.data.records.length;
  }

  // ==========================================
  // ALARM RULES
  // ==========================================
  public getAlarmRules(): AlarmRule[] {
    return this.data.alarmRules;
  }

  public getAlarmRuleById(id: string): AlarmRule | undefined {
    return this.data.alarmRules.find((r) => r.id === id);
  }

  public async addAlarmRule(rule: AlarmRule): Promise<AlarmRule> {
    const idx = this.data.alarmRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      this.data.alarmRules[idx] = rule;
    } else {
      this.data.alarmRules.push(rule);
    }

    if (isMongoConnected()) {
      try {
        await AlarmRuleModel.findOneAndUpdate({ id: rule.id }, rule, { upsert: true, new: true });
      } catch (err: any) {
        console.error('[MongoDB] Error saving alarm rule to MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return rule;
  }

  public async updateAlarmRule(id: string, updates: Partial<AlarmRule>): Promise<AlarmRule | undefined> {
    const idx = this.data.alarmRules.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    this.data.alarmRules[idx] = {
      ...this.data.alarmRules[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (isMongoConnected()) {
      try {
        await AlarmRuleModel.findOneAndUpdate({ id }, { $set: this.data.alarmRules[idx] });
      } catch (err: any) {
        console.error('[MongoDB] Error updating alarm rule in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return this.data.alarmRules[idx];
  }

  public async deleteAlarmRule(id: string): Promise<boolean> {
    const idx = this.data.alarmRules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.data.alarmRules.splice(idx, 1);
    if (isMongoConnected()) {
      try {
        await AlarmRuleModel.deleteOne({ id });
      } catch (err: any) {
        console.error('[MongoDB] Error deleting alarm rule in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return true;
  }

  // ==========================================
  // ALARM EVENTS
  // ==========================================
  public getAlarmEvents(status?: string, limit?: number): AlarmEvent[] {
    const seenIds = new Set<string>();
    const uniqueList: AlarmEvent[] = [];
    for (const e of this.data.alarmEvents) {
      if (!e.id || seenIds.has(e.id)) continue;
      seenIds.add(e.id);
      uniqueList.push(e);
    }
    let list = uniqueList;
    if (status) {
      list = list.filter((e) => e.status === status);
    }
    list = [...list].sort(
      (a, b) =>
        new Date(b.timestamp || b.createdAt).getTime() -
        new Date(a.timestamp || a.createdAt).getTime()
    );
    if (limit) {
      return list.slice(0, limit);
    }
    return list;
  }

  public async addAlarmEvents(events: AlarmEvent[]) {
    if (!events || events.length === 0) return;
    const existingMap = new Map<string, number>();
    this.data.alarmEvents.forEach((e, i) => {
      if (e.id) existingMap.set(e.id, i);
    });

    const eventsToPersist: AlarmEvent[] = [];

    for (const ev of events) {
      if (ev.id && existingMap.has(ev.id)) {
        const idx = existingMap.get(ev.id)!;
        const current = this.data.alarmEvents[idx];
        // If already acknowledged, resolved, or cleared, preserve operator lifecycle state
        const merged: AlarmEvent = {
          ...current,
          ...ev,
          status: current.status !== 'ACTIVE' ? current.status : (ev.status || 'ACTIVE'),
          acknowledgedBy: current.acknowledgedBy || ev.acknowledgedBy,
          acknowledgedAt: current.acknowledgedAt || ev.acknowledgedAt,
          resolvedBy: current.resolvedBy || ev.resolvedBy,
          resolvedAt: current.resolvedAt || ev.resolvedAt,
          resolutionNotes: current.resolutionNotes || ev.resolutionNotes,
          clearedBy: current.clearedBy || ev.clearedBy,
          clearedAt: current.clearedAt || ev.clearedAt,
          updatedAt: current.updatedAt || ev.updatedAt || new Date().toISOString(),
        };
        this.data.alarmEvents[idx] = merged;
        eventsToPersist.push(merged);
      } else {
        if (ev.id) existingMap.set(ev.id, this.data.alarmEvents.length);
        this.data.alarmEvents.push(ev);
        eventsToPersist.push(ev);
      }
    }

    if (isMongoConnected() && eventsToPersist.length > 0) {
      try {
        await AlarmEventModel.bulkWrite(
          eventsToPersist.map((e) => ({
            updateOne: {
              filter: { id: e.id },
              update: { $set: e },
              upsert: true,
            },
          }))
        );
      } catch (err: any) {
        console.error('[MongoDB] Error upserting alarm events in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
  }

  public async updateAlarmEvent(id: string, updates: Partial<AlarmEvent>): Promise<AlarmEvent | undefined> {
    const idx = this.data.alarmEvents.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    this.data.alarmEvents[idx] = {
      ...this.data.alarmEvents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (isMongoConnected()) {
      try {
        await AlarmEventModel.findOneAndUpdate({ id }, { $set: this.data.alarmEvents[idx] });
      } catch (err: any) {
        console.error('[MongoDB] Error updating alarm event status in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return this.data.alarmEvents[idx];
  }

  /**
   * Clear a single alarm event by ID with audit trails.
   */
  public async clearAlarmEvent(id: string, clearedBy?: string): Promise<AlarmEvent | undefined> {
    const idx = this.data.alarmEvents.findIndex((e) => e.id === id);
    if (idx === -1) return undefined;
    const now = new Date().toISOString();
    this.data.alarmEvents[idx] = {
      ...this.data.alarmEvents[idx],
      status: 'CLEARED',
      clearedBy: clearedBy || 'Operator',
      clearedAt: now,
      updatedAt: now,
    };
    if (isMongoConnected()) {
      try {
        await AlarmEventModel.findOneAndUpdate(
          { id },
          { $set: { status: 'CLEARED', clearedBy: clearedBy || 'Operator', clearedAt: now, updatedAt: now } }
        );
      } catch (err: any) {
        console.error('[MongoDB] Error clearing alarm event in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return this.data.alarmEvents[idx];
  }

  /**
   * Clear selected alarm events in batch with audit metadata.
   */
  public async clearAlarmEventsBatch(ids: string[], clearedBy?: string): Promise<{ clearedCount: number }> {
    if (!ids || ids.length === 0) return { clearedCount: 0 };
    const idSet = new Set(ids);
    const now = new Date().toISOString();
    let count = 0;
    this.data.alarmEvents = this.data.alarmEvents.map((e) => {
      if (idSet.has(e.id)) {
        count++;
        return {
          ...e,
          status: 'CLEARED',
          clearedBy: clearedBy || 'Operator',
          clearedAt: now,
          updatedAt: now,
        };
      }
      return e;
    });

    if (isMongoConnected()) {
      try {
        await AlarmEventModel.updateMany(
          { id: { $in: ids } },
          { $set: { status: 'CLEARED', clearedBy: clearedBy || 'Operator', clearedAt: now, updatedAt: now } }
        );
      } catch (err: any) {
        console.error('[MongoDB] Error batch-clearing alarm events in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return { clearedCount: count };
  }

  /**
   * Clear all or filtered alarm events permanently in MongoDB & memory.
   */
  public async clearAlarmEvents(datasetId?: string, clearedBy?: string) {
    const now = new Date().toISOString();
    if (datasetId) {
      this.data.alarmEvents = this.data.alarmEvents.map((e) =>
        e.datasetId === datasetId
          ? { ...e, status: 'CLEARED', clearedBy: clearedBy || 'Operator', clearedAt: now, updatedAt: now }
          : e
      );
      if (isMongoConnected()) {
        try {
          await AlarmEventModel.updateMany(
            { datasetId },
            { $set: { status: 'CLEARED', clearedBy: clearedBy || 'Operator', clearedAt: now, updatedAt: now } }
          );
        } catch (err: any) {
          console.error('[MongoDB] Error clearing alarm events by dataset:', err.message);
        }
      }
    } else {
      this.data.alarmEvents = this.data.alarmEvents.map((e) => ({
        ...e,
        status: 'CLEARED',
        clearedBy: clearedBy || 'Operator',
        clearedAt: now,
        updatedAt: now,
      }));
      if (isMongoConnected()) {
        try {
          await AlarmEventModel.updateMany(
            {},
            { $set: { status: 'CLEARED', clearedBy: clearedBy || 'Operator', clearedAt: now, updatedAt: now } }
          );
        } catch (err: any) {
          console.error('[MongoDB] Error clearing all alarm events:', err.message);
        }
      }
    }
    this.saveFallbackLocal();
  }

  /**
   * Clear filtered alarm events by dataset, level, or equipment with audit metadata.
   */
  public async clearAllAlarmEvents(
    filter?: { datasetId?: string; level?: string; equipmentId?: string },
    clearedBy?: string
  ): Promise<{ clearedCount: number }> {
    const now = new Date().toISOString();
    let count = 0;
    const mongoFilter: any = {};

    if (filter?.datasetId) mongoFilter.datasetId = filter.datasetId;
    if (filter?.level) mongoFilter.alarmLevel = filter.level;
    if (filter?.equipmentId) mongoFilter.equipmentId = filter.equipmentId;

    this.data.alarmEvents = this.data.alarmEvents.map((e) => {
      let matches = true;
      if (filter?.datasetId && e.datasetId !== filter.datasetId) matches = false;
      if (filter?.level && e.alarmLevel !== filter.level) matches = false;
      if (filter?.equipmentId && e.equipmentId !== filter.equipmentId) matches = false;

      if (matches && e.status !== 'CLEARED') {
        count++;
        return {
          ...e,
          status: 'CLEARED',
          clearedBy: clearedBy || 'Operator',
          clearedAt: now,
          updatedAt: now,
        };
      }
      return e;
    });

    if (isMongoConnected()) {
      try {
        await AlarmEventModel.updateMany(
          mongoFilter,
          { $set: { status: 'CLEARED', clearedBy: clearedBy || 'Operator', clearedAt: now, updatedAt: now } }
        );
      } catch (err: any) {
        console.error('[MongoDB] Error clearing filtered alarms in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return { clearedCount: count };
  }

  // ==========================================
  // IDEMPOTENCY PERSISTENCE (Multi-Instance & TTL)
  // ==========================================
  public async getIdempotencyRecord(key: string): Promise<any | null> {
    if (!key) return null;
    try {
      if (isMongoConnected()) {
        const doc = await IdempotencyRecordModel.findOne({ key }).lean();
        if (doc && (doc as any).result) {
          return (doc as any).result;
        }
      }
    } catch (err: any) {
      console.warn('[Idempotency] Error querying idempotency record:', err.message);
    }
    return null;
  }

  public async saveIdempotencyRecord(key: string, datasetId: string, result: any): Promise<void> {
    if (!key) return;
    try {
      if (isMongoConnected()) {
        await IdempotencyRecordModel.findOneAndUpdate(
          { key },
          { key, datasetId, result, createdAt: new Date() },
          { upsert: true }
        );
      }
    } catch (err: any) {
      console.warn('[Idempotency] Error saving idempotency record:', err.message);
    }
  }

  // ==========================================
  // CHART CONFIGS
  // ==========================================
  public getChartConfigs(datasetId?: string): ChartConfig[] {
    if (datasetId) {
      return this.data.chartConfigs.filter((c) => c.datasetId === datasetId);
    }
    return this.data.chartConfigs;
  }

  public getChartConfigById(id: string): ChartConfig | undefined {
    return this.data.chartConfigs.find((c) => c.id === id);
  }

  public async addChartConfig(config: ChartConfig): Promise<ChartConfig> {
    const idx = this.data.chartConfigs.findIndex((c) => c.id === config.id);
    if (idx >= 0) {
      this.data.chartConfigs[idx] = config;
    } else {
      this.data.chartConfigs.push(config);
    }

    if (isMongoConnected()) {
      try {
        await ChartConfigModel.findOneAndUpdate({ id: config.id }, config, { upsert: true });
      } catch (err: any) {
        console.error('[MongoDB] Error saving chart config to MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return config;
  }

  public async updateChartConfig(id: string, updates: Partial<ChartConfig>): Promise<ChartConfig | undefined> {
    const idx = this.data.chartConfigs.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.data.chartConfigs[idx] = {
      ...this.data.chartConfigs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    if (isMongoConnected()) {
      try {
        await ChartConfigModel.findOneAndUpdate({ id }, { $set: this.data.chartConfigs[idx] });
      } catch (err: any) {
        console.error('[MongoDB] Error updating chart config in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return this.data.chartConfigs[idx];
  }

  public async deleteChartConfig(id: string): Promise<boolean> {
    const idx = this.data.chartConfigs.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.data.chartConfigs.splice(idx, 1);
    if (isMongoConnected()) {
      try {
        await ChartConfigModel.deleteOne({ id });
      } catch (err: any) {
        console.error('[MongoDB] Error deleting chart config in MongoDB:', err.message);
      }
    }
    this.saveFallbackLocal();
    return true;
  }

  // ==========================================
  // DASHBOARD LAYOUT
  // ==========================================
  public getDashboardLayout(userId?: string): DashboardLayout {
    const userLayout = userId ? this.data.dashboardLayouts.find((l) => l.userId === userId) : null;
    if (userLayout) return userLayout;
    return this.data.dashboardLayouts.find((l) => l.isDefault) || this.data.dashboardLayouts[0];
  }

  public async updateDashboardLayout(layout: DashboardLayout): Promise<DashboardLayout> {
    const idx = this.data.dashboardLayouts.findIndex(
      (l) => l.id === layout.id || (layout.userId && l.userId === layout.userId)
    );
    const updated = { ...layout, updatedAt: new Date().toISOString() };
    if (idx >= 0) {
      this.data.dashboardLayouts[idx] = updated;
    } else {
      this.data.dashboardLayouts.push(updated);
    }

    if (isMongoConnected()) {
      try {
        await DashboardLayoutModel.findOneAndUpdate({ id: layout.id }, updated, { upsert: true });
      } catch (err: any) {
        console.error('[MongoDB] Error saving dashboard layout to MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return updated;
  }

  // ==========================================
  // TEMPERATURE CONFIGS
  // ==========================================
  public getTemperatureConfig(datasetId?: string): TemperatureThresholdConfig {
    if (!this.data.temperatureConfigs) {
      this.data.temperatureConfigs = [];
    }

    if (datasetId) {
      const match = this.data.temperatureConfigs.find((c) => c.datasetId === datasetId);
      if (match) return match;
    }

    const defaultCfg = this.data.temperatureConfigs.find(
      (c) => !c.datasetId || c.id === 'default_temp_config'
    );
    if (defaultCfg) return defaultCfg;

    const fallback: TemperatureThresholdConfig = {
      id: 'default_temp_config',
      metricColumn: 'temperature',
      belowThreshold: 20,
      normalMin: 20,
      normalMax: 30,
      aboveThreshold: 30,
      belowLabel: 'BELOW TEMPERATURE',
      normalLabel: 'NORMAL TEMPERATURE',
      aboveLabel: 'ABOVE TEMPERATURE',
      belowColor: '#06B6D4',
      normalColor: '#00FF41',
      aboveColor: '#EF4444',
      belowOpacity: 0.85,
      normalOpacity: 0.85,
      aboveOpacity: 0.9,
      isEnabled: true,
      unit: '°C',
      surfaceResolution: 40,
      showGrid3D: true,
      showPoints3D: true,
      showMesh3D: true,
      wireframe: false,
      verticalScale: 1.0,
      defaultViewMode: 'surface',
      enableMonitoring: true,
      enableAboveAlarm: true,
      enableBelowAlarm: true,
      showAlarmsOnDashboard: true,
      alarmDisplayPosition: 'below_graph',
      showAlarmCount: true,
      playAlarmSound: false,
      requireAcknowledgement: true,
      enableAutoResolve: false,
      aboveAlarmSeverity: 'CRITICAL',
      belowAlarmSeverity: 'WARNING',
      updatedAt: new Date().toISOString(),
      updatedBy: 'system',
    };
    this.data.temperatureConfigs.push(fallback);
    this.saveFallbackLocal();
    return fallback;
  }

  public async setTemperatureConfig(
    configUpdates: Partial<TemperatureThresholdConfig>,
    datasetId?: string,
    userEmail = 'admin@tatapower.com'
  ): Promise<TemperatureThresholdConfig> {
    if (!this.data.temperatureConfigs) {
      this.data.temperatureConfigs = [];
    }

    const existingIdx = this.data.temperatureConfigs.findIndex((c) =>
      datasetId ? c.datasetId === datasetId : !c.datasetId || c.id === 'default_temp_config'
    );

    let updated: TemperatureThresholdConfig;
    if (existingIdx >= 0) {
      this.data.temperatureConfigs[existingIdx] = {
        ...this.data.temperatureConfigs[existingIdx],
        ...configUpdates,
        datasetId: datasetId || this.data.temperatureConfigs[existingIdx].datasetId,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
      };
      updated = this.data.temperatureConfigs[existingIdx];
    } else {
      updated = {
        id: `temp_cfg_${Date.now()}`,
        datasetId,
        metricColumn: configUpdates.metricColumn || 'temperature',
        belowThreshold: configUpdates.belowThreshold ?? 20,
        normalMin: configUpdates.normalMin ?? 20,
        normalMax: configUpdates.normalMax ?? 30,
        aboveThreshold: configUpdates.aboveThreshold ?? 30,
        belowLabel: configUpdates.belowLabel || 'BELOW TEMPERATURE',
        normalLabel: configUpdates.normalLabel || 'NORMAL TEMPERATURE',
        aboveLabel: configUpdates.aboveLabel || 'ABOVE TEMPERATURE',
        belowColor: configUpdates.belowColor || '#06B6D4',
        normalColor: configUpdates.normalColor || '#00FF41',
        aboveColor: configUpdates.aboveColor || '#EF4444',
        belowOpacity: configUpdates.belowOpacity ?? 0.85,
        normalOpacity: configUpdates.normalOpacity ?? 0.85,
        aboveOpacity: configUpdates.aboveOpacity ?? 0.9,
        isEnabled: configUpdates.isEnabled !== undefined ? configUpdates.isEnabled : true,
        unit: configUpdates.unit || '°C',
        surfaceResolution: configUpdates.surfaceResolution || 40,
        showGrid3D: configUpdates.showGrid3D !== undefined ? configUpdates.showGrid3D : true,
        showPoints3D: configUpdates.showPoints3D !== undefined ? configUpdates.showPoints3D : true,
        showMesh3D: configUpdates.showMesh3D !== undefined ? configUpdates.showMesh3D : true,
        wireframe: configUpdates.wireframe !== undefined ? configUpdates.wireframe : false,
        verticalScale: configUpdates.verticalScale || 1.0,
        defaultViewMode: configUpdates.defaultViewMode || 'surface',
        enableMonitoring: configUpdates.enableMonitoring !== undefined ? configUpdates.enableMonitoring : true,
        enableAboveAlarm: configUpdates.enableAboveAlarm !== undefined ? configUpdates.enableAboveAlarm : true,
        enableBelowAlarm: configUpdates.enableBelowAlarm !== undefined ? configUpdates.enableBelowAlarm : true,
        showAlarmsOnDashboard: configUpdates.showAlarmsOnDashboard !== undefined ? configUpdates.showAlarmsOnDashboard : true,
        alarmDisplayPosition: configUpdates.alarmDisplayPosition || 'below_graph',
        showAlarmCount: configUpdates.showAlarmCount !== undefined ? configUpdates.showAlarmCount : true,
        playAlarmSound: configUpdates.playAlarmSound !== undefined ? configUpdates.playAlarmSound : false,
        requireAcknowledgement: configUpdates.requireAcknowledgement !== undefined ? configUpdates.requireAcknowledgement : true,
        enableAutoResolve: configUpdates.enableAutoResolve !== undefined ? configUpdates.enableAutoResolve : false,
        aboveAlarmSeverity: configUpdates.aboveAlarmSeverity || 'CRITICAL',
        belowAlarmSeverity: configUpdates.belowAlarmSeverity || 'WARNING',
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail,
      };
      this.data.temperatureConfigs.push(updated);
    }

    if (isMongoConnected()) {
      try {
        await TemperatureConfigModel.findOneAndUpdate({ id: updated.id }, updated, { upsert: true });
      } catch (err: any) {
        console.error('[MongoDB] Error saving temperature config to MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return updated;
  }

  // ==========================================
  // METRIC CONFIGS
  // ==========================================
  public getMetricConfigs(): Record<string, Partial<MetricDefinition>> {
    return this.data.metricConfigs || {};
  }

  public getMetricConfig(metricKey: string): Partial<MetricDefinition> | undefined {
    return (this.data.metricConfigs || {})[metricKey];
  }

  public async saveMetricConfig(
    metricKey: string,
    config: Partial<MetricDefinition>
  ): Promise<Partial<MetricDefinition>> {
    if (!this.data.metricConfigs) {
      this.data.metricConfigs = {};
    }
    const existing = this.data.metricConfigs[metricKey] || {};
    const updated: Partial<MetricDefinition> = {
      ...existing,
      ...config,
      thresholds: {
        enabled: true,
        alarmEnabled: true,
        ...(existing.thresholds || {}),
        ...(config.thresholds || {}),
      } as MetricThresholdConfig,
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || config.createdAt || new Date().toISOString(),
    };
    this.data.metricConfigs[metricKey] = updated;

    if (isMongoConnected()) {
      try {
        const doc = { metricKey, ...updated };
        await MetricConfigModel.findOneAndUpdate({ metricKey }, doc, { upsert: true });
      } catch (err: any) {
        console.error('[MongoDB] Error saving metric config to MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return updated;
  }

  public async deleteMetricConfig(metricKey: string): Promise<boolean> {
    if (!this.data.metricConfigs || !this.data.metricConfigs[metricKey]) {
      return false;
    }
    delete this.data.metricConfigs[metricKey];

    if (isMongoConnected()) {
      try {
        await MetricConfigModel.deleteOne({ metricKey });
      } catch (err: any) {
        console.error('[MongoDB] Error deleting metric config in MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return true;
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================
  public async addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<ActivityLog> {
    const newLog: ActivityLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(newLog);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs.pop();
    }

    if (isMongoConnected()) {
      try {
        await ActivityLogModel.create(newLog);
      } catch (err: any) {
        console.error('[MongoDB] Error writing activity log to MongoDB:', err.message);
      }
    }

    this.saveFallbackLocal();
    return newLog;
  }

  public getActivityLogs(limit = 100): ActivityLog[] {
    return this.data.activityLogs.slice(0, limit);
  }
}

export const db = new MongoDatabase();
