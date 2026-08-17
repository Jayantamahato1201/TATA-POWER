import { db } from '../db/database.js';
import {
  TemperatureThresholdConfig,
  TemperatureDataPoint,
  TemperatureAnalyticsPayload,
  TemperatureStatus,
  TemperatureAlarmItem,
} from '../types/index.js';

export class Temperature3DService {
  /**
   * Resolve appropriate temperature column from dataset columns or record keys
   */
  public static resolveTemperatureColumn(
    datasetId?: string,
    configuredColumn?: string
  ): string {
    const dataset = datasetId ? db.getDatasetById(datasetId) : db.getDatasets()[0];
    const columns = dataset?.columns || [];

    if (configuredColumn && columns.some((c) => c.name.toLowerCase() === configuredColumn.toLowerCase())) {
      return configuredColumn;
    }

    // Try common temperature field patterns in power plant telemetry
    const tempCol = columns.find((c) =>
      /^(temperature|temp|temp_c|temperature_c|deg_c|t_exhaust|bearing_temp|oil_temp|stator_temp|boiler_temp)$/i.test(
        c.name
      )
    ) || columns.find((c) => /temp/i.test(c.name) && (c.dataType === 'numeric' || (c as any).type === 'number'));

    if (tempCol) return tempCol.name;

    // First numeric column fallback
    const firstNum = columns.find((c) => c.dataType === 'numeric' || (c as any).type === 'number');
    return firstNum ? firstNum.name : 'temperature';
  }

  /**
   * Resolve timestamp/sequence column
   */
  public static resolveTimestampColumn(
    datasetId?: string,
    configuredColumn?: string
  ): string {
    const dataset = datasetId ? db.getDatasetById(datasetId) : db.getDatasets()[0];
    const columns = dataset?.columns || [];

    if (configuredColumn && columns.some((c) => c.name.toLowerCase() === configuredColumn.toLowerCase())) {
      return configuredColumn;
    }

    const dateCol = columns.find((c) => c.dataType === 'datetime' || (c as any).type === 'date') ||
      columns.find((c) => /^(timestamp|time|datetime|date|recorded_at)$/i.test(c.name));

    return dateCol ? dateCol.name : 'timestamp';
  }

  /**
   * Resolve equipment dimension column
   */
  public static resolveEquipmentColumn(
    datasetId?: string,
    configuredColumn?: string
  ): string {
    const dataset = datasetId ? db.getDatasetById(datasetId) : db.getDatasets()[0];
    const columns = dataset?.columns || [];

    if (configuredColumn && columns.some((c) => c.name.toLowerCase() === configuredColumn.toLowerCase())) {
      return configuredColumn;
    }

    const eqCol = columns.find((c) =>
      /^(equipment|equipment_id|unit|unit_id|turbine|generator|subsystem|area)$/i.test(c.name)
    );

    return eqCol ? eqCol.name : 'equipment';
  }

  /**
   * Main 3D Analytics calculation engine strictly from uploaded data
   */
  public static calculate3DAnalytics(
    datasetId?: string,
    filters?: {
      equipment?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    customConfig?: Partial<TemperatureThresholdConfig>
  ): TemperatureAnalyticsPayload {
    // 1. Get active or default dataset
    const datasets = db.getDatasets();
    const activeDataset = datasetId
      ? db.getDatasetById(datasetId)
      : datasets[0];

    // 2. Get baseline configuration
    const savedConfig = db.getTemperatureConfig(activeDataset?.id);
    const config: TemperatureThresholdConfig = {
      ...savedConfig,
      ...(customConfig || {}),
    };

    // 3. Fallback if dataset empty
    if (!activeDataset) {
      return {
        config,
        points: [],
        alarms: [],
        summary: {
          total: 0,
          aboveCount: 0,
          normalCount: 0,
          belowCount: 0,
          abovePercent: 0,
          normalPercent: 0,
          belowPercent: 0,
          minTemp: 0,
          maxTemp: 0,
          avgTemp: 0,
          activeAlarmsCount: 0,
        },
        equipmentList: [],
        xCategories: [],
        metricColumn: config.metricColumn || 'temperature',
        unit: config.unit || '°C',
      };
    }

    // 4. Resolve exact columns
    const metricCol = this.resolveTemperatureColumn(activeDataset.id, config.metricColumn);
    const timeCol = this.resolveTimestampColumn(activeDataset.id, config.timestampColumn);
    const eqCol = this.resolveEquipmentColumn(activeDataset.id, config.equipmentColumn);

    config.metricColumn = metricCol;
    config.timestampColumn = timeCol;
    config.equipmentColumn = eqCol;

    // 5. Fetch all raw records for this dataset
    const allRecords = db.getRecords(activeDataset.id);

    // 6. Collect equipment list across records
    const eqSet = new Set<string>();
    allRecords.forEach((r) => {
      const eq = r.data[eqCol] || r.data['equipment'] || r.data['equipment_id'] || r.data['Unit'] || 'Unit 1';
      if (eq) eqSet.add(String(eq));
    });
    const equipmentList = Array.from(eqSet).sort();
    if (equipmentList.length === 0) equipmentList.push('General');

    // 7. Filter and Map Points & Alarms
    const points: TemperatureDataPoint[] = [];
    const alarms: TemperatureAlarmItem[] = [];
    const xCategories: string[] = [];

    let totalTempSum = 0;
    let minTemp = Number.POSITIVE_INFINITY;
    let maxTemp = Number.NEGATIVE_INFINITY;
    let aboveCount = 0;
    let normalCount = 0;
    let belowCount = 0;

    const monitoringEnabled = config.enableMonitoring !== false;
    const aboveAlarmEnabled = config.enableAboveAlarm !== false;
    const belowAlarmEnabled = config.enableBelowAlarm !== false;

    allRecords.forEach((rec, idx) => {
      const data = rec.data;

      // Extract raw temperature value
      let rawVal = data[metricCol];
      if (rawVal === undefined || rawVal === null || rawVal === '') {
        // Look in case-insensitive keys
        const matchKey = Object.keys(data).find(
          (k) => k.toLowerCase() === metricCol.toLowerCase()
        );
        if (matchKey) rawVal = data[matchKey];
      }

      const tempValue = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal));

      // Skip non-numeric entries
      if (isNaN(tempValue)) return;

      // Extract equipment
      const rawEq = data[eqCol] || data['equipment'] || data['equipment_id'] || data['Unit'] || 'Unit 1';
      const equipmentStr = String(rawEq || 'Unit 1');

      // Equipment filter
      if (filters?.equipment && filters.equipment !== 'ALL' && equipmentStr !== filters.equipment) {
        return;
      }

      // Extract timestamp / sequence label
      const rawTime = data[timeCol] || rec.timestamp || `T-${idx + 1}`;
      const timeStr = String(rawTime);

      // Date range filter if valid dates
      if (filters?.startDate || filters?.endDate) {
        const timeNum = Date.parse(timeStr);
        if (!isNaN(timeNum)) {
          if (filters?.startDate && timeNum < Date.parse(filters.startDate)) return;
          if (filters?.endDate && timeNum > Date.parse(filters.endDate)) return;
        }
      }

      // Strict Three-Category Classification
      // 1. ABOVE: > aboveThreshold
      // 2. BELOW: < belowThreshold
      // 3. NORMAL: >= normalMin && <= normalMax
      let status: TemperatureStatus;
      let statusLabel: string;
      let color: string;

      if (tempValue > config.aboveThreshold) {
        status = 'ABOVE';
        statusLabel = config.aboveLabel || 'ABOVE TEMPERATURE';
        color = config.aboveColor || '#EF4444';
        aboveCount++;
      } else if (tempValue < config.belowThreshold) {
        status = 'BELOW';
        statusLabel = config.belowLabel || 'BELOW TEMPERATURE';
        color = config.belowColor || '#06B6D4';
        belowCount++;
      } else {
        status = 'NORMAL';
        statusLabel = config.normalLabel || 'NORMAL TEMPERATURE';
        color = config.normalColor || '#00FF41';
        normalCount++;
      }

      // Generate Dynamic Alarm if abnormal and enabled
      if (monitoringEnabled) {
        if (status === 'ABOVE' && aboveAlarmEnabled) {
          alarms.push({
            id: `alarm_above_${rec.id || idx}`,
            pointId: `temp_pt_${rec.id || idx}`,
            rowIndex: idx + 1,
            timestamp: timeStr,
            equipment: equipmentStr,
            actualTemperature: Number(tempValue.toFixed(2)),
            configuredThreshold: config.aboveThreshold,
            thresholdType: 'ABOVE',
            status: 'ABOVE',
            statusLabel: 'HIGH TEMPERATURE ALERT',
            alarmLevel: config.aboveAlarmSeverity || 'CRITICAL',
            color: config.aboveColor || '#EF4444',
            message: `Actual Temperature: ${tempValue.toFixed(1)}${config.unit || '°C'} exceeded limit of ${config.aboveThreshold}${config.unit || '°C'} on ${equipmentStr}`,
            datasetName: activeDataset.name,
            datasetId: activeDataset.id,
            isAcknowledged: false,
            isResolved: false,
            createdAt: new Date().toISOString(),
          });
        } else if (status === 'BELOW' && belowAlarmEnabled) {
          alarms.push({
            id: `alarm_below_${rec.id || idx}`,
            pointId: `temp_pt_${rec.id || idx}`,
            rowIndex: idx + 1,
            timestamp: timeStr,
            equipment: equipmentStr,
            actualTemperature: Number(tempValue.toFixed(2)),
            configuredThreshold: config.belowThreshold,
            thresholdType: 'BELOW',
            status: 'BELOW',
            statusLabel: 'LOW TEMPERATURE WARNING',
            alarmLevel: config.belowAlarmSeverity || 'WARNING',
            color: config.belowColor || '#06B6D4',
            message: `Actual Temperature: ${tempValue.toFixed(1)}${config.unit || '°C'} dropped below lower limit of ${config.belowThreshold}${config.unit || '°C'} on ${equipmentStr}`,
            datasetName: activeDataset.name,
            datasetId: activeDataset.id,
            isAcknowledged: false,
            isResolved: false,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // Status filter
      if (filters?.status && filters.status !== 'ALL' && status !== filters.status) {
        return;
      }

      // Track min/max/avg
      totalTempSum += tempValue;
      if (tempValue < minTemp) minTemp = tempValue;
      if (tempValue > maxTemp) maxTemp = tempValue;

      // Track xCategories
      if (!xCategories.includes(timeStr)) {
        xCategories.push(timeStr);
      }
      const xIdx = xCategories.indexOf(timeStr);
      const eqIdx = Math.max(0, equipmentList.indexOf(equipmentStr));

      points.push({
        id: `temp_pt_${rec.id || idx}`,
        rowIndex: idx,
        timestamp: timeStr,
        xLabel: timeStr,
        xIndex: xIdx,
        equipment: equipmentStr,
        equipmentIndex: eqIdx,
        temperature: Number(tempValue.toFixed(2)),
        status,
        statusLabel,
        color,
        data: rec.data,
      });
    });

    const totalValidPoints = points.length;
    const avgTemp = totalValidPoints > 0 ? Number((totalTempSum / totalValidPoints).toFixed(2)) : 0;
    const resolvedMin = totalValidPoints > 0 ? Number(minTemp.toFixed(2)) : 0;
    const resolvedMax = totalValidPoints > 0 ? Number(maxTemp.toFixed(2)) : 0;

    const abovePercent = totalValidPoints > 0 ? Number(((aboveCount / totalValidPoints) * 100).toFixed(1)) : 0;
    const normalPercent = totalValidPoints > 0 ? Number(((normalCount / totalValidPoints) * 100).toFixed(1)) : 0;
    const belowPercent = totalValidPoints > 0 ? Number(((belowCount / totalValidPoints) * 100).toFixed(1)) : 0;

    return {
      config,
      points,
      alarms,
      summary: {
        total: totalValidPoints,
        aboveCount,
        normalCount,
        belowCount,
        abovePercent,
        normalPercent,
        belowPercent,
        minTemp: resolvedMin,
        maxTemp: resolvedMax,
        avgTemp,
        activeAlarmsCount: alarms.length,
      },
      equipmentList,
      xCategories,
      metricColumn: metricCol,
      unit: config.unit || '°C',
    };
  }
}
