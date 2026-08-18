import { Router } from 'express';
import { MetricAnalyticsService } from '../services/metricAnalyticsService.js';
import { db } from '../db/database.js';
import { reEvaluateAllAlarms } from './alarmRoutes.js';
import { MetricDefinition } from '../types/index.js';

const router = Router();

// GET /api/metrics/overview - Returns full overview of metrics for dataset
router.get('/overview', (req, res) => {
  try {
    const { datasetId, equipment, startDate, endDate, searchMetric } = req.query;
    const overview = MetricAnalyticsService.analyzeDataset(
      datasetId ? String(datasetId) : undefined,
      {
        equipment: equipment ? String(equipment) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        searchMetric: searchMetric ? String(searchMetric) : undefined,
      }
    );
    res.json(overview);
  } catch (err: any) {
    console.error('Error analyzing dataset metrics overview:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze metrics' });
  }
});

// POST /api/metrics/analytics - Query filtered metric analytics
router.post('/analytics', (req, res) => {
  try {
    const { datasetId, filters } = req.body;
    const overview = MetricAnalyticsService.analyzeDataset(datasetId, filters);
    res.json(overview);
  } catch (err: any) {
    console.error('Error in /api/metrics/analytics:', err);
    res.status(500).json({ error: err.message || 'Failed to get metric analytics' });
  }
});

// GET /api/metrics/configs - Get saved metric configurations
router.get('/configs', (req, res) => {
  try {
    const { datasetId } = req.query;
    const configs = db.getMetricConfigs();
    if (datasetId) {
      const filtered: Record<string, any> = {};
      for (const [k, v] of Object.entries(configs)) {
        if (k.startsWith(`${datasetId}__`) || v.datasetId === datasetId) {
          filtered[k] = v;
        }
      }
      return res.json(filtered);
    }
    res.json(configs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/metrics/custom - Add new custom metric linked to dataset
router.post('/custom', async (req, res) => {
  try {
    const { datasetId, name, unit, thresholds } = req.body;
    if (!datasetId || !name || !name.trim()) {
      return res.status(400).json({ error: 'datasetId and metric name are required' });
    }

    const cleanName = name.trim();
    const existingConfigs = db.getMetricConfigs();

    // Check for duplicate metric name within the same dataset
    for (const [k, cfg] of Object.entries(existingConfigs)) {
      const isThisDataset = k.startsWith(`${datasetId}__`) || cfg.datasetId === datasetId;
      if (isThisDataset && (cfg.name || '').trim().toLowerCase() === cleanName.toLowerCase()) {
        return res.status(400).json({ error: `A metric with name "${cleanName}" already exists for this dataset.` });
      }
    }

    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const metricId = `metric_custom_${slug}_${Date.now().toString(36)}`;
    const datasetSpecificKey = `${datasetId}__${metricId}`;

    const newMetric: Partial<MetricDefinition> = {
      id: datasetSpecificKey,
      datasetId,
      key: slug,
      name: cleanName,
      unit: (unit || '').trim(),
      category: 'custom',
      isCustom: true,
      dataType: 'numeric',
      colorScheme: {
        primary: '#F27D26',
        secondary: '#EA580C',
        gradient: ['#7C2D12', '#C2410C', '#F27D26', '#FDBA74'],
        accent: '#F27D26',
      },
      thresholds: {
        low: thresholds?.low !== undefined && thresholds?.low !== null && thresholds?.low !== '' ? Number(thresholds.low) : undefined,
        normalMin: thresholds?.normalMin !== undefined && thresholds?.normalMin !== null && thresholds?.normalMin !== '' ? Number(thresholds.normalMin) : undefined,
        normalMax: thresholds?.normalMax !== undefined && thresholds?.normalMax !== null && thresholds?.normalMax !== '' ? Number(thresholds.normalMax) : undefined,
        high: thresholds?.normalMax !== undefined && thresholds?.normalMax !== null && thresholds?.normalMax !== '' ? Number(thresholds.normalMax) : undefined,
        warningLimit: thresholds?.warningLimit !== undefined && thresholds?.warningLimit !== null && thresholds?.warningLimit !== '' ? Number(thresholds.warningLimit) : undefined,
        criticalLimit: thresholds?.criticalLimit !== undefined && thresholds?.criticalLimit !== null && thresholds?.criticalLimit !== '' ? Number(thresholds.criticalLimit) : undefined,
        lowLabel: 'LOW LIMIT',
        normalLabel: 'NORMAL OPERATING',
        highLabel: 'HIGH LIMIT',
        warningLabel: 'WARNING LIMIT',
        criticalLabel: 'CRITICAL LIMIT',
        lowColor: '#06B6D4',
        normalColor: '#00FF41',
        highColor: '#EF4444',
        warningColor: '#F59E0B',
        criticalColor: '#EF4444',
        enabled: thresholds?.enabled !== false,
        alarmEnabled: thresholds?.alarmEnabled !== false,
        alarmSeverity: thresholds?.alarmSeverity || 'CRITICAL',
      },
      displayOrder: 999,
      isVisible: true,
      graphType: '3d_surface',
      show3D: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await db.saveMetricConfig(datasetSpecificKey, newMetric);

    await db.addActivityLog({
      userId: (req as any).user?.id || 'usr_admin',
      userName: (req as any).user?.name || 'Administrator',
      userEmail: (req as any).user?.email || 'admin@tatapower.com',
      action: 'ADD_CUSTOM_METRIC',
      details: `Added custom metric "${cleanName}" (${newMetric.unit || 'no unit'}) to dataset [${datasetId}]`,
      entityType: 'METRIC_CONFIG',
      entityId: datasetSpecificKey,
    });

    try {
      await reEvaluateAllAlarms();
    } catch (evalErr) {
      console.warn('Alarm re-evaluation warning:', evalErr);
    }

    res.status(201).json({ success: true, metric: saved });
  } catch (err: any) {
    console.error('Error adding custom metric:', err);
    res.status(500).json({ error: err.message || 'Failed to add custom metric' });
  }
});

// DELETE /api/metrics/custom/:metricKey - Delete custom metric
router.delete('/custom/:metricKey', async (req, res) => {
  try {
    const { metricKey } = req.params;
    const existing = db.getMetricConfig(metricKey);
    if (!existing) {
      return res.status(404).json({ error: 'Metric configuration not found' });
    }

    await db.deleteMetricConfig(metricKey);

    await db.addActivityLog({
      userId: (req as any).user?.id || 'usr_admin',
      userName: (req as any).user?.name || 'Administrator',
      userEmail: (req as any).user?.email || 'admin@tatapower.com',
      action: 'DELETE_CUSTOM_METRIC',
      details: `Deleted custom metric "${existing.name || metricKey}"`,
      entityType: 'METRIC_CONFIG',
      entityId: metricKey,
    });

    try {
      await reEvaluateAllAlarms();
    } catch (evalErr) {
      console.warn('Alarm re-evaluation warning:', evalErr);
    }

    res.json({ success: true, message: 'Custom metric deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting custom metric:', err);
    res.status(500).json({ error: err.message || 'Failed to delete custom metric' });
  }
});

// POST /api/metrics/config - Save/Update single metric configuration
router.post('/config', async (req, res) => {
  try {
    const { metricKey, config } = req.body;
    if (!metricKey || !config) {
      return res.status(400).json({ error: 'metricKey and config are required' });
    }

    const saved = await db.saveMetricConfig(metricKey, config);

    // Also persist under related lookup keys to guarantee instant cross-view resolution
    if (metricKey.includes('__')) {
      const parts = metricKey.split('__');
      const baseKey = parts.slice(1).join('__');
      if (baseKey) {
        await db.saveMetricConfig(baseKey, config);
      }
    }
    if (config.name) {
      const nameKey = `metric_${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      await db.saveMetricConfig(nameKey, config);
      await db.saveMetricConfig(config.name.toLowerCase(), config);
    }

    await db.addActivityLog({
      userId: (req as any).user?.id || 'usr_admin',
      userName: (req as any).user?.name || 'Administrator',
      userEmail: (req as any).user?.email || 'admin@tatapower.com',
      action: 'UPDATE_METRIC_CONFIG',
      details: `Updated metric threshold configuration for ${metricKey} (${config.name || 'Metric'})`,
      entityType: 'METRIC_CONFIG',
      entityId: metricKey,
    });

    try {
      await reEvaluateAllAlarms();
    } catch (evalErr) {
      console.warn('Alarm re-evaluation warning:', evalErr);
    }

    res.json({ success: true, config: saved });
  } catch (err: any) {
    console.error('Error saving metric config:', err);
    res.status(500).json({ error: err.message || 'Failed to save metric config' });
  }
});

// POST /api/metrics/configs/batch - Save/Update multiple metric configurations
router.post('/configs/batch', async (req, res) => {
  try {
    const { configs } = req.body;
    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ error: 'configs object mapping metricKey to configuration is required' });
    }

    const savedConfigs: Record<string, any> = {};
    for (const [key, cfg] of Object.entries(configs)) {
      savedConfigs[key] = await db.saveMetricConfig(key, cfg as any);
    }

    await db.addActivityLog({
      userId: (req as any).user?.id || 'usr_admin',
      userName: (req as any).user?.name || 'Administrator',
      userEmail: (req as any).user?.email || 'admin@tatapower.com',
      action: 'BATCH_UPDATE_METRIC_CONFIGS',
      details: `Updated alarm thresholds for ${Object.keys(savedConfigs).length} metrics in batch`,
      entityType: 'METRIC_CONFIG',
      entityId: 'batch_save',
    });

    try {
      await reEvaluateAllAlarms();
    } catch (evalErr) {
      console.warn('Alarm re-evaluation warning:', evalErr);
    }

    res.json({ success: true, count: Object.keys(savedConfigs).length, configs: savedConfigs });
  } catch (err: any) {
    console.error('Error batch saving metric configs:', err);
    res.status(500).json({ error: err.message || 'Failed to batch save metric configs' });
  }
});

export default router;
