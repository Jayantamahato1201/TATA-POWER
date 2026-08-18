import fs from 'fs';
import path from 'path';
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
} from './models.js';
import { isMongoConnected } from './connection.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tatapower_database.json');

export async function migrateJsonToMongo(force = false): Promise<{
  migrated: boolean;
  users: number;
  datasets: number;
  records: number;
  alarmRules: number;
  alarmEvents: number;
  metricConfigs: number;
  temperatureConfigs: number;
  chartConfigs: number;
  dashboardLayouts: number;
  activityLogs: number;
}> {
  if (!isMongoConnected()) {
    return {
      migrated: false,
      users: 0,
      datasets: 0,
      records: 0,
      alarmRules: 0,
      alarmEvents: 0,
      metricConfigs: 0,
      temperatureConfigs: 0,
      chartConfigs: 0,
      dashboardLayouts: 0,
      activityLogs: 0,
    };
  }

  if (!fs.existsSync(DB_FILE)) {
    console.info('[MongoDB Migration] No local JSON database found to migrate.');
    return {
      migrated: false,
      users: 0,
      datasets: 0,
      records: 0,
      alarmRules: 0,
      alarmEvents: 0,
      metricConfigs: 0,
      temperatureConfigs: 0,
      chartConfigs: 0,
      dashboardLayouts: 0,
      activityLogs: 0,
    };
  }

  let raw: any;
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    raw = JSON.parse(content);
  } catch (err: any) {
    console.error('[MongoDB Migration] Failed to read JSON database file:', err.message);
    return {
      migrated: false,
      users: 0,
      datasets: 0,
      records: 0,
      alarmRules: 0,
      alarmEvents: 0,
      metricConfigs: 0,
      temperatureConfigs: 0,
      chartConfigs: 0,
      dashboardLayouts: 0,
      activityLogs: 0,
    };
  }

  const initConfig = await SystemConfigModel.findOne({ key: 'system_initialized' });
  if (initConfig && !force) {
    console.info('[MongoDB Migration] Database is already initialized in MongoDB Atlas. Skipping auto-migration to preserve user deletions and updates.');
    return {
      migrated: false,
      users: 0,
      datasets: 0,
      records: 0,
      alarmRules: 0,
      alarmEvents: 0,
      metricConfigs: 0,
      temperatureConfigs: 0,
      chartConfigs: 0,
      dashboardLayouts: 0,
      activityLogs: 0,
    };
  }

  const existingDatasetsCount = await DatasetModel.countDocuments();
  if (existingDatasetsCount > 0 && !force) {
    console.info(`[MongoDB Migration] MongoDB already contains ${existingDatasetsCount} datasets. Marking initialized.`);
    await SystemConfigModel.findOneAndUpdate(
      { key: 'system_initialized' },
      { key: 'system_initialized', value: true, initializedAt: new Date().toISOString() },
      { upsert: true }
    );
    return {
      migrated: false,
      users: 0,
      datasets: existingDatasetsCount,
      records: 0,
      alarmRules: 0,
      alarmEvents: 0,
      metricConfigs: 0,
      temperatureConfigs: 0,
      chartConfigs: 0,
      dashboardLayouts: 0,
      activityLogs: 0,
    };
  }

  console.info('[MongoDB Migration] Starting idempotent migration of JSON database to MongoDB Atlas...');

  let usersCount = 0;
  let datasetsCount = 0;
  let recordsCount = 0;
  let alarmRulesCount = 0;
  let alarmEventsCount = 0;
  let metricConfigsCount = 0;
  let tempConfigsCount = 0;
  let chartConfigsCount = 0;
  let layoutCount = 0;
  let logsCount = 0;

  // 1. Users
  if (Array.isArray(raw.users) && raw.users.length > 0) {
    for (const u of raw.users) {
      await UserModel.findOneAndUpdate({ id: u.id }, u, { upsert: true, new: true });
      usersCount++;
    }
  }

  // 2. Datasets
  if (Array.isArray(raw.datasets) && raw.datasets.length > 0) {
    for (const d of raw.datasets) {
      await DatasetModel.findOneAndUpdate({ id: d.id }, d, { upsert: true, new: true });
      datasetsCount++;
    }
  }

  // 3. Telemetry Records (batch processed to avoid memory pressure)
  if (Array.isArray(raw.records) && raw.records.length > 0) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < raw.records.length; i += BATCH_SIZE) {
      const batch = raw.records.slice(i, i + BATCH_SIZE);
      const bulkOps = batch.map((r: any) => ({
        updateOne: {
          filter: { id: r.id },
          update: { $set: r },
          upsert: true,
        },
      }));
      await RecordModel.bulkWrite(bulkOps);
      recordsCount += batch.length;
    }
  }

  // 4. Alarm Rules
  if (Array.isArray(raw.alarmRules) && raw.alarmRules.length > 0) {
    for (const r of raw.alarmRules) {
      await AlarmRuleModel.findOneAndUpdate({ id: r.id }, r, { upsert: true, new: true });
      alarmRulesCount++;
    }
  }

  // 5. Alarm Events
  if (Array.isArray(raw.alarmEvents) && raw.alarmEvents.length > 0) {
    for (const e of raw.alarmEvents) {
      await AlarmEventModel.findOneAndUpdate({ id: e.id }, e, { upsert: true, new: true });
      alarmEventsCount++;
    }
  }

  // 6. Metric Configs
  if (raw.metricConfigs && typeof raw.metricConfigs === 'object') {
    for (const [k, v] of Object.entries(raw.metricConfigs)) {
      const doc = { metricKey: k, ...(v as any) };
      await MetricConfigModel.findOneAndUpdate({ metricKey: k }, doc, { upsert: true, new: true });
      metricConfigsCount++;
    }
  }

  // 7. Temperature Configs
  if (Array.isArray(raw.temperatureConfigs) && raw.temperatureConfigs.length > 0) {
    for (const t of raw.temperatureConfigs) {
      await TemperatureConfigModel.findOneAndUpdate({ id: t.id }, t, { upsert: true, new: true });
      tempConfigsCount++;
    }
  }

  // 8. Chart Configs
  if (Array.isArray(raw.chartConfigs) && raw.chartConfigs.length > 0) {
    for (const c of raw.chartConfigs) {
      await ChartConfigModel.findOneAndUpdate({ id: c.id }, c, { upsert: true, new: true });
      chartConfigsCount++;
    }
  }

  // 9. Dashboard Layouts
  if (Array.isArray(raw.dashboardLayouts) && raw.dashboardLayouts.length > 0) {
    for (const l of raw.dashboardLayouts) {
      await DashboardLayoutModel.findOneAndUpdate({ id: l.id }, l, { upsert: true, new: true });
      layoutCount++;
    }
  }

  // 10. Activity Logs
  if (Array.isArray(raw.activityLogs) && raw.activityLogs.length > 0) {
    for (const log of raw.activityLogs) {
      await ActivityLogModel.findOneAndUpdate({ id: log.id }, log, { upsert: true, new: true });
      logsCount++;
    }
  }

  // 11. Master Alarm System toggle state
  await SystemConfigModel.findOneAndUpdate(
    { key: 'masterAlarmEnabled' },
    { key: 'masterAlarmEnabled', value: true, updatedAt: new Date().toISOString() },
    { upsert: true }
  );

  // 12. Mark system as initialized permanently
  await SystemConfigModel.findOneAndUpdate(
    { key: 'system_initialized' },
    { key: 'system_initialized', value: true, initializedAt: new Date().toISOString() },
    { upsert: true }
  );

  console.info(
    `[MongoDB Migration] Completed successfully. Migrated ${datasetsCount} datasets, ${recordsCount} records, ${alarmRulesCount} rules, ${alarmEventsCount} alarm events, ${metricConfigsCount} metric configs.`
  );

  return {
    migrated: true,
    users: usersCount,
    datasets: datasetsCount,
    records: recordsCount,
    alarmRules: alarmRulesCount,
    alarmEvents: alarmEventsCount,
    metricConfigs: metricConfigsCount,
    temperatureConfigs: tempConfigsCount,
    chartConfigs: chartConfigsCount,
    dashboardLayouts: layoutCount,
    activityLogs: logsCount,
  };
}
