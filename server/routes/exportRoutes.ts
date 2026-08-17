import { Router } from 'express';
import { ExportService } from '../services/exportService.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET export dataset to CSV
router.get('/dataset/:id/csv', optionalAuth, (req: AuthRequest, res) => {
  try {
    const filters = {
      equipment: req.query.equipment as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const csv = ExportService.exportDatasetToCSV(req.params.id, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tatapower_dataset_${req.params.id}_export.csv"`
    );
    res.send(csv);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Export failed' });
  }
});

// GET export chart data to CSV (respecting active filters)
router.get('/chart/:id/csv', optionalAuth, (req: AuthRequest, res) => {
  try {
    const filters = {
      equipment: req.query.equipment as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const result = ExportService.exportChartDataToCSV(req.params.id, filters);

    const safeTitle = result.chartTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tatapower_${safeTitle}_export.csv"`
    );
    res.send(result.csv);
  } catch (err: any) {
    res.status(404).json({ error: err.message || 'Export failed' });
  }
});

// GET export alarms to CSV
router.get('/alarms/csv', optionalAuth, (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string;
    const csv = ExportService.exportAlarmsToCSV(status);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tatapower_jamshedpur_alarms_export.csv"`
    );
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Alarms export failed' });
  }
});

// GET export 3D temperature classified data to CSV
router.get('/temperature/csv', optionalAuth, (req: AuthRequest, res) => {
  try {
    const datasetId = req.query.datasetId as string;
    const filters = {
      equipment: req.query.equipment as string,
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const csv = ExportService.exportTemperature3DToCSV(datasetId, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tatapower_3d_temperature_analytics_export.csv"`
    );
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Temperature data export failed' });
  }
});

export default router;
