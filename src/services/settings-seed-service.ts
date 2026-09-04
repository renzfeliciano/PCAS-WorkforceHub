import { SettingModel } from "@/repositories/models/setting-model";
import { seedCatalog } from "@/lib/seed-catalog";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import type { SettingKind } from "@/types/settings";

export async function seedSettingsCatalog(
  kinds: readonly SettingKind[] = ["position", "project", "status"],
) {
  const records = kinds.flatMap((kind) =>
    seedCatalog[kind].map((name) => ({
      name,
      kind,
      ...(kind === "status" ? { category: EMPLOYMENT_STATUS_CATEGORY } : {}),
    })),
  );
  const operations = records.map((record) => ({
    updateOne: {
      filter: record,
      update: { $setOnInsert: { ...record, active: true } },
      upsert: true,
    },
  }));
  return SettingModel.bulkWrite(operations, { ordered: false });
}
