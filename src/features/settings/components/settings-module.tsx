"use client";

import { ShieldCheck } from "lucide-react";
import { useSettingsCatalog } from "@/features/settings/hooks/use-settings-catalog";
import { useLeaveTypes } from "@/features/settings/hooks/use-leave-types";
import { SettingsCatalogSection } from "@/features/settings/components/settings-catalog-section";
import { LeaveTypesSection } from "@/features/settings/components/leave-types-section";
import { SettingsCatalogSkeleton } from "@/features/settings/components/settings-catalog-skeleton";
import {
  ATTENDANCE_STATUS_CATEGORY,
  EMPLOYMENT_STATUS_CATEGORY,
  EVENT_CATEGORY_CATEGORY,
  RECRUITMENT_STAGE_CATEGORY,
} from "@/types/settings";
import type { SettingItem, SettingKind } from "@/types/settings";
import type { LeaveType } from "@/types/leave-type";

type CatalogSection = {
  key: string;
  kind: SettingKind;
  category?: string;
  label: string;
  seedEnabled: boolean;
};

export function SettingsModule({
  seedFlags,
  attendanceStatusSeedEnabled,
  recruitmentStageSeedEnabled,
  eventCategorySeedEnabled,
  leaveTypeSeedEnabled,
  initialSettings,
  initialLeaveTypes,
}: Readonly<{
  seedFlags: Record<SettingKind, boolean>;
  attendanceStatusSeedEnabled: boolean;
  recruitmentStageSeedEnabled: boolean;
  eventCategorySeedEnabled: boolean;
  leaveTypeSeedEnabled: boolean;
  initialSettings?: SettingItem[];
  initialLeaveTypes?: LeaveType[];
}>) {
  const sections: CatalogSection[] = [
    { key: "position", kind: "position", label: "Positions", seedEnabled: seedFlags.position },
    { key: "project", kind: "project", label: "Projects / sites", seedEnabled: seedFlags.project },
    {
      key: "status:employment",
      kind: "status",
      category: EMPLOYMENT_STATUS_CATEGORY,
      label: "Employment statuses",
      seedEnabled: seedFlags.status,
    },
    {
      key: "status:attendance",
      kind: "status",
      category: ATTENDANCE_STATUS_CATEGORY,
      label: "Attendance statuses",
      seedEnabled: attendanceStatusSeedEnabled,
    },
    {
      key: "status:recruitment",
      kind: "status",
      category: RECRUITMENT_STAGE_CATEGORY,
      label: "Recruitment stages",
      seedEnabled: recruitmentStageSeedEnabled,
    },
    {
      key: "status:event",
      kind: "status",
      category: EVENT_CATEGORY_CATEGORY,
      label: "Event categories",
      seedEnabled: eventCategorySeedEnabled,
    },
  ];
  const settings = useSettingsCatalog(initialSettings);
  const leaveTypes = useLeaveTypes(initialLeaveTypes);

  return (
    <div className="settings-page">
      <div className="page-head">
        <div>
          <p className="eyebrow">Workspace administration</p>
          <h1>Settings</h1>
          <p className="muted">
            Manage the options used across employee records.
          </p>
        </div>
        <span className="role-badge">
          <ShieldCheck size={15} /> Admin access
        </span>
      </div>
      {(settings.error || leaveTypes.error) && (
        <p className="inline-error" role="alert">
          {settings.error ?? leaveTypes.error}
        </p>
      )}
      {settings.isLoading || leaveTypes.isLoading ? (
        <SettingsCatalogSkeleton />
      ) : (
        <div className="settings-grid">
          {sections.map((section) => (
            <SettingsCatalogSection
              key={section.key}
              kind={section.kind}
              label={section.label}
              items={settings.items.filter(
                (item) =>
                  item.kind === section.kind &&
                  (!section.category || item.category === section.category),
              )}
              category={section.category}
              seedEnabled={section.seedEnabled}
              onCreate={async (input) => {
                await settings.create(input);
              }}
              onUpdate={async (id, input) => {
                await settings.update(id, input);
              }}
              onToggle={async (id, active) => {
                await settings.update(id, { active });
              }}
              onDelete={async (id) => {
                await settings.remove(id);
              }}
              onSeed={async () => {
                await settings.seed(section.kind, section.category);
              }}
            />
          ))}
          <LeaveTypesSection
            items={leaveTypes.items}
            seedEnabled={leaveTypeSeedEnabled}
            onCreate={async (input) => {
              await leaveTypes.create(input);
            }}
            onUpdate={async (id, input) => {
              await leaveTypes.update(id, input);
            }}
            onDelete={async (id) => {
              await leaveTypes.remove(id);
            }}
            onSeed={async () => {
              await leaveTypes.seed();
            }}
          />
        </div>
      )}
    </div>
  );
}
