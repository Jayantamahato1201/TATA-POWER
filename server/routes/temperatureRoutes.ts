import { Router } from 'express';
import { db } from '../db/database.js';
import { Temperature3DService } from '../services/temperature3DService.js';
import { optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET Temperature configuration for dataset
router.get('/config', optionalAuth, (req: AuthRequest, res) => {
  const datasetId = req.query.datasetId as string;
  const config = db.getTemperatureConfig(datasetId);
  res.json({ config });
});

// PUT Update Temperature configuration
router.put('/config', optionalAuth, async (req: AuthRequest, res) => {
  const datasetId = req.body.datasetId as string;
  const userEmail = req.user?.email || 'admin@tatapower.com';
  const updated = await db.setTemperatureConfig(req.body, datasetId, userEmail);

  // Log activity
  await db.addActivityLog({
    userId: req.user?.id || 'usr_admin',
    userName: req.user?.name || 'Administrator',
    userEmail,
    action: 'UPDATE_TEMPERATURE_CONFIG',
    details: `Updated 3D temperature thresholds: Below < ${updated.belowThreshold}${updated.unit}, Normal [${updated.normalMin}-${updated.normalMax}${updated.unit}], Above > ${updated.aboveThreshold}${updated.unit}`,
    entityType: 'CONFIGURATION',
    entityId: updated.id,
  });

  res.json({ config: updated });
});

// POST Calculate 3D Temperature Data strictly from dataset records
router.post('/analytics', optionalAuth, (req: AuthRequest, res) => {
  const { datasetId, filters, customConfig } = req.body;
  const analytics = Temperature3DService.calculate3DAnalytics(datasetId, filters, customConfig);
  res.json(analytics);
});

export default router;
