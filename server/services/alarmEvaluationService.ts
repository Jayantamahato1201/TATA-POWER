import { AlarmRule, AlarmEvent, DataRecord, Dataset, AlarmLevel } from '../types/index.js';
import { db } from '../db/database.js';
import { ReportParser } from '../utils/reportParser.js';

export class AlarmEvaluationService {
  /**
   * Helper to check if a column or field name matches a metric keyword/rule
   */
  public static matchesMetric(columnOrField: string, ruleTarget: string): boolean {
    const col = columnOrField.toLowerCase().replace(/[\s_\-]/g, '');
    const target = ruleTarget.toLowerCase().replace(/[\s_\-]/g, '');

    if (col === target) return true;
    if (col.includes(target) || target.includes(col)) return true;

    // Aliases dictionary
    const aliases: Record<string, string[]> = {
      temperature: ['temp', 'degc', 'celsius', 'thermal', 'exhaust', 'coolant', 'stator', 'bearingtemp', 'boilertemp', 't1', 't2', 't3', 't4'],
      vibration: ['vib', 'vibr', 'mms', 'amplitude', 'bearingvib', 'shaftvib'],
      nox_level: ['nox', 'denox', 'emission', 'sox', 'flue', 'mg/nm3', 'mg_nm3', 'fluegas'],
      voltage: ['volt', 'kv', 'busv', 'genv', 'phasev', 'volts'],
      power: ['load', 'mw', 'kw', 'kvar', 'kva', 'output', 'activepower', 'generation'],
      pressure: ['press', 'bar', 'steampress', 'oilpress', 'mbar', 'psi', 'kpa'],
      frequency: ['freq', 'hz', 'gridfreq'],
    };

    for (const [key, list] of Object.entries(aliases)) {
      const isTargetKey = target.includes(key) || key.includes(target) || list.some((a) => target.includes(a));
      if (isTargetKey) {
        if (list.some((a) => col.includes(a)) || col.includes(key)) {
          return true;
        }
      }
    }

    return false;
  }

  public static evaluateDataset(dataset: Dataset, records: DataRecord[]): AlarmEvent[] {
    const rules = db.getAlarmRules().filter((r) => r.isEnabled);
    if (!records.length) return [];

    const generatedEvents: AlarmEvent[] = [];
    const lowerDatasetName = dataset.name.toLowerCase();

    // 1. Check if dataset is a Section | Field | Value Consolidated Report
    const isReportFormat = ReportParser.isReportFormat(records.map((r) => r.data)) || ReportParser.isReportFormat(dataset.columns);

    if (isReportFormat) {
      const report = ReportParser.parseConsolidatedReport(records);

      // Parse structured alarm records
      report.alarms.forEach((alm, idx) => {
        generatedEvents.push({
          id: `alm_rep_${dataset.id}_${alm.id || idx}_${idx}`,
          ruleId: 'rule_report_alarm_log',
          ruleName: alm.alarmName,
          datasetId: dataset.id,
          datasetName: dataset.name,
          recordId: `rec_${dataset.id}_${alm.rowIndex}`,
          timestamp: alm.timestamp,
          metricColumn: alm.alarmName,
          actualValue: alm.numericValue !== undefined ? alm.numericValue : 1,
          thresholdValue: 0,
          condition: 'GT',
          equipmentId: alm.generatorId || 'Unit-1',
          alarmLevel: alm.severity,
          color: this.getDefaultColor(alm.severity),
          message: alm.message || `${alm.alarmName} on ${alm.generatorId}: Alert logged in report`,
          status: alm.status || 'ACTIVE',
          createdAt: new Date().toISOString(),
        });
      });

      // Parse high/critical anomaly records
      report.anomalies.forEach((anom, idx) => {
        const sev = (anom.severity || 'WARNING').toUpperCase();
        const alarmLevel: AlarmLevel = sev.includes('CRIT') ? 'CRITICAL' : sev.includes('HIGH') ? 'HIGH' : 'WARNING';
        generatedEvents.push({
          id: `anom_rep_${dataset.id}_${anom.id || idx}_${idx}`,
          ruleId: 'rule_report_anomaly',
          ruleName: `Anomaly: ${anom.metricName}`,
          datasetId: dataset.id,
          datasetName: dataset.name,
          recordId: `rec_${dataset.id}_${anom.rowIndex}`,
          timestamp: anom.timestamp || new Date().toISOString(),
          metricColumn: anom.metricName,
          actualValue: anom.numericValue !== undefined ? anom.numericValue : 1,
          thresholdValue: 0,
          condition: 'GT',
          equipmentId: anom.generatorId || 'Unit-1',
          alarmLevel,
          color: this.getDefaultColor(alarmLevel),
          message: `Anomaly detected on ${anom.generatorId} (${anom.metricName}): ${anom.numericValue !== undefined ? `${anom.numericValue} ${anom.unit}` : ''} ${anom.deviation ? `[Deviation: ${anom.deviation}]` : ''}`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        });
      });

      if (generatedEvents.length > 0) {
        const seenEv = new Set<string>();
        return generatedEvents.filter((ev) => {
          if (!ev.id || seenEv.has(ev.id)) return false;
          seenEv.add(ev.id);
          return true;
        });
      }
    }

    // 2. Check if this is an explicit Alarm Incident Log dataset (e.g. seed_alarm_history.csv)
    const hasAlarmCol = dataset.columns.some((c) => ['alarm', 'incident', 'alarm_name', 'fault'].includes(c.name.toLowerCase()));
    const hasSeverityCol = dataset.columns.some((c) => ['severity', 'alarmlevel', 'level', 'priority'].includes(c.name.toLowerCase()));

    if (hasAlarmCol || lowerDatasetName.includes('alarm') || lowerDatasetName.includes('incident')) {
      const alarmColName = dataset.columns.find((c) => ['alarm', 'incident', 'alarm_name', 'fault'].includes(c.name.toLowerCase()))?.name || 'Alarm';
      const sevColName = dataset.columns.find((c) => ['severity', 'alarmlevel', 'level', 'priority'].includes(c.name.toLowerCase()))?.name || 'Severity';
      const valColName = dataset.columns.find((c) => ['value', 'reading', 'actual'].includes(c.name.toLowerCase()))?.name || 'Value';
      const statusColName = dataset.columns.find((c) => ['status', 'state'].includes(c.name.toLowerCase()))?.name || 'Status';
      const equipColName = dataset.equipmentColumn || dataset.columns.find((c) => ['generator_id', 'equipment_id', 'unit', 'equipment'].includes(c.name.toLowerCase()))?.name || 'Generator_ID';
      const dateColName = dataset.dateColumn || dataset.columns.find((c) => c.isTimestamp || ['timestamp', 'date', 'time'].includes(c.name.toLowerCase()))?.name;

      for (const record of records) {
        const rawAlarm = record.data[alarmColName];
        if (!rawAlarm || String(rawAlarm).trim() === '') continue;

        const rawSev = (record.data[sevColName] || 'WARNING').toUpperCase();
        const alarmLevel: AlarmLevel = rawSev.includes('CRIT') ? 'CRITICAL' : rawSev.includes('HIGH') ? 'HIGH' : rawSev.includes('INFO') ? 'INFO' : 'WARNING';
        const equip = record.equipmentId || record.data[equipColName] || 'Unit-1';
        const numVal = Number(record.data[valColName]) || 0;
        const time = record.timestamp || (dateColName ? record.data[dateColName] : undefined) || new Date().toISOString();
        const rawStatus = String(record.data[statusColName] || 'ACTIVE').toUpperCase();
        const status = rawStatus.includes('RESOLV') ? 'RESOLVED' : rawStatus.includes('ACK') ? 'ACKNOWLEDGED' : 'ACTIVE';

        const recordIdentifier = record.id || `rec_${record.rowIndex}`;
        generatedEvents.push({
          id: `alm_hist_${dataset.id}_${recordIdentifier}`,
          ruleId: 'rule_incident_log',
          ruleName: String(rawAlarm),
          datasetId: dataset.id,
          datasetName: dataset.name,
          recordId: record.id,
          timestamp: typeof time === 'string' ? time : new Date(time).toISOString(),
          metricColumn: alarmColName,
          actualValue: numVal,
          thresholdValue: 0,
          condition: 'GT',
          equipmentId: String(equip),
          alarmLevel,
          color: this.getDefaultColor(alarmLevel),
          message: `${rawAlarm} on ${equip}: Recorded reading ${numVal} (Severity: ${alarmLevel})`,
          status,
          createdAt: new Date().toISOString(),
        });
      }

      if (generatedEvents.length > 0) {
        return generatedEvents;
      }
    }

    // 3. Evaluate Configurable Rules against Telemetry Columns
    const applicableRules = rules.filter((r) => !r.datasetId || r.datasetId === dataset.id);
    const metricConfigs = db.getMetricConfigs();

    for (const rule of applicableRules) {
      const metricCol = dataset.columns.find((c) => this.matchesMetric(c.name, rule.metricColumn));
      if (!metricCol) continue;

      for (const record of records) {
        const rawVal = record.data[metricCol.name];
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;

        const numVal = Number(rawVal);
        if (isNaN(numVal)) continue;

        const recordEquip = record.equipmentId || record.data[dataset.equipmentColumn || ''] || 'General';
        if (
          rule.equipmentScope &&
          rule.equipmentScope !== 'ALL' &&
          rule.equipmentScope.toLowerCase() !== String(recordEquip).toLowerCase()
        ) {
          continue;
        }

        const isTriggered = this.checkCondition(
          numVal,
          rule.condition,
          rule.thresholdValue,
          rule.secondaryThreshold
        );

        if (isTriggered) {
          const timestamp = record.timestamp || record.data[dataset.dateColumn || ''] || new Date().toISOString();
          const message = this.interpolateMessage(rule.messageTemplate, {
            threshold: rule.thresholdValue,
            secondary: rule.secondaryThreshold || 0,
            value: numVal,
            equipment: recordEquip,
            metric: metricCol.displayName || metricCol.name,
          });

          const recordIdentifier = record.id || `rec_${record.rowIndex}`;
          generatedEvents.push({
            id: `alm_rule_${dataset.id}_${rule.id}_${recordIdentifier}`,
            ruleId: rule.id,
            ruleName: rule.name,
            datasetId: dataset.id,
            datasetName: dataset.name,
            recordId: record.id,
            timestamp: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString(),
            metricColumn: metricCol.name,
            actualValue: numVal,
            thresholdValue: rule.thresholdValue,
            condition: rule.condition,
            equipmentId: String(recordEquip),
            alarmLevel: rule.alarmLevel,
            color: rule.customColor || this.getDefaultColor(rule.alarmLevel),
            message,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // 4. Evaluate Admin Metric Threshold Configurations
    const metricsToEvaluate: Array<{ key: string; name: string; unit: string; thresholds: any }> = [];

    for (const col of dataset.columns.filter((c) => c.dataType === 'numeric' && !c.isIdentifier)) {
      const baseKey = col.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const metricId = `metric_${baseKey}`;
      const datasetSpecificKey = `${dataset.id}__${metricId}`;
      const savedConfig =
        metricConfigs[datasetSpecificKey] ||
        metricConfigs[metricId] ||
        metricConfigs[`${dataset.id}__${col.name.toLowerCase()}`] ||
        metricConfigs[col.name.toLowerCase()];

      if (savedConfig?.thresholds && savedConfig.thresholds.alarmEnabled !== false) {
        metricsToEvaluate.push({
          key: col.name,
          name: savedConfig.name || col.displayName || col.name,
          unit: savedConfig.unit !== undefined ? savedConfig.unit : (col.unit || ''),
          thresholds: savedConfig.thresholds,
        });
      }
    }

    for (const metric of metricsToEvaluate) {
      const thresh = metric.thresholds;
      const metricName = metric.name;
      const unit = metric.unit;

      for (const record of records) {
        let rawVal = record.data[metric.key];
        if (rawVal === undefined || rawVal === null || rawVal === '') {
          const matchK = Object.keys(record.data).find((k) => k.toLowerCase() === metric.key.toLowerCase());
          if (matchK) rawVal = record.data[matchK];
        }
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;
        const numVal = Number(rawVal);
        if (isNaN(numVal)) continue;

        const recordEquip = record.equipmentId || record.data[dataset.equipmentColumn || ''] || 'General';
        const timestamp = record.timestamp || record.data[dataset.dateColumn || ''] || new Date().toISOString();

        const recordIdentifier = record.id || `rec_${record.rowIndex}`;
        if (thresh.criticalLimit !== undefined && thresh.criticalLimit !== null && numVal >= thresh.criticalLimit) {
          generatedEvents.push({
            id: `alm_mc_crit_${dataset.id}_${metric.key}_${recordIdentifier}`,
            ruleId: `rule_metric_${metric.key}_crit`,
            ruleName: `${metricName} Critical Alarm Limit`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            recordId: record.id || recordIdentifier,
            timestamp: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString(),
            metricColumn: metric.key,
            actualValue: Number(numVal.toFixed(2)),
            thresholdValue: thresh.criticalLimit,
            condition: 'GTE',
            equipmentId: String(recordEquip),
            alarmLevel: 'CRITICAL',
            color: thresh.criticalColor || '#EF4444',
            message: `${metricName} critical breach: ${numVal.toFixed(2)} ${unit} exceeded critical limit of ${thresh.criticalLimit} ${unit} on ${recordEquip}`,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          });
        } else if (thresh.warningLimit !== undefined && thresh.warningLimit !== null && numVal >= thresh.warningLimit) {
          generatedEvents.push({
            id: `alm_mc_warn_${dataset.id}_${metric.key}_${recordIdentifier}`,
            ruleId: `rule_metric_${metric.key}_warn`,
            ruleName: `${metricName} Warning Threshold`,
            datasetId: dataset.id,
            datasetName: dataset.name,
            recordId: record.id || recordIdentifier,
            timestamp: typeof timestamp === 'string' ? timestamp : new Date(timestamp).toISOString(),
            metricColumn: metric.key,
            actualValue: Number(numVal.toFixed(2)),
            thresholdValue: thresh.warningLimit,
            condition: 'GTE',
            equipmentId: String(recordEquip),
            alarmLevel: 'WARNING',
            color: thresh.warningColor || '#F59E0B',
            message: `${metricName} warning advisory: ${numVal.toFixed(2)} ${unit} exceeded warning limit of ${thresh.warningLimit} ${unit} on ${recordEquip}`,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    return generatedEvents;
  }

  public static checkCondition(
    val: number,
    cond: AlarmRule['condition'],
    thresh1: number,
    thresh2?: number
  ): boolean {
    switch (cond) {
      case 'GT':
        return val > thresh1;
      case 'GTE':
        return val >= thresh1;
      case 'LT':
        return val < thresh1;
      case 'LTE':
        return val <= thresh1;
      case 'EQ':
        return Math.abs(val - thresh1) < 0.0001;
      case 'BETWEEN':
        if (thresh2 === undefined) return val >= thresh1;
        const min = Math.min(thresh1, thresh2);
        const max = Math.max(thresh1, thresh2);
        return val >= min && val <= max;
      case 'OUTSIDE':
        if (thresh2 === undefined) return val < thresh1;
        const oMin = Math.min(thresh1, thresh2);
        const oMax = Math.max(thresh1, thresh2);
        return val < oMin || val > oMax;
      default:
        return false;
    }
  }

  private static interpolateMessage(template: string, vars: Record<string, any>): string {
    let res = template;
    for (const [key, val] of Object.entries(vars)) {
      res = res.replace(new RegExp(`{{${key}}}`, 'g'), String(val));
    }
    return res;
  }

  private static getDefaultColor(level: AlarmRule['alarmLevel']): string {
    switch (level) {
      case 'CRITICAL':
        return '#EF4444';
      case 'HIGH':
        return '#F97316';
      case 'WARNING':
        return '#F59E0B';
      case 'NORMAL':
        return '#10B981';
      case 'INFO':
      default:
        return '#3B82F6';
    }
  }
}
