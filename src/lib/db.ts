import mongoose from "mongoose";

type MongoCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};
const globalForMongo = globalThis as typeof globalThis & {
  mongoose?: MongoCache;
};
const cached = globalForMongo.mongoose ?? { connection: null, promise: null };
globalForMongo.mongoose = cached;

export async function connectDatabase() {
  if (cached.connection) return cached.connection;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  cached.promise ??= mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  cached.connection = await cached.promise;
  return cached.connection;
}
