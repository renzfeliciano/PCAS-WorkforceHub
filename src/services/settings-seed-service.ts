import { SettingModel } from "@/repositories/models/setting-model";
import { attendanceStatusCatalog, seedCatalog } from "@/lib/seed-catalog";
import { ATTENDANCE_STATUS_CATEGORY, EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import type { SettingKind } from "@/types/settings";

type SeedRecord = { name: string; kind: SettingKind; category?: string; sortOrder: number };

function upsertSettings(records: SeedRecord[]) {
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
  return upsertSettings(records);
}

export async function seedAttendanceStatuses() {
  const records = attendanceStatusCatalog.map((name, sortOrder) => ({
    name,
    kind: "status" as const,
    category: ATTENDANCE_STATUS_CATEGORY,
    sortOrder,
  }));
  return upsertSettings(records);
}
