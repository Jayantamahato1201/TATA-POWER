import { Router } from 'express';
import { db } from '../db/database.js';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET layout
router.get('/layout', optionalAuth, (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const layout = db.getDashboardLayout(userId);
  res.json({ layout });
});

// PUT update layout
router.put('/layout', optionalAuth, async (req: AuthRequest, res) => {
  const { widgets, name } = req.body;
  if (!widgets || !Array.isArray(widgets)) {
    return res.status(400).json({ error: 'Widgets array is required' });
  }

  const userId = req.user?.id;
  const current = db.getDashboardLayout(userId);

  const updated = await db.updateDashboardLayout({
    id: current.id,
    userId: current.userId || userId,
    isDefault: current.isDefault,
    name: name || current.name,
    widgets,
    updatedAt: new Date().toISOString(),
  });

  res.json({ layout: updated });
});

export default router;
