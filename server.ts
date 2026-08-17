import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import authRoutes from './server/routes/authRoutes.js';
import datasetRoutes from './server/routes/datasetRoutes.js';
import alarmRoutes, { reEvaluateAllAlarms } from './server/routes/alarmRoutes.js';
import analyticsRoutes from './server/routes/analyticsRoutes.js';
import dashboardRoutes from './server/routes/dashboardRoutes.js';
import exportRoutes from './server/routes/exportRoutes.js';
import userRoutes from './server/routes/userRoutes.js';
import temperatureRoutes from './server/routes/temperatureRoutes.js';
import metricAnalyticsRoutes from './server/routes/metricAnalyticsRoutes.js';
import { db } from './server/db/database.js';
import { isMongoConnected } from './server/db/connection.js';
import { migrateJsonToMongo } from './server/db/migration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Database connection (MongoDB Atlas / Cached)
  try {
    await db.init();
  } catch (dbErr: any) {
    console.warn('[Server Startup] Database init warning:', dbErr.message);
  }

  // Body parsers
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      platform: 'Tata Power Jamshedpur Intelligent Operations Command Center',
      database: isMongoConnected() ? 'MongoDB Atlas (Connected)' : 'Local Persistent Fallback',
      isMongoConnected: isMongoConnected(),
      timestamp: new Date().toISOString(),
    });
  });

  // Admin DB Migration Endpoint
  app.post('/api/admin/migrate-mongo', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      const result = await migrateJsonToMongo(force);
      await db.init();
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Migration failed' });
    }
  });

  // Mount API routes FIRST
  app.use('/api/auth', authRoutes);
  app.use('/api/datasets', datasetRoutes);
  app.use('/api/alarms', alarmRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/export', exportRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/audit-logs', userRoutes);
  app.use('/api/temperature', temperatureRoutes);
  app.use('/api/metrics', metricAnalyticsRoutes);

  // Global API error handler for MongoDB duplicate keys (E11000) & server errors
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.code === 11000 || (err.name === 'MongoServerError' && err.message?.includes('E11000'))) {
      const duplicateField = err.keyValue ? Object.keys(err.keyValue).join(', ') : 'Identifier';
      const duplicateVal = err.keyValue ? JSON.stringify(err.keyValue) : '';
      console.warn(`[MongoDB Duplicate Key Prevented] Duplicate on ${duplicateField}: ${duplicateVal}`);
      return res.status(409).json({
        error: `A record with this ${duplicateField} already exists in the database.`,
        code: 'DUPLICATE_KEY_E11000',
        field: duplicateField,
        details: err.keyValue,
      });
    }
    console.error('[API Server Error]:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  });

  // Synchronize dynamic alarms from persisted datasets on startup
  try {
    reEvaluateAllAlarms();
  } catch (evalErr) {
    console.warn('Initial alarm evaluation warning:', evalErr);
  }

  // Vite middleware / Static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Tata Power Jamshedpur Operations Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
