import { Router } from 'express';
import { db } from '../db/database.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { ChartConfig } from '../types/index.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET Overview metrics
router.get('/overview', optionalAuth, (req: AuthRequest, res) => {
  const datasetId = req.query.datasetId as string;
  const overview = AnalyticsService.calculateOverview(datasetId);
  res.json(overview);
});

// GET Smart Insights (only calculated from real data)
router.get('/insights', optionalAuth, (req: AuthRequest, res) => {
  const datasetId = req.query.datasetId as string;
  const insights = AnalyticsService.generateSmartInsights(datasetId);
  res.json({ insights });
});

// GET Chart configurations
router.get('/charts', optionalAuth, (req: AuthRequest, res) => {
  const datasetId = req.query.datasetId as string;
  const charts = db.getChartConfigs(datasetId);
  res.json({ charts });
});

// POST Calculate chart data with active filters
router.post('/chart-data', optionalAuth, (req: AuthRequest, res) => {
  const { chartId, filters, customConfig } = req.body;

  let config: ChartConfig | undefined;
  if (customConfig) {
    config = customConfig;
  } else if (chartId) {
    config = db.getChartConfigById(chartId);
  }

  if (!config) {
    return res.status(404).json({ error: 'Chart configuration not found' });
  }

  const data = AnalyticsService.getChartData(config, filters);
  res.json({
    chartConfig: config,
    ...data,
  });
});

// POST Create or customize chart
router.post('/charts', optionalAuth, (req: AuthRequest, res) => {
  const {
    title,
    chartType,
    datasetId,
    xAxisColumn,
    yAxisColumns,
    aggregation,
    unit,
    colorPalette,
    thresholdLines,
  } = req.body;

  if (!title || !chartType || !datasetId || !xAxisColumn || !yAxisColumns?.length) {
    return res.status(400).json({ error: 'Title, chartType, datasetId, xAxisColumn, and yAxisColumns are required.' });
  }

  const newChart: ChartConfig = {
    id: `chart_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title,
    chartType,
    datasetId,
    xAxisColumn,
    yAxisColumns,
    aggregation: aggregation || 'none',
    unit,
    colorPalette: colorPalette || ['#0EA5E9', '#38BDF8'],
    showLegend: true,
    showGrid: true,
    showToolbox: true,
    showDataZoom: true,
    thresholdLines: thresholdLines || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addChartConfig(newChart);

  res.status(201).json({ chart: newChart });
});

// PUT Update chart
router.put('/charts/:id', optionalAuth, (req: AuthRequest, res) => {
  const updated = db.updateChartConfig(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Chart configuration not found' });
  }
  res.json({ chart: updated });
});

// DELETE chart
router.delete('/charts/:id', optionalAuth, (req: AuthRequest, res) => {
  const success = db.deleteChartConfig(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Chart not found' });
  }
  res.json({ message: 'Chart configuration deleted' });
});

export default router;
