import { Router } from 'express';
import { db } from '../db/database.js';
import { AlarmRule, AlarmCondition, AlarmLevel } from '../types/index.js';
import { AlarmEvaluationService } from '../services/alarmEvaluationService.js';
import { authenticate, optionalAuth, AuthRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// GET all alarm rules
router.get('/rules', optionalAuth, (req: AuthRequest, res) => {
  const rules = db.getAlarmRules();
  res.json({ rules });
});

// POST Create new alarm rule
router.post('/rules', optionalAuth, (req: AuthRequest, res) => {
  const {
    name,
    datasetId,
    metricColumn,
    equipmentScope,
    condition,
    thresholdValue,
    secondaryThreshold,
    alarmLevel,
    customColor,
    priority,
    messageTemplate,
    isEnabled,
  } = req.body;

  if (!name || !metricColumn || !condition || thresholdValue === undefined) {
    return res.status(400).json({ error: 'Name, metric column, condition, and threshold value are required.' });
  }

  const cleanMetric = metricColumn.trim();
  const cleanScope = (equipmentScope || 'ALL').trim();
  const cleanDatasetId = datasetId || undefined;

  // Check if identical rule already exists
  const existingRules = db.getAlarmRules();
  const duplicateRule = existingRules.find(
    (r) =>
      (r.datasetId || undefined) === cleanDatasetId &&
      r.metricColumn.toLowerCase() === cleanMetric.toLowerCase() &&
      r.condition === condition &&
      (r.equipmentScope || 'ALL').toLowerCase() === cleanScope.toLowerCase()
  );

  if (duplicateRule) {
    return res.status(409).json({
      error: `An alarm rule already exists for metric "${cleanMetric}" with condition "${condition}" on scope "${cleanScope}" (Rule ID: ${duplicateRule.id}, Name: "${duplicateRule.name}"). Please update the existing rule instead of creating a duplicate.`,
      code: 'DUPLICATE_RULE',
      existingRule: duplicateRule,
    });
  }

  const user = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Operator',
    email: 'operator@tatapower.com',
  };

  const newRule: AlarmRule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    datasetId: cleanDatasetId,
    metricColumn: cleanMetric,
    equipmentScope: cleanScope,
    condition: condition as AlarmCondition,
    thresholdValue: Number(thresholdValue),
    secondaryThreshold: secondaryThreshold !== undefined ? Number(secondaryThreshold) : undefined,
    alarmLevel: (alarmLevel as AlarmLevel) || 'WARNING',
    customColor: customColor || '#EF4444',
    priority: Number(priority) || 1,
    messageTemplate:
      messageTemplate ||
      `${name}: ${metricColumn} violated threshold {{threshold}} (Value: {{value}}) on {{equipment}}`,
    isEnabled: isEnabled !== undefined ? isEnabled : true,
    createdBy: user.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addAlarmRule(newRule);

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARM_RULE_CREATED',
    details: `Created alarm rule "${newRule.name}" for metric [${newRule.metricColumn}] ${newRule.condition} ${newRule.thresholdValue}`,
    entityType: 'ALARM_RULE',
    entityId: newRule.id,
  });

  // Automatically trigger re-evaluation across active datasets
  reEvaluateAllAlarms();

  res.status(201).json({ rule: newRule });
});

// PUT Update alarm rule (allows daily threshold edits e.g. changing 30°C to 35°C without changing code)
router.put('/rules/:id', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Operator',
    email: 'operator@tatapower.com',
  };

  const updated = db.updateAlarmRule(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Alarm rule not found' });
  }

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARM_RULE_UPDATED',
    details: `Updated alarm rule "${updated.name}" threshold to ${updated.thresholdValue}`,
    entityType: 'ALARM_RULE',
    entityId: updated.id,
  });

  // Recalculate alarm events
  reEvaluateAllAlarms();

  res.json({ rule: updated });
});

// DELETE alarm rule
router.delete('/rules/:id', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Lead Administrator',
    email: 'admin@tatapower.com',
  };

  const success = db.deleteAlarmRule(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Alarm rule not found' });
  }

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARM_RULE_DELETED',
    details: `Deleted alarm rule ID [${req.params.id}]`,
    entityType: 'ALARM_RULE',
    entityId: req.params.id,
  });

  reEvaluateAllAlarms();

  res.json({ message: 'Alarm rule deleted successfully' });
});

// GET Alarm Events with filtering
router.get('/events', optionalAuth, (req: AuthRequest, res) => {
  const status = req.query.status as string;
  const level = req.query.level as string;
  const equipment = req.query.equipment as string;
  const limit = parseInt(req.query.limit as string) || 300;

  let events = db.getAlarmEvents(status === 'ALL' ? undefined : status, limit * 2);

  if (level && level !== 'ALL') {
    events = events.filter((e) => e.alarmLevel === level);
  }
  if (equipment && equipment !== 'ALL') {
    events = events.filter((e) => e.equipmentId === equipment);
  }

  const allEvents = db.getAlarmEvents();
  const total = allEvents.length;
  const activeCount = allEvents.filter((e) => e.status === 'ACTIVE').length;
  const criticalCount = allEvents.filter((e) => e.status === 'ACTIVE' && e.alarmLevel === 'CRITICAL').length;
  const warningCount = allEvents.filter((e) => e.status === 'ACTIVE' && e.alarmLevel === 'WARNING').length;
  const resolvedCount = allEvents.filter((e) => e.status === 'RESOLVED').length;
  const clearedCount = allEvents.filter((e) => e.status === 'CLEARED').length;

  res.json({
    events: events.slice(0, limit),
    summary: {
      total,
      active: activeCount,
      critical: criticalCount,
      warning: warningCount,
      resolved: resolvedCount,
      cleared: clearedCount,
    },
  });
});

// POST Acknowledge alarm event
router.post('/events/:id/acknowledge', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_guest',
    name: 'Shift Operations Operator',
    email: 'operator@tatapower.com',
  };

  const updated = db.updateAlarmEvent(req.params.id, {
    status: 'ACKNOWLEDGED',
    acknowledgedBy: user.name,
    acknowledgedAt: new Date().toISOString(),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Alarm event not found' });
  }

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARM_ACKNOWLEDGED',
    details: `Acknowledged alarm [${updated.ruleName}] for equipment [${updated.equipmentId}]`,
    entityType: 'ALARM_EVENT',
    entityId: updated.id,
  });

  res.json({ event: updated });
});

// POST Resolve alarm event
router.post('/events/:id/resolve', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_guest',
    name: 'Shift Operations Operator',
    email: 'operator@tatapower.com',
  };

  const { resolutionNotes } = req.body;

  const updated = db.updateAlarmEvent(req.params.id, {
    status: 'RESOLVED',
    resolvedBy: user.name,
    resolvedAt: new Date().toISOString(),
    resolutionNotes: resolutionNotes || 'Resolved during shift operational checks.',
  });

  if (!updated) {
    return res.status(404).json({ error: 'Alarm event not found' });
  }

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARM_RESOLVED',
    details: `Resolved alarm [${updated.ruleName}]. Notes: ${resolutionNotes || 'None'}`,
    entityType: 'ALARM_EVENT',
    entityId: updated.id,
  });

  res.json({ event: updated });
});

// POST Clear a single alarm event
router.post('/events/:id/clear', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_guest',
    name: 'Shift Operations Operator',
    email: 'operator@tatapower.com',
  };

  const cleared = db.clearAlarmEvent(req.params.id, user.name);

  if (!cleared) {
    return res.status(404).json({ error: 'Alarm event not found' });
  }

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARM_CLEARED',
    details: `Cleared alarm [${cleared.ruleName}] for equipment [${cleared.equipmentId || 'General'}]`,
    entityType: 'ALARM_EVENT',
    entityId: cleared.id,
  });

  res.json({ success: true, event: cleared });
});

// POST Clear selected alarm events in batch
router.post('/events/clear-batch', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_guest',
    name: 'Shift Operations Operator',
    email: 'operator@tatapower.com',
  };

  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of alarm event IDs is required' });
  }

  const result = db.clearAlarmEventsBatch(ids, user.name);

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARMS_BATCH_CLEARED',
    details: `Batch-cleared ${result.clearedCount} alarm events`,
    entityType: 'ALARM_EVENT',
    entityId: 'batch',
  });

  res.json({ success: true, clearedCount: result.clearedCount });
});

// POST Clear all or filtered alarm events
router.post('/events/clear-all', optionalAuth, (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_guest',
    name: 'Shift Operations Operator',
    email: 'operator@tatapower.com',
  };

  const { datasetId, level, equipmentId } = req.body;
  const result = db.clearAllAlarmEvents({ datasetId, level, equipmentId }, user.name);

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'ALARMS_ALL_CLEARED',
    details: `Cleared ${result.clearedCount} alarm events (filter: dataset=${datasetId || 'all'}, level=${level || 'all'}, equipment=${equipmentId || 'all'})`,
    entityType: 'ALARM_EVENT',
    entityId: 'all',
  });

  res.json({ success: true, clearedCount: result.clearedCount });
});

// POST Trigger immediate re-evaluation across all active datasets
router.post('/re-evaluate', optionalAuth, (req: AuthRequest, res) => {
  reEvaluateAllAlarms();
  const events = db.getAlarmEvents();
  const activeCount = events.filter((e) => e.status === 'ACTIVE').length;
  const criticalCount = events.filter((e) => e.status === 'ACTIVE' && e.alarmLevel === 'CRITICAL').length;
  const warningCount = events.filter((e) => e.status === 'ACTIVE' && e.alarmLevel === 'WARNING').length;
  const resolvedCount = events.filter((e) => e.status === 'RESOLVED').length;

  res.json({
    success: true,
    message: 'Alarm re-evaluation completed across all datasets',
    summary: {
      total: events.length,
      active: activeCount,
      critical: criticalCount,
      warning: warningCount,
      resolved: resolvedCount,
    },
    count: events.length,
  });
});

// Helper: Master Alarm System Toggle state
let systemAlarmEnabled = true;

// GET Alarm System Status
router.get('/system-status', optionalAuth, (req, res) => {
  res.json({ systemEnabled: systemAlarmEnabled });
});

// POST Toggle Alarm System Status
router.post('/system-status', optionalAuth, (req: AuthRequest, res) => {
  const { enabled } = req.body;
  if (enabled !== undefined) {
    systemAlarmEnabled = Boolean(enabled);
  } else {
    systemAlarmEnabled = !systemAlarmEnabled;
  }

  const user = req.user || {
    id: 'usr_admin',
    name: 'Administrator',
    email: 'admin@tatapower.com',
  };

  db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: systemAlarmEnabled ? 'ALARM_SYSTEM_ENABLED' : 'ALARM_SYSTEM_DISABLED',
    details: `Master alarm system toggled ${systemAlarmEnabled ? 'ON' : 'OFF'} by ${user.name}`,
    entityType: 'ALARM_SYSTEM',
    entityId: 'master_alarm_switch',
  });

  res.json({ success: true, systemEnabled: systemAlarmEnabled });
});

// Helper: Re-evaluate all datasets against current rules
export function reEvaluateAllAlarms() {
  const datasets = db.getDatasets();
  db.clearAlarmEvents();

  for (const ds of datasets) {
    const records = db.getRecords(ds.id);
    const events = AlarmEvaluationService.evaluateDataset(ds, records);
    if (events.length > 0) {
      db.addAlarmEvents(events);
    }
  }
}

export default router;
