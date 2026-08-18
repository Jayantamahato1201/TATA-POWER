import mongoose from 'mongoose';
import { Readable } from 'stream';

let gridFsBucket: mongoose.mongo.GridFSBucket | null = null;

export function getGridFSBucket(): mongoose.mongo.GridFSBucket | null {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    if (!gridFsBucket) {
      gridFsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'telemetry_files',
      });
    }
    return gridFsBucket;
  }
  return null;
}

export interface StoredFileInfo {
  fileId: string;
  filename: string;
  length: number;
  contentType: string;
  storageType: 'gridfs' | 'inline';
}

/**
 * Stores raw file safely into MongoDB GridFS (production-grade binary chunk storage).
 * Bypasses 16MB document limits and prevents memory bloat.
 */
export async function saveFileToGridFS(
  filename: string,
  buffer: Buffer,
  contentType: string,
  metadata?: Record<string, any>
): Promise<string> {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error('GridFS is not accessible: MongoDB is not connected.');
  }

  return new Promise((resolve, reject) => {
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const uploadStream = bucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        contentType,
        uploadedAt: new Date().toISOString(),
        sizeBytes: buffer.length,
      },
    });

    uploadStream.on('error', (err) => {
      console.error('[GridFS] Upload stream error:', err);
      reject(err);
    });

    uploadStream.on('finish', () => {
      console.info(`[GridFS] Stored binary file "${filename}" (${buffer.length} bytes) with ID: ${uploadStream.id}`);
      resolve(uploadStream.id.toString());
    });

    readableStream.pipe(uploadStream);
  });
}

/**
 * Retrieves raw file from MongoDB GridFS as Buffer
 */
export async function getFileFromGridFS(fileIdStr: string): Promise<{ buffer: Buffer; filename: string; contentType?: string }> {
  const bucket = getGridFSBucket();
  if (!bucket) {
    throw new Error('GridFS is not accessible: MongoDB is not connected.');
  }

  const fileId = new mongoose.Types.ObjectId(fileIdStr);
  const downloadStream = bucket.openDownloadStream(fileId);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let fileMeta: any = null;

    downloadStream.on('data', (chunk) => chunks.push(chunk));
    downloadStream.on('error', (err) => {
      console.error(`[GridFS] Error reading file ${fileIdStr}:`, err);
      reject(err);
    });

    downloadStream.on('end', async () => {
      try {
        const files = await bucket.find({ _id: fileId }).toArray();
        if (files && files[0]) {
          fileMeta = files[0];
        }
      } catch (e) {
        // metadata read failure is non-blocking
      }
      resolve({
        buffer: Buffer.concat(chunks),
        filename: fileMeta?.filename || 'telemetry_export.csv',
        contentType: fileMeta?.contentType || 'text/csv',
      });
    });
  });
}

/**
 * Deletes file from MongoDB GridFS
 */
export async function deleteFileFromGridFS(fileIdStr: string): Promise<boolean> {
  const bucket = getGridFSBucket();
  if (!bucket || !fileIdStr) return false;
  try {
    const fileId = new mongoose.Types.ObjectId(fileIdStr);
    await bucket.delete(fileId);
    console.info(`[GridFS] Deleted file ${fileIdStr} from telemetry_files bucket.`);
    return true;
  } catch (err: any) {
    console.warn(`[GridFS] Error deleting file ${fileIdStr}:`, err.message);
    return false;
  }
}
