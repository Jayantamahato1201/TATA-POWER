import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import Papa from 'papaparse';
import { db } from '../db/database.js';
import { DataIngestionService } from '../services/dataIngestionService.js';
import { getFileFromGridFS } from '../services/gridFsStorageService.js';
import { authenticate, optionalAuth, AuthRequest, requireRole } from '../middleware/auth.js';
import { reEvaluateAllAlarms } from './alarmRoutes.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Idempotency cache for retried uploads (TTL: 2 minutes)
const recentUploadsCache = new Map<string, { result: any; timestamp: number }>();
function pruneUploadCache() {
  const now = Date.now();
  for (const [key, item] of recentUploadsCache.entries()) {
    if (now - item.timestamp > 120000) {
      recentUploadsCache.delete(key);
    }
  }
}

// Helper for file type detection
function resolveFileType(fileName: string): 'csv' | 'xls' | 'xlsx' {
  const rawExt = (fileName.split('.').pop() || '').toLowerCase();
  if (['xlsx', 'xlsm', 'xlsb'].includes(rawExt)) return 'xlsx';
  if (['xls'].includes(rawExt)) return 'xls';
  return 'csv';
}

// GET all datasets
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  let datasets = await db.getDatasetsAsync(includeArchived);
  // Sort descending by upload / update date
  datasets = [...datasets].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  res.json({ datasets });
});

// GET /api/datasets/preview - Status/info endpoint
router.get('/preview', (req, res) => {
  res.json({ status: 'ready', message: 'Send POST request with file to preview dataset.' });
});

// POST Preview uploaded file before finalizing import
router.post('/preview', optionalAuth, upload.single('file'), (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please select a CSV or Excel file.' });
  }

  const fileName = req.file.originalname;
  const fileType = resolveFileType(fileName);

  try {
    const preview = DataIngestionService.previewFile(req.file.buffer, fileName, fileType);
    res.json(preview);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to parse file preview' });
  }
});

// POST Upload & process dataset
router.post('/upload', optionalAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Please select a CSV or Excel file.' });
  }

  const fileName = req.file.originalname;
  const fileType = resolveFileType(fileName);

  try {
    pruneUploadCache();
    const user = req.user || {
      id: 'usr_operator',
      name: 'Operations Engineer',
      email: 'operator@tatapower.com',
    };

    // Calculate buffer hash & idempotency key
    const idempotencyHeader = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const cacheKey = idempotencyHeader || `${user.email}_${fileHash}_${req.file.size}_${fileName}`;

    // L1 In-Memory Cache Check
    if (recentUploadsCache.has(cacheKey)) {
      const cached = recentUploadsCache.get(cacheKey)!;
      if (cached?.result?.dataset?.id && (await db.getDatasetByIdAsync(cached.result.dataset.id))) {
        return res.status(200).json({
          ...cached.result,
          isIdempotentRetry: true,
          message: 'Request recognized as an idempotent upload retry. Returned existing dataset result.',
        });
      }
    }

    // L2 Persistent MongoDB Idempotency Check (for Serverless/Multi-Instance)
    const mongoCachedResult = await db.getIdempotencyRecord(cacheKey);
    if (mongoCachedResult && mongoCachedResult.dataset?.id && (await db.getDatasetByIdAsync(mongoCachedResult.dataset.id))) {
      recentUploadsCache.set(cacheKey, { result: mongoCachedResult, timestamp: Date.now() });
      return res.status(200).json({
        ...mongoCachedResult,
        isIdempotentRetry: true,
        message: 'Request recognized as an idempotent upload retry (retrieved from persistent MongoDB cache). Returned existing dataset result.',
      });
    }

    const options = {
      name: req.body.name || fileName.replace(/\.[^/.]+$/, ''),
      category: req.body.category || 'Thermal Generation Operations',
      dateColumn: req.body.dateColumn,
      timeColumn: req.body.timeColumn,
      equipmentColumn: req.body.equipmentColumn,
      description: req.body.description,
    };

    const result = await DataIngestionService.processAndSave(
      req.file.buffer,
      fileName,
      fileType,
      options,
      user
    );

    // Save in L1 in-memory cache & L2 MongoDB persistent collection with 24h TTL
    recentUploadsCache.set(cacheKey, { result, timestamp: Date.now() });
    if (result.dataset?.id) {
      await db.saveIdempotencyRecord(cacheKey, result.dataset.id, result);
    }

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Dataset ingestion error:', err);
    res.status(400).json({ error: err.message || 'Failed to ingest dataset' });
  }
});

// GET dataset by ID with records preview
router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const dataset = await db.getDatasetByIdAsync(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const records = await db.getRecordsAsync(dataset.id, limit, offset);
  const totalRecords = dataset.totalRows || db.getRecordCount(dataset.id);

  res.json({
    dataset,
    records,
    pagination: {
      total: totalRecords,
      limit,
      offset,
    },
  });
});

// PUT /api/datasets/:id - Update dataset metadata
router.put('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const dataset = await db.getDatasetByIdAsync(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const { name, category, description, isArchived, status, dateColumn, equipmentColumn } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = String(name).trim();
  if (category !== undefined) updates.category = String(category).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (isArchived !== undefined) {
    updates.isArchived = Boolean(isArchived);
    updates.status = updates.isArchived ? 'ARCHIVED' : 'ACTIVE';
  }
  if (status !== undefined) updates.status = status;
  if (dateColumn !== undefined) updates.dateColumn = dateColumn;
  if (equipmentColumn !== undefined) updates.equipmentColumn = equipmentColumn;
  updates.updatedAt = new Date().toISOString();

  const updated = await db.updateDataset(req.params.id, updates);

  const user = req.user || { id: 'usr_admin', name: 'Administrator', email: 'admin@tatapower.com' };
  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'DATASET_UPDATED',
    details: `Updated metadata for dataset "${updated?.name || req.params.id}".`,
    entityType: 'DATASET',
    entityId: req.params.id,
  });

  res.json({ dataset: updated });
});

// POST /api/datasets/:id/replace - Mode 1: Replace entire dataset with new file
router.post('/:id/replace', optionalAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded for replacement.' });
  }

  const fileName = req.file.originalname;
  const fileType = resolveFileType(fileName);

  const user = req.user || {
    id: 'usr_admin',
    name: 'Command Center Administrator',
    email: 'admin@tatapower.com',
  };

  try {
    const result = await DataIngestionService.replaceDatasetData(
      req.params.id,
      req.file.buffer,
      fileName,
      fileType,
      user
    );
    res.json(result);
  } catch (err: any) {
    console.error('Dataset replace error:', err);
    res.status(400).json({ error: err.message || 'Failed to replace dataset records' });
  }
});

// POST /api/datasets/:id/append - Mode 2: Append new rows with duplicate detection
router.post('/:id/append', optionalAuth, upload.single('file'), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded for append.' });
  }

  const fileName = req.file.originalname;
  const fileType = resolveFileType(fileName);
  const duplicateStrategy = (req.body.duplicateStrategy === 'overwrite' ? 'overwrite' : 'skip') as 'skip' | 'overwrite';

  const user = req.user || {
    id: 'usr_admin',
    name: 'Command Center Administrator',
    email: 'admin@tatapower.com',
  };

  try {
    const result = await DataIngestionService.appendDatasetData(
      req.params.id,
      req.file.buffer,
      fileName,
      fileType,
      user,
      duplicateStrategy
    );
    res.json(result);
  } catch (err: any) {
    console.error('Dataset append error:', err);
    res.status(400).json({ error: err.message || 'Failed to append dataset records' });
  }
});

// GET /api/datasets/:id/download - Export dataset records as CSV / original file
router.get('/:id/download', optionalAuth, async (req: AuthRequest, res) => {
  const dataset = await db.getDatasetByIdAsync(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const safeName = (dataset.name || 'Dataset').replace(/[^a-zA-Z0-9_-]/g, '_');

  // If file was stored in MongoDB GridFS, retrieve and serve binary stream directly
  if (dataset.gridFsFileId) {
    try {
      const gridFile = await getFileFromGridFS(dataset.gridFsFileId);
      if (gridFile && gridFile.buffer) {
        const mime = gridFile.contentType || (
          dataset.fileType === 'xlsx'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : dataset.fileType === 'xls'
            ? 'application/vnd.ms-excel'
            : 'text/csv'
        );
        const ext = dataset.fileType || 'csv';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}_export_${Date.now()}.${ext}"`);
        return res.send(gridFile.buffer);
      }
    } catch (gridErr) {
      console.warn(`[GridFS] Failed to stream file ${dataset.gridFsFileId}, falling back to database records:`, gridErr);
    }
  }

  // Legacy fallback if original file was persisted in base64
  if (dataset.fileData) {
    try {
      const fileBuffer = Buffer.from(dataset.fileData, 'base64');
      const mime = dataset.fileType === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : dataset.fileType === 'xls'
        ? 'application/vnd.ms-excel'
        : 'text/csv';
      const ext = dataset.fileType || 'csv';
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}_export_${Date.now()}.${ext}"`);
      return res.send(fileBuffer);
    } catch (decodeErr) {
      console.warn('Error streaming stored fileData, falling back to CSV generation:', decodeErr);
    }
  }

  const records = await db.getRecordsAsync(dataset.id, 50000);
  if (records.length === 0) {
    return res.status(400).json({ error: 'Dataset has no records to download' });
  }

  const dataRows = records.map((r) => r.data);
  const csv = Papa.unparse(dataRows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}_export_${Date.now()}.csv"`);
  res.send(csv);
});

// GET /api/datasets/:id/records - Search, filter, paginate, sort records
router.get('/:id/records', optionalAuth, async (req: AuthRequest, res) => {
  const dataset = await db.getDatasetByIdAsync(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const { search, equipment, startDate, endDate, sortBy, sortOrder, limit, offset } = req.query;

  const result = await db.queryRecordsAsync({
    datasetId: req.params.id,
    search: search ? String(search) : undefined,
    equipment: equipment ? String(equipment) : undefined,
    startDate: startDate ? String(startDate) : undefined,
    endDate: endDate ? String(endDate) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    limit: limit ? parseInt(String(limit), 10) : 100,
    offset: offset ? parseInt(String(offset), 10) : 0,
  });

  res.json({
    datasetId: req.params.id,
    records: result.records,
    pagination: {
      total: result.total,
      limit: limit ? parseInt(String(limit), 10) : 100,
      offset: offset ? parseInt(String(offset), 10) : 0,
    },
  });
});

// POST /api/datasets/:id/records - Add new single record
router.post('/:id/records', optionalAuth, async (req: AuthRequest, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid record data object provided.' });
  }

  const created = await db.addRecord(req.params.id, data);
  if (!created) {
    return res.status(404).json({ error: 'Dataset not found or failed to create record.' });
  }

  const user = req.user || { id: 'usr_admin', name: 'Administrator', email: 'admin@tatapower.com' };
  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'RECORD_ADDED',
    details: `Added new telemetry record [ID: ${created.id}] in dataset [ID: ${req.params.id}].`,
    entityType: 'DATASET',
    entityId: req.params.id,
  });

  try {
    reEvaluateAllAlarms();
  } catch (err) {
    console.warn('Alarm re-evaluation warning:', err);
  }

  res.status(201).json({ success: true, record: created });
});

// GET /api/datasets/:id/records/:recordId - Get single record
router.get('/:id/records/:recordId', optionalAuth, (req: AuthRequest, res) => {
  const record = db.getRecordById(req.params.id, req.params.recordId);
  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ record });
});

// PUT /api/datasets/:id/records/:recordId - Edit single record
router.put('/:id/records/:recordId', optionalAuth, async (req: AuthRequest, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Invalid record data object provided.' });
  }

  const updated = await db.updateRecord(req.params.id, req.params.recordId, data);
  if (!updated) {
    return res.status(404).json({ error: 'Record not found or failed to update.' });
  }

  const user = req.user || { id: 'usr_admin', name: 'Administrator', email: 'admin@tatapower.com' };
  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'RECORD_UPDATED',
    details: `Updated telemetry record [ID: ${req.params.recordId}] in dataset [ID: ${req.params.id}].`,
    entityType: 'DATASET',
    entityId: req.params.id,
  });

  try {
    reEvaluateAllAlarms();
  } catch (err) {
    console.warn('Alarm re-evaluation warning:', err);
  }

  res.json({ record: updated });
});

// DELETE /api/datasets/:id/records/:recordId - Delete single record
router.delete('/:id/records/:recordId', optionalAuth, async (req: AuthRequest, res) => {
  const success = await db.deleteRecord(req.params.id, req.params.recordId);
  if (!success) {
    return res.status(404).json({ error: 'Record not found or failed to delete.' });
  }

  const user = req.user || { id: 'usr_admin', name: 'Administrator', email: 'admin@tatapower.com' };
  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'RECORD_DELETED',
    details: `Deleted telemetry record [ID: ${req.params.recordId}] from dataset [ID: ${req.params.id}].`,
    entityType: 'DATASET',
    entityId: req.params.id,
  });

  try {
    reEvaluateAllAlarms();
  } catch (err) {
    console.warn('Alarm re-evaluation warning:', err);
  }

  res.json({ message: 'Record deleted successfully' });
});

// POST /api/datasets/:id/records/bulk-update - Bulk update or delete
router.post('/:id/records/bulk-update', optionalAuth, async (req: AuthRequest, res) => {
  const { action, recordIds, updates } = req.body;
  if (!action || !['delete', 'update'].includes(action)) {
    return res.status(400).json({ error: 'Action must be "delete" or "update".' });
  }

  const result = await db.bulkUpdateRecords(req.params.id, action, { recordIds, updates });

  const user = req.user || { id: 'usr_admin', name: 'Administrator', email: 'admin@tatapower.com' };
  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: action === 'delete' ? 'RECORD_DELETED' : 'RECORD_UPDATED',
    details: `Bulk ${action} executed on ${result.affected} records in dataset [ID: ${req.params.id}].`,
    entityType: 'DATASET',
    entityId: req.params.id,
  });

  res.json({ success: true, affected: result.affected });
});

// GET /api/datasets/:id/metrics - Returns detected metrics for this dataset
router.get('/:id/metrics', optionalAuth, (req: AuthRequest, res) => {
  const dataset = db.getDatasetById(req.params.id);
  if (!dataset) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  const records = db.getRecords(dataset.id);
  const metrics = dataset.columns
    .filter((c) => c.dataType === 'numeric' && !c.isIdentifier)
    .map((col) => {
      const savedCfg = db.getMetricConfig(col.name) || {};
      return {
        key: col.name,
        displayName: col.displayName || col.name,
        unit: col.unit || savedCfg.unit || '',
        category: savedCfg.category || 'Operational Telemetry',
        min: col.min,
        max: col.max,
        avg: col.avg,
        count: records.length,
        config: savedCfg,
      };
    });

  res.json({ datasetId: req.params.id, metrics });
});

// GET /api/datasets/:id/alarms - Returns alarms for this dataset
router.get('/:id/alarms', optionalAuth, (req: AuthRequest, res) => {
  const events = db.getAlarmEvents().filter((e) => e.datasetId === req.params.id);
  const summary = {
    total: events.length,
    active: events.filter((e) => e.status === 'ACTIVE').length,
    critical: events.filter((e) => e.alarmLevel === 'CRITICAL').length,
    warning: events.filter((e) => e.alarmLevel === 'WARNING').length,
    resolved: events.filter((e) => e.status === 'RESOLVED').length,
  };
  res.json({ alarms: events, summary });
});

// POST Seed verified sample Jojobera operational dataset
router.post('/seed-sample', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user || {
      id: 'usr_admin_01',
      name: 'Command Center Lead Administrator',
      email: 'admin@tatapower.com',
    };

    const result = await DataIngestionService.seedSampleDataset(user);
    res.status(201).json({
      message: 'Verified Jojobera operational telemetry sample loaded successfully',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to seed sample dataset' });
  }
});

// POST / DELETE Clear All Datasets
router.post('/clear-all', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user || {
      id: 'usr_admin_01',
      name: 'Command Center Lead Administrator',
      email: 'admin@tatapower.com',
    };

    const result = await db.clearAllDatasets();
    await db.addActivityLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'DATASET_DELETED',
      details: `Purged repository: cleared all datasets (${result.deletedDatasets}) and telemetry records (${result.deletedRecords}).`,
      entityType: 'DATASET',
    });

    res.json({
      message: 'All datasets, records, and related alarm events cleared permanently.',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear all datasets' });
  }
});

router.delete('/clear-all', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user || {
      id: 'usr_admin_01',
      name: 'Command Center Lead Administrator',
      email: 'admin@tatapower.com',
    };

    const result = await db.clearAllDatasets();
    await db.addActivityLog({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: 'DATASET_DELETED',
      details: `Purged repository: cleared all datasets (${result.deletedDatasets}) and telemetry records (${result.deletedRecords}).`,
      entityType: 'DATASET',
    });

    res.json({
      message: 'All datasets, records, and related alarm events cleared permanently.',
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear all datasets' });
  }
});

// DELETE dataset
router.delete('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const user = req.user || {
    id: 'usr_admin_01',
    name: 'Command Center Lead Administrator',
    email: 'admin@tatapower.com',
  };

  const dataset = db.getDatasetById(req.params.id);
  const datasetName = dataset?.name || req.params.id;

  const success = await db.deleteDataset(req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Dataset not found' });
  }

  await db.addActivityLog({
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    action: 'DATASET_DELETED',
    details: `Permanently deleted dataset "${datasetName}" [ID: ${req.params.id}] and all associated telemetry records.`,
    entityType: 'DATASET',
    entityId: req.params.id,
  });

  res.json({ message: 'Dataset and associated records deleted permanently' });
});

export default router;
