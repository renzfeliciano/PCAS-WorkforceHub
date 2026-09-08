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

/**
 * Mongoose builds schema-declared indexes (including `unique: true`) in the
 * background after a model is registered — nothing about calling
 * `mongoose.connect()` waits for that. Left alone, a duplicate-key write
 * (a repeated employee number, username, catalog entry, etc.) can slip
 * through unrejected if it lands in the narrow window before that
 * background build finishes — realistically only right after a genuinely
 * fresh database's very first requests, since the indexes already exist on
 * every later cold start against a long-lived cluster and `Model.init()`
 * on an existing index is a fast no-op confirmation, not a rebuild. Still,
 * "genuinely fresh database's first requests" is exactly the state a brand
 * new client deployment is in, so this is awaited explicitly rather than
 * left to eventually-consistent background work.
 */
async function ensureIndexesReady() {
  const models = await import("@/repositories/models");
  await Promise.all(Object.values(models).map((model) => model.init()));
}

export async function connectMongoDB() {
  if (cache.connection) return cache.connection;
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is not configured");
  cache.promise ??= mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  }).then(async (connection) => {
    await ensureIndexesReady();
    return connection;
  });
  cache.connection = await cache.promise;
  return cache.connection;
}
