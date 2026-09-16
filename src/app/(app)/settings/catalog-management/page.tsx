import { withRoleGuard } from "@/lib/with-role-guard";
import {
  isAttendanceStatusSeedingEnabled,
  isCaseClassificationSeedingEnabled,
  isCaseStatusSeedingEnabled,
  isEventCategorySeedingEnabled,
  isLeaveTypeSeedingEnabled,
  isRecruitmentStageSeedingEnabled,
  isSeedingEnabled,
} from "@/lib/seed-flags";
import { connectMongoDB } from "@/lib/mongodb";
import { MongoCatalogRepository } from "@/repositories/catalog-repository";
import { MongoLeaveTypeRepository } from "@/repositories/leave-type-repository";
import { listCatalogEntries } from "@/services/catalog-service";
import { listLeaveTypes } from "@/services/leave-type-service";
import { SettingsModule } from "@/features/settings/components/settings-module";

export default async function CatalogManagementPage() {
  await withRoleGuard(["Admin", "HR"]);
  await connectMongoDB();
  const [initialSettings, initialLeaveTypes] = await Promise.all([
    listCatalogEntries(new MongoCatalogRepository()),
    listLeaveTypes(new MongoLeaveTypeRepository()),
  ]);
  return (
    <SettingsModule
      seedFlags={{
        position: isSeedingEnabled("position"),
        project: isSeedingEnabled("project"),
        status: isSeedingEnabled("status"),
      }}
      attendanceStatusSeedEnabled={isAttendanceStatusSeedingEnabled()}
      recruitmentStageSeedEnabled={isRecruitmentStageSeedingEnabled()}
      eventCategorySeedEnabled={isEventCategorySeedingEnabled()}
      caseClassificationSeedEnabled={isCaseClassificationSeedingEnabled()}
      caseStatusSeedEnabled={isCaseStatusSeedingEnabled()}
      leaveTypeSeedEnabled={isLeaveTypeSeedingEnabled()}
      initialSettings={initialSettings}
      initialLeaveTypes={initialLeaveTypes}
    />
  );
}
