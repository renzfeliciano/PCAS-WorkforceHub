import { MongoMemoryServer } from "mongodb-memory-server";

// Runs once for the whole Vitest run (see vitest.config.ts's globalSetup),
// before any test file's own module code executes — so MONGODB_URI is
// already set by the time a repository test file imports @/lib/mongodb.
// One shared in-memory MongoDB for the whole suite, not one per file: each
// repository test file connects via the app's own connectMongoDB() (which
// caches the connection process-wide) and cleans up only the collection(s)
// it touches, rather than paying MongoMemoryServer's startup cost repeatedly.
let mongod: MongoMemoryServer | undefined;

export async function setup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
}

export async function teardown() {
  await mongod?.stop();
}
