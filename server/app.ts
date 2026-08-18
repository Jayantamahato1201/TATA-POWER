import express from 'express';
import authRoutes from './routes/authRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';
import alarmRoutes, { reEvaluateAllAlarms } from './routes/alarmRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import userRoutes from './routes/userRoutes.js';
import temperatureRoutes from './routes/temperatureRoutes.js';
import metricAnalyticsRoutes from './routes/metricAnalyticsRoutes.js';
import { db } from './db/database.js';
import { isMongoConnected } from './db/connection.js';
import { migrateJsonToMongo } from './db/migration.js';

export const app = express();

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initializeServer(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await db.init();
      try {
        reEvaluateAllAlarms();
      } catch (evalErr) {
        console.warn('[Server] Alarm evaluation notice:', evalErr);
      }
    } catch (err: any) {
      console.warn('[Server Startup] DB init warning:', err?.message || err);
    } finally {
      isInitialized = true;
    }
  })();

  return initPromise;
}

// CORS Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure DB is initialized for incoming requests
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await initializeServer();
    } catch (e) {
      // Continue anyway with in-memory fallback
    }
  }
  next();
});

// Health check
const handleHealth = (req: express.Request, res: express.Response) => {
  res.json({
    status: 'operational',
    platform: 'Tata Power Jamshedpur Intelligent Operations Command Center',
    database: isMongoConnected() ? 'MongoDB Atlas (Connected)' : 'Local Persistent Fallback',
    isMongoConnected: isMongoConnected(),
    timestamp: new Date().toISOString(),
  });
};
app.get('/api/health', handleHealth);
app.get('/health', handleHealth);

// Admin DB Migration Endpoint
const handleMigrate = async (req: express.Request, res: express.Response) => {
  try {
    const force = req.query.force === 'true';
    const result = await migrateJsonToMongo(force);
    await db.init();
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Migration failed' });
  }
};
app.post('/api/admin/migrate-mongo', handleMigrate);
app.post('/admin/migrate-mongo', handleMigrate);

// Mount API routes on both /api prefix and direct root prefix
const routeDefinitions: [string, any][] = [
  ['/auth', authRoutes],
  ['/datasets', datasetRoutes],
  ['/alarms', alarmRoutes],
  ['/analytics', analyticsRoutes],
  ['/dashboard', dashboardRoutes],
  ['/export', exportRoutes],
  ['/users', userRoutes],
  ['/audit-logs', userRoutes],
  ['/temperature', temperatureRoutes],
  ['/metrics', metricAnalyticsRoutes],
];

for (const [subpath, handler] of routeDefinitions) {
  app.use(`/api${subpath}`, handler);
  app.use(subpath, handler);
}

// Global API error handler for MongoDB duplicate keys (E11000) & server errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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

export default app;
