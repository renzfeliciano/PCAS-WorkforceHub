import mongoose from "mongoose";

type MongoCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};
const globalMongo = globalThis as typeof globalThis & {
  mongooseCache?: MongoCache;
};
const cache = globalMongo.mongooseCache ?? { connection: null, promise: null };
globalMongo.mongooseCache = cache;

export async function connectMongoDB() {
  if (cache.connection) return cache.connection;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not configured");
  cache.promise ??= mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  cache.connection = await cache.promise;
  return cache.connection;
}
