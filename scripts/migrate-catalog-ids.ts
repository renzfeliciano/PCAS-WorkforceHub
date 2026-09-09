/**
 * One-off migration: several collections used to store a copy of a catalog
 * entry's name string (Employee.position/projectSite/employmentStatus,
 * JobApplication.position/stage). They now store the catalog entry's id
 * instead (positionId/projectSiteId/employmentStatusId/stageId), so a later
 * rename in Settings shows up everywhere the record is displayed instead of
 * going stale. This script backfills existing documents from the old string
 * fields to the new id fields, using the matching Setting (kind
 * "position"/"project"/"status") by name — creating one if it's somehow
 * missing, rather than dropping data.
 *
 * Run once, manually, after deploying the code that expects the new id
 * fields:
 *   npx tsx scripts/migrate-catalog-ids.ts
 */
import mongoose from "mongoose";
import { config } from "dotenv";
import { connectMongoDB } from "@/lib/mongodb";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { JobApplicationModel } from "@/repositories/models/job-application-model";
import { SettingModel } from "@/repositories/models/setting-model";
import { EMPLOYMENT_STATUS_CATEGORY, RECRUITMENT_STAGE_CATEGORY } from "@/types/settings";

config({ path: ".env.local", override: true });
config({ path: ".env" });

type CatalogField = {
  key: string;
  idKey: string;
  kind: "position" | "project" | "status";
  category?: string;
};

type LegacyDoc = { _id: mongoose.Types.ObjectId; [key: string]: unknown };

async function findOrCreateCatalogId(
  kind: "position" | "project" | "status",
  name: string,
  category: string | undefined,
  cache: Map<string, string>,
): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;
  const query = { kind, name, ...(category ? { category } : {}) };
  const existing = await SettingModel.findOne(query).lean<{ _id: mongoose.Types.ObjectId } | null>();
  const id = existing
    ? existing._id.toString()
    : await (async () => {
        console.warn(`No existing "${kind}" catalog entry named "${name}" — creating one so no data is lost.`);
        const created = await SettingModel.create({ ...query, active: true });
        return created._id.toString();
      })();
  cache.set(name, id);
  return id;
}

async function migrateCollection(
  label: string,
  model: { collection: mongoose.Collection },
  fields: CatalogField[],
) {
  // Mongoose no longer knows about these legacy string fields (they're not
  // in the schema anymore), so this goes through the native collection to
  // see the raw, pre-migration documents as actually stored.
  const collection = model.collection;
  const legacyDocs = (await collection
    .find({ $or: fields.map((field) => ({ [field.key]: { $exists: true } })) })
    .toArray()) as unknown as LegacyDoc[];

  console.log(`Found ${legacyDocs.length} ${label} document(s) still on a legacy string field.`);

  const caches = new Map(fields.map((field) => [field.key, new Map<string, string>()]));

  let migrated = 0;
  for (const doc of legacyDocs) {
    const $set: Record<string, string> = {};
    const $unset: Record<string, ""> = {};

    for (const field of fields) {
      const value = doc[field.key];
      if (typeof value !== "string") continue;
      $set[field.idKey] = await findOrCreateCatalogId(field.kind, value, field.category, caches.get(field.key)!);
      $unset[field.key] = "";
    }

    if (Object.keys($set).length > 0) {
      await collection.updateOne({ _id: doc._id }, { $set, $unset });
      migrated += 1;
    }
  }

  console.log(`Migrated ${migrated} ${label} document(s).`);
}

async function migrate() {
  await connectMongoDB();

  await migrateCollection("employee", EmployeeModel, [
    { key: "position", idKey: "positionId", kind: "position" },
    { key: "projectSite", idKey: "projectSiteId", kind: "project" },
    { key: "employmentStatus", idKey: "employmentStatusId", kind: "status", category: EMPLOYMENT_STATUS_CATEGORY },
  ]);

  await migrateCollection("job application", JobApplicationModel, [
    { key: "position", idKey: "positionId", kind: "position" },
    { key: "stage", idKey: "stageId", kind: "status", category: RECRUITMENT_STAGE_CATEGORY },
  ]);

  await mongoose.connection.close();
}

migrate().catch((error: unknown) => {
  console.error("Migration failed", error);
  process.exitCode = 1;
});
