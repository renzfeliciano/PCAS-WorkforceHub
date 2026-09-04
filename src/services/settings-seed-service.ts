import { SettingModel } from "@/repositories/models/setting-model";
import { seedCatalog } from "@/lib/seed-catalog";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import type { SettingKind } from "@/types/settings";

export async function seedSettingsCatalog(
  kinds: readonly SettingKind[] = ["position", "project", "status"],
) {
  const records = kinds.flatMap((kind) =>
    seedCatalog[kind].map((name, sortOrder) => ({
      name,
      kind,
      sortOrder,
      ...(kind === "status" ? { category: EMPLOYMENT_STATUS_CATEGORY } : {}),
    })),
  );
  const operations = records.map((record) => {
    const { sortOrder, ...setting } = record;
    return {
      updateOne: {
        filter: setting,
        update: {
          $set: { sortOrder },
          $setOnInsert: { ...setting, active: true },
        },
        upsert: true,
      },
    };
  });
  return SettingModel.bulkWrite(operations, { ordered: false });
}
