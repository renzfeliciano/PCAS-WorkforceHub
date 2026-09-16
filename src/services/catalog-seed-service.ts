import { CatalogModel } from "@/repositories/models/catalog-model";
import {
  attendanceStatusCatalog,
  caseClassificationCatalog,
  caseStatusCatalog,
  eventCategoryCatalog,
  recruitmentStageCatalog,
  seedCatalog,
} from "@/lib/seed-catalog";
import {
  ATTENDANCE_STATUS_CATEGORY,
  CASE_CLASSIFICATION_CATEGORY,
  CASE_STATUS_CATEGORY,
  EMPLOYMENT_STATUS_CATEGORY,
  EVENT_CATEGORY_CATEGORY,
  RECRUITMENT_STAGE_CATEGORY,
} from "@/types/catalog";
import type { CatalogKind } from "@/types/catalog";

type SeedRecord = { name: string; kind: CatalogKind; category?: string; sortOrder: number };

function upsertCatalogEntries(records: SeedRecord[]) {
  const operations = records.map((record) => {
    const { sortOrder, ...entry } = record;
    return {
      updateOne: {
        filter: entry,
        update: {
          $set: { sortOrder },
          $setOnInsert: { ...entry, active: true },
        },
        upsert: true,
      },
    };
  });
  return CatalogModel.bulkWrite(operations, { ordered: false });
}

export async function seedCatalogEntries(
  kinds: readonly CatalogKind[] = ["position", "project", "status"],
) {
  const records = kinds.flatMap((kind) =>
    seedCatalog[kind].map((name, sortOrder) => ({
      name,
      kind,
      sortOrder,
      ...(kind === "status" ? { category: EMPLOYMENT_STATUS_CATEGORY } : {}),
    })),
  );
  return upsertCatalogEntries(records);
}

export async function seedAttendanceStatuses() {
  const records = attendanceStatusCatalog.map((name, sortOrder) => ({
    name,
    kind: "status" as const,
    category: ATTENDANCE_STATUS_CATEGORY,
    sortOrder,
  }));
  return upsertCatalogEntries(records);
}

export async function seedRecruitmentStages() {
  const records = recruitmentStageCatalog.map((name, sortOrder) => ({
    name,
    kind: "status" as const,
    category: RECRUITMENT_STAGE_CATEGORY,
    sortOrder,
  }));
  return upsertCatalogEntries(records);
}

export async function seedEventCategories() {
  const records = eventCategoryCatalog.map((name, sortOrder) => ({
    name,
    kind: "status" as const,
    category: EVENT_CATEGORY_CATEGORY,
    sortOrder,
  }));
  return upsertCatalogEntries(records);
}

export async function seedCaseClassifications() {
  const records = caseClassificationCatalog.map((name, sortOrder) => ({
    name,
    kind: "status" as const,
    category: CASE_CLASSIFICATION_CATEGORY,
    sortOrder,
  }));
  return upsertCatalogEntries(records);
}

export async function seedCaseStatuses() {
  const records = caseStatusCatalog.map((name, sortOrder) => ({
    name,
    kind: "status" as const,
    category: CASE_STATUS_CATEGORY,
    sortOrder,
  }));
  return upsertCatalogEntries(records);
}
