/**
 * One-time infra step for the Setting -> Catalog rename: atomically renames
 * the physical MongoDB collection from "settings" to "catalogs" so it lines
 * up with the already-deployed code (CatalogModel reads/writes "catalogs").
 * Safe to run multiple times — no-ops if "settings" no longer exists or
 * "catalogs" already does.
 *
 *   npx tsx scripts/rename-settings-to-catalogs.ts
 */
import mongoose from "mongoose";
import { config } from "dotenv";
import { connectMongoDB } from "@/lib/mongodb";

config({ path: ".env.local", override: true });
config({ path: ".env" });

async function run() {
  await connectMongoDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const collections = await db.listCollections().toArray();
  const names = new Set(collections.map((c) => c.name));

  const catalogsCount = names.has("catalogs") ? await db.collection("catalogs").countDocuments() : 0;

  if (names.has("catalogs") && catalogsCount > 0) {
    console.log(`"catalogs" already exists with ${catalogsCount} document(s) — nothing to do.`);
  } else if (!names.has("settings")) {
    console.log('"settings" does not exist — nothing to rename (fresh database?).');
  } else {
    // Mongoose auto-creates an empty "catalogs" collection (with its
    // indexes) the moment CatalogModel connects, even before any document is
    // written — connectMongoDB() does this on purpose so indexes are ready
    // before the app serves traffic. That empty shell has to be dropped
    // before the real "settings" data can take its place under the new name
    // (rename refuses to overwrite an existing collection otherwise).
    if (names.has("catalogs")) {
      await db.collection("catalogs").drop();
      console.log('Dropped the empty auto-created "catalogs" collection.');
    }
    await db.collection("settings").rename("catalogs");
    console.log('Renamed collection "settings" -> "catalogs".');
  }

  const count = await db.collection("catalogs").countDocuments();
  console.log(`"catalogs" now has ${count} document(s).`);

  await mongoose.connection.close();
}

run().catch((error: unknown) => {
  console.error("Rename failed", error);
  process.exitCode = 1;
});
