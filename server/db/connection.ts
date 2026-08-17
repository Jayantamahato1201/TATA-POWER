import mongoose from 'mongoose';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache for serverless environments (Vercel, AWS Lambda, Cloud Run, etc.)
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'tata_power_jojobera';

  if (!uri) {
    console.info('[MongoDB] MONGODB_URI environment variable is not defined. Using local persistence fallback until configured.');
    return null;
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    console.info(`[MongoDB] Initiating connection to MongoDB Atlas database "${dbName}"...`);
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.info(`[MongoDB] Connected successfully to MongoDB Atlas database: ${dbName}`);
      return m;
    }).catch((err) => {
      console.error('[MongoDB] Connection to MongoDB Atlas failed:', err.message);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    return null;
  }
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export default connectToDatabase;
