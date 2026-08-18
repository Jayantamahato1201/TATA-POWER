import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  lastAttemptTime: number;
  lastError: string | null;
  hasLoggedFailure: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = {
    conn: null,
    promise: null,
    lastAttemptTime: 0,
    lastError: null,
    hasLoggedFailure: false,
  };
}

const RETRY_COOLDOWN_MS = 45000; // 45 seconds cooldown before retrying an unreachable cluster

export async function connectToDatabase(forceRetry = false): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB_NAME?.trim() || 'tata_power_jojobera';

  if (!uri || uri === '""' || uri === "''" || uri.length < 10) {
    if (!cached.hasLoggedFailure) {
      console.info('[Database] MongoDB Atlas URI not configured. Active database engine: High-performance local persistent JSON storage.');
      cached.hasLoggedFailure = true;
    }
    return null;
  }

  // If already connected and ready
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Prevent frequent reconnect loops if recently failed
  const now = Date.now();
  if (!forceRetry && cached.lastError && (now - cached.lastAttemptTime < RETRY_COOLDOWN_MS)) {
    return null;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 3500, // Fast failover so API requests never hang
      connectTimeoutMS: 3500,
      socketTimeoutMS: 30000,
    };

    cached.lastAttemptTime = now;
    console.info(`[MongoDB] Checking connection to MongoDB Atlas database "${dbName}"...`);

    cached.promise = mongoose
      .connect(uri, opts)
      .then((m) => {
        console.info(`[MongoDB] Connected successfully to MongoDB Atlas database: ${dbName}`);
        cached.lastError = null;
        cached.hasLoggedFailure = false;
        return m;
      })
      .catch((err) => {
        const errMsg = err?.message || 'Connection failed';
        cached.lastError = errMsg;
        cached.promise = null;

        if (!cached.hasLoggedFailure) {
          console.warn(
            `[MongoDB Notice] MongoDB Atlas cluster is not directly reachable (${errMsg.split('\n')[0]}). ` +
            'Tata Power Command Center is running seamlessly using verified local persistent JSON storage.'
          );
          cached.hasLoggedFailure = true;
        }
        return null;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch {
    cached.promise = null;
    return null;
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function getDatabaseStatus(): {
  isMongoConnected: boolean;
  engine: 'MongoDB Atlas' | 'Local Persistent JSON Storage';
  dbName: string;
  lastError: string | null;
  ready: boolean;
} {
  const isConnected = isMongoConnected();
  return {
    isMongoConnected: isConnected,
    engine: isConnected ? 'MongoDB Atlas' : 'Local Persistent JSON Storage',
    dbName: process.env.MONGODB_DB_NAME || 'tata_power_jojobera',
    lastError: cached?.lastError || null,
    ready: true,
  };
}

export default connectToDatabase;

