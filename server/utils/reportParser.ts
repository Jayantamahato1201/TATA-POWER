import { AlarmLevel, AlarmStatus, MetricCategory, ColumnMetadata } from '../types/index.js';
import { extractUnitAndName, normalizeUnit, classifyCategory } from './unitDetector.js';

export interface ParsedKPIRecord {
  field: string;
  displayName: string;
  numericValue?: number;
  unit: string;
  category: MetricCategory;
  rawValue: string;
}

export interface ParsedAlarmRecord {
  id: string;
  rowIndex: number;
  timestamp: string;
  date?: string;
  generatorId: string;
  alarmName: string;
  severity: AlarmLevel;
  status: AlarmStatus;
  numericValue?: number;
  unit: string;
  message?: string;
  rawData: Record<string, any>;
}

export interface ParsedMaintenanceRecord {
  id: string;
  rowIndex: number;
  date?: string;
  equipment: string;
  type: string;
  status: string;
  costInr?: number;
  technician?: string;
  durationHrs?: number;
  notes?: string;
  rawData: Record<string, any>;
}

export interface ParsedAnomalyRecord {
  id: string;
  rowIndex: number;
  timestamp?: string;
  date?: string;
  generatorId: string;
  metricName: string;
  numericValue?: number;
  unit: string;
  severity?: string;
  deviation?: string;
  rawData: Record<string, any>;
}

export interface ParsedReportData {
  isReport: boolean;
  kpis: ParsedKPIRecord[];
  alarms: ParsedAlarmRecord[];
  maintenance: ParsedMaintenanceRecord[];
  anomalies: ParsedAnomalyRecord[];
  meta: Record<string, string>;
  alarmMetricGroups: Record<
    string,
    {
      alarmName: string;
      displayName: string;
      unit: string;
      category: MetricCategory;
      records: ParsedAlarmRecord[];
    }
  >;
  anomalyMetricGroups: Record<
    string,
    {
      metricName: string;
      displayName: string;
      unit: string;
      category: MetricCategory;
      records: ParsedAnomalyRecord[];
    }
  >;
  maintenanceSummary: {
    totalCostInr: number;
    count: number;
    byEquipment: Record<string, { count: number; totalCost: number }>;
  };
}

export class ReportParser {
  /**
   * Detects if the dataset or rows follow Section | Field | Value report structure
   */
  public static isReportFormat(rowsOrCols: Record<string, any>[] | ColumnMetadata[]): boolean {
    if (!rowsOrCols || rowsOrCols.length === 0) return false;

    let keys: string[] = [];
    if ('name' in rowsOrCols[0]) {
      keys = (rowsOrCols as ColumnMetadata[]).map((c) => c.name.toLowerCase().trim());
    } else {
      keys = Object.keys(rowsOrCols[0]).map((k) => k.toLowerCase().trim());
    }

    const hasSection = keys.some((k) => k === 'section' || k.includes('section'));
    const hasField = keys.some((k) => k === 'field' || k === 'parameter' || k === 'metric' || k === 'metric_name');
    const hasValue = keys.some((k) => k === 'value' || k === 'reading' || k === 'amount');

    return (hasSection && hasField && hasValue) || (hasField && hasValue);
  }

  /**
   * Parses pipe-separated or colon/equal-separated key-value strings into structured dictionary
   * e.g. "Date=2026-08-15 | Timestamp=2026-08-15 02:30:00 | Generator_ID=Unit-2 (120 MW) | Alarm=Over Temperature | Severity=CRITICAL | Status=ACTIVE | Value=97.7 | Unit=°C"
   */
  public static parsePipeSeparatedValue(rawStr: any): Record<string, any> {
    if (rawStr === undefined || rawStr === null) return {};
    if (typeof rawStr !== 'string') return { value: rawStr };

    const str = rawStr.trim();
    if (!str) return {};

    const result: Record<string, any> = {};

    // Check if contains pipe delimiter
    const delimiter = str.includes('|') ? '|' : (str.includes(';') ? ';' : (str.includes(',') && str.includes('=') ? ',' : null));

    if (delimiter) {
      const parts = str.split(delimiter);
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;

        // Split on first '=' or ':'
        let sepIdx = trimmed.indexOf('=');
        if (sepIdx === -1) {
          sepIdx = trimmed.indexOf(':');
        }

        if (sepIdx !== -1) {
          const rawKey = trimmed.substring(0, sepIdx).trim();
          const rawVal = trimmed.substring(sepIdx + 1).trim();
          if (rawKey) {
            result[rawKey] = rawVal;
          }
        } else {
          // If a standalone token exists
          result[`token_${Object.keys(result).length + 1}`] = trimmed;
        }
      }
    } else if (str.includes('=') || (str.includes(':') && !str.includes('http') && !/^\d{1,2}:\d{2}/.test(str))) {
      const sepIdx = str.includes('=') ? str.indexOf('=') : str.indexOf(':');
      const rawKey = str.substring(0, sepIdx).trim();
      const rawVal = str.substring(sepIdx + 1).trim();
      if (rawKey) {
        result[rawKey] = rawVal;
      }
    } else {
      result['value'] = str;
    }

    return result;
  }

  /**
   * Robust number and unit extractor for mixed strings (e.g. "1240.5 MW", "97.7 °C", "₹4,50,000", "82.4%")
   */
  public static extractNumericAndUnit(val: any): { numericValue?: number; unit: string; rawString: string } {
    if (val === undefined || val === null) {
      return { numericValue: undefined, unit: '', rawString: '' };
    }

    if (typeof val === 'number') {
      return { numericValue: isNaN(val) ? undefined : val, unit: '', rawString: String(val) };
    }

    const strVal = String(val).trim();
    if (!strVal) {
      return { numericValue: undefined, unit: '', rawString: '' };
    }

    // Clean currency symbols or commas: e.g. "₹450,000" -> "450000 INR"
    let cleaned = strVal.replace(/,/g, '');
    let detectedUnit = '';

    if (cleaned.includes('₹') || cleaned.toLowerCase().includes('inr') || cleaned.toLowerCase().includes('rs')) {
      detectedUnit = 'INR';
      cleaned = cleaned.replace(/₹|inr|rs\.?/gi, '').trim();
    } else if (cleaned.includes('$') || cleaned.toLowerCase().includes('usd')) {
      detectedUnit = 'USD';
      cleaned = cleaned.replace(/\$|usd/gi, '').trim();
    } else if (cleaned.includes('€') || cleaned.toLowerCase().includes('eur')) {
      detectedUnit = 'EUR';
      cleaned = cleaned.replace(/€|eur/gi, '').trim();
    }

    // Match float/integer number from string
    const match = cleaned.match(/([+-]?[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/);
    if (match && match.index !== undefined) {
      const num = parseFloat(match[1]);
      if (!isNaN(num)) {
        if (!detectedUnit) {
          // Extract text outside number
          const before = cleaned.substring(0, match.index).trim();
          const after = cleaned.substring(match.index + match[1].length).trim();
          const candidateUnit = (after || before).replace(/^[\[\(\{]/, '').replace(/[\]\)\}]$/, '').trim();
          const normalized = normalizeUnit(candidateUnit, strVal);
          detectedUnit = normalized || candidateUnit;
        }
        return {
          numericValue: num,
          unit: detectedUnit || '',
          rawString: strVal,
        };
      }
    }

    return { numericValue: undefined, unit: detectedUnit || '', rawString: strVal };
  }

  /**
   * Parses an entire array of raw rows or DataRecords from a Section | Field | Value consolidated report
   */
  public static parseConsolidatedReport(rows: any[]): ParsedReportData {
    const isReport = this.isReportFormat(rows);

    const kpis: ParsedKPIRecord[] = [];
    const alarms: ParsedAlarmRecord[] = [];
    const maintenance: ParsedMaintenanceRecord[] = [];
    const anomalies: ParsedAnomalyRecord[] = [];
    const meta: Record<string, string> = {};

    const alarmMetricGroups: ParsedReportData['alarmMetricGroups'] = {};
    const anomalyMetricGroups: ParsedReportData['anomalyMetricGroups'] = {};

    let totalCostInr = 0;
    const maintenanceByEquip: Record<string, { count: number; totalCost: number }> = {};

    if (!rows || rows.length === 0) {
      return {
        isReport,
        kpis,
        alarms,
        maintenance,
        anomalies,
        meta,
        alarmMetricGroups,
        anomalyMetricGroups,
        maintenanceSummary: { totalCostInr: 0, count: 0, byEquipment: {} },
      };
    }

    rows.forEach((rowObj, idx) => {
      const r = rowObj.data ? rowObj.data : rowObj;
      const rowIndex = rowObj.rowIndex || idx + 1;

      // Extract section, field, value case-insensitively
      let section = '';
      let field = '';
      let value: any = '';

      for (const [k, v] of Object.entries(r)) {
        const lowerK = k.toLowerCase().trim();
        if (lowerK === 'section' || lowerK.includes('section')) {
          section = String(v || '').trim();
        } else if (lowerK === 'field' || lowerK === 'parameter' || lowerK === 'metric' || lowerK === 'metric_name' || lowerK === 'key') {
          field = String(v || '').trim();
        } else if (lowerK === 'value' || lowerK === 'reading' || lowerK === 'amount' || lowerK === 'val') {
          value = v;
        }
      }

      if (!field && !section) {
        // Fallback for single-field rows
        const entries = Object.entries(r);
        if (entries.length === 1) {
          field = entries[0][0];
          value = entries[0][1];
          section = 'KPI';
        }
      }

      const lowerSec = section.toLowerCase();
      const strVal = String(value || '').trim();

      // 1. META / METADATA SECTION
      if (lowerSec === 'meta' || lowerSec === 'metadata' || lowerSec.includes('source') || lowerSec === 'file_info') {
        if (field) {
          meta[field] = strVal;
        }
        return;
      }

      // 2. ALARM SECTION
      if (lowerSec === 'alarm' || lowerSec === 'alarms' || lowerSec.includes('fault') || lowerSec.includes('trip') || lowerSec.includes('incident')) {
        const parsedMap = this.parsePipeSeparatedValue(strVal);

        // Find keys with fuzzy matching
        const findKey = (candidates: string[]): any => {
          for (const cand of candidates) {
            for (const [k, v] of Object.entries(parsedMap)) {
              if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cand.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                return v;
              }
            }
          }
          return undefined;
        };

        const rawDate = findKey(['date', 'alarm_date', 'event_date', 'occurred_date']);
        const rawTime = findKey(['timestamp', 'time', 'alarm_time', 'datetime', 'ts']);
        const rawEquip = findKey(['generator_id', 'equipment_id', 'equipment', 'unit', 'generator', 'asset', 'machine', 'tag']);
        const rawAlarm = findKey(['alarm', 'alarm_name', 'metric', 'incident', 'fault', 'parameter', 'name', 'type']) || field || 'Alarm Event';
        const rawSev = findKey(['severity', 'alarmlevel', 'level', 'priority']);
        const rawStatus = findKey(['status', 'state', 'alarm_status']);
        const rawVal = findKey(['value', 'reading', 'actual', 'val', 'actual_value', 'temp', 'temperature', 'vibration', 'power', 'pressure']);
        const rawUnit = findKey(['unit', 'uom', 'engineering_unit']);

        // Construct standardized timestamp
        let combinedTimestamp = new Date().toISOString();
        if (rawTime && rawDate && !String(rawTime).includes('-') && !String(rawTime).includes('/')) {
          combinedTimestamp = `${rawDate} ${rawTime}`;
        } else if (rawTime) {
          combinedTimestamp = String(rawTime);
        } else if (rawDate) {
          combinedTimestamp = String(rawDate);
        }

        // Severity normalization
        const sevStr = String(rawSev || 'WARNING').toUpperCase();
        let severity: AlarmLevel = 'WARNING';
        if (sevStr.includes('CRIT')) severity = 'CRITICAL';
        else if (sevStr.includes('HIGH')) severity = 'HIGH';
        else if (sevStr.includes('INFO') || sevStr.includes('LOW')) severity = 'INFO';

        // Status normalization
        const statusStr = String(rawStatus || 'ACTIVE').toUpperCase();
        let status: AlarmStatus = 'ACTIVE';
        if (statusStr.includes('RESOLV')) status = 'RESOLVED';
        else if (statusStr.includes('ACK')) status = 'ACKNOWLEDGED';

        // Value & unit extraction
        const extracted = this.extractNumericAndUnit(rawVal !== undefined ? rawVal : strVal);
        const finalUnit = rawUnit ? (normalizeUnit(rawUnit, String(rawAlarm)) || rawUnit) : (extracted.unit || '');
        const numVal = extracted.numericValue;
        const generatorId = String(rawEquip || 'GEN-01').trim();
        const alarmName = String(rawAlarm).trim();

        const alarmRecord: ParsedAlarmRecord = {
          id: `alm_rec_${rowIndex}_${idx}`,
          rowIndex,
          timestamp: combinedTimestamp,
          date: rawDate ? String(rawDate) : undefined,
          generatorId,
          alarmName,
          severity,
          status,
          numericValue: numVal,
          unit: finalUnit,
          message: `${alarmName} on ${generatorId}: Recorded reading ${numVal !== undefined ? `${numVal} ${finalUnit}` : 'Alarm triggered'} (${severity})`,
          rawData: { ...parsedMap, Section: section, Field: field, RawValue: strVal },
        };

        alarms.push(alarmRecord);

        // Group alarm numeric records by metric/alarm name
        if (numVal !== undefined) {
          const groupKey = alarmName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (!alarmMetricGroups[groupKey]) {
            const extractedMetric = extractUnitAndName(alarmName, finalUnit);
            alarmMetricGroups[groupKey] = {
              alarmName,
              displayName: extractedMetric.cleanName || alarmName,
              unit: finalUnit || extractedMetric.unit || '',
              category: extractedMetric.category,
              records: [],
            };
          }
          alarmMetricGroups[groupKey].records.push(alarmRecord);
        }
        return;
      }

      // 3. MAINTENANCE SECTION
      if (lowerSec === 'maintenance' || lowerSec.includes('maint') || lowerSec.includes('service') || lowerSec.includes('work_order')) {
        const parsedMap = this.parsePipeSeparatedValue(strVal);

        const findKey = (candidates: string[]): any => {
          for (const cand of candidates) {
            for (const [k, v] of Object.entries(parsedMap)) {
              if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cand.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                return v;
              }
            }
          }
          return undefined;
        };

        const rawDate = findKey(['date', 'service_date', 'scheduled_date', 'completion_date', 'timestamp']);
        const rawEquip = findKey(['equipment', 'generator_id', 'equipment_id', 'unit', 'asset', 'machine']) || 'General Plant';
        const rawType = findKey(['type', 'task', 'activity', 'maintenance_type', 'description', 'work_order']) || field || 'Maintenance Activity';
        const rawStatus = findKey(['status', 'state']) || 'Completed';
        const rawCost = findKey(['cost_inr', 'cost', 'cost_rs', 'expense', 'amount', 'total_cost', 'cost_usd']);
        const rawTech = findKey(['technician', 'engineer', 'lead', 'vendor', 'contractor', 'assigned_to']);
        const rawDuration = findKey(['duration_hrs', 'duration', 'hours', 'time_spent']);
        const rawNotes = findKey(['notes', 'remarks', 'comment', 'summary']);

        const costExtracted = this.extractNumericAndUnit(rawCost);
        const costVal = costExtracted.numericValue;

        const durationExtracted = this.extractNumericAndUnit(rawDuration);
        const durationVal = durationExtracted.numericValue;

        if (costVal !== undefined) {
          totalCostInr += costVal;
          const eqKey = String(rawEquip);
          if (!maintenanceByEquip[eqKey]) {
            maintenanceByEquip[eqKey] = { count: 0, totalCost: 0 };
          }
          maintenanceByEquip[eqKey].count += 1;
          maintenanceByEquip[eqKey].totalCost += costVal;
        }

        maintenance.push({
          id: `maint_rec_${rowIndex}_${idx}`,
          rowIndex,
          date: rawDate ? String(rawDate) : undefined,
          equipment: String(rawEquip),
          type: String(rawType),
          status: String(rawStatus),
          costInr: costVal,
          technician: rawTech ? String(rawTech) : undefined,
          durationHrs: durationVal,
          notes: rawNotes ? String(rawNotes) : undefined,
          rawData: { ...parsedMap, Section: section, Field: field, RawValue: strVal },
        });
        return;
      }

      // 4. ANOMALY SECTION
      if (lowerSec === 'anomaly' || lowerSec === 'anomalies' || lowerSec.includes('anomaly') || lowerSec.includes('deviation')) {
        const parsedMap = this.parsePipeSeparatedValue(strVal);

        const findKey = (candidates: string[]): any => {
          for (const cand of candidates) {
            for (const [k, v] of Object.entries(parsedMap)) {
              if (k.toLowerCase().replace(/[^a-z0-9]/g, '') === cand.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                return v;
              }
            }
          }
          return undefined;
        };

        const rawDate = findKey(['date', 'anomaly_date', 'occurred_date']);
        const rawTime = findKey(['timestamp', 'time', 'datetime', 'ts']);
        const rawEquip = findKey(['generator_id', 'equipment_id', 'equipment', 'unit', 'generator']) || 'GEN-01';
        const rawMetric = findKey(['metric', 'parameter', 'metric_name', 'sensor', 'name', 'type']) || field || 'Anomaly';
        const rawVal = findKey(['value', 'reading', 'actual', 'deviation_value']);
        const rawUnit = findKey(['unit', 'uom']);
        const rawSev = findKey(['severity', 'level', 'priority']);
        const rawDev = findKey(['deviation', 'delta', 'variance', 'percentage']);

        let combinedTimestamp = rawTime && rawDate && !String(rawTime).includes('-') ? `${rawDate} ${rawTime}` : String(rawTime || rawDate || new Date().toISOString());

        const extracted = this.extractNumericAndUnit(rawVal !== undefined ? rawVal : strVal);
        const finalUnit = rawUnit ? (normalizeUnit(rawUnit, String(rawMetric)) || rawUnit) : (extracted.unit || '');
        const numVal = extracted.numericValue;

        const anomalyRecord: ParsedAnomalyRecord = {
          id: `anom_rec_${rowIndex}_${idx}`,
          rowIndex,
          timestamp: combinedTimestamp,
          date: rawDate ? String(rawDate) : undefined,
          generatorId: String(rawEquip),
          metricName: String(rawMetric),
          numericValue: numVal,
          unit: finalUnit,
          severity: rawSev ? String(rawSev) : undefined,
          deviation: rawDev ? String(rawDev) : undefined,
          rawData: { ...parsedMap, Section: section, Field: field, RawValue: strVal },
        };

        anomalies.push(anomalyRecord);

        if (numVal !== undefined) {
          const groupKey = String(rawMetric).toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (!anomalyMetricGroups[groupKey]) {
            const extractedMetric = extractUnitAndName(String(rawMetric), finalUnit);
            anomalyMetricGroups[groupKey] = {
              metricName: String(rawMetric),
              displayName: extractedMetric.cleanName || String(rawMetric),
              unit: finalUnit || extractedMetric.unit || '',
              category: extractedMetric.category,
              records: [],
            };
          }
          anomalyMetricGroups[groupKey].records.push(anomalyRecord);
        }
        return;
      }

      // 5. KPI / SUMMARY / PERFORMANCE SECTION (Default for all other Section | Field | Value rows)
      if (field) {
        // If value has pipe-separated data, check if it contains a value
        let actualValString = strVal;
        let candidateUnit = '';

        if (strVal.includes('|') || strVal.includes('=')) {
          const parsed = this.parsePipeSeparatedValue(strVal);
          if (parsed['value'] !== undefined || parsed['Value'] !== undefined || parsed['reading'] !== undefined) {
            actualValString = String(parsed['value'] || parsed['Value'] || parsed['reading']);
          }
          if (parsed['unit'] || parsed['Unit']) {
            candidateUnit = String(parsed['unit'] || parsed['Unit']);
          }
        }

        const extracted = this.extractNumericAndUnit(actualValString);
        const metricInfo = extractUnitAndName(field, candidateUnit || extracted.unit);
        const finalUnit = candidateUnit ? (normalizeUnit(candidateUnit, field) || candidateUnit) : (extracted.unit || metricInfo.unit || '');

        kpis.push({
          field,
          displayName: metricInfo.cleanName || field,
          numericValue: extracted.numericValue,
          unit: finalUnit,
          category: metricInfo.category,
          rawValue: strVal,
        });
      }
    });

    return {
      isReport,
      kpis,
      alarms,
      maintenance,
      anomalies,
      meta,
      alarmMetricGroups,
      anomalyMetricGroups,
      maintenanceSummary: {
        totalCostInr,
        count: maintenance.length,
        byEquipment: maintenanceByEquip,
      },
    };
  }
}
