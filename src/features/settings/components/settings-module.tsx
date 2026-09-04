"use client";

import { ShieldCheck } from "lucide-react";
import { useSettingsCatalog } from "@/features/settings/hooks/use-settings-catalog";
import { useLeaveTypes } from "@/features/settings/hooks/use-leave-types";
import { SettingsCatalogSection } from "@/features/settings/components/settings-catalog-section";
import { LeaveTypesSection } from "@/features/settings/components/leave-types-section";
import { SettingsCatalogSkeleton } from "@/features/settings/components/settings-catalog-skeleton";
import { EMPLOYMENT_STATUS_CATEGORY } from "@/types/settings";
import type { SettingItem, SettingKind } from "@/types/settings";
import type { LeaveType } from "@/types/leave-type";

const LABELS: Record<SettingKind, string> = {
  position: "Positions",
  project: "Projects / sites",
  status: "Employment statuses",
};
const CATALOG_KINDS: SettingKind[] = ["position", "project", "status"];

export function SettingsModule({
  seedFlags,
  leaveTypeSeedEnabled,
  initialSettings,
  initialLeaveTypes,
}: Readonly<{
  seedFlags: Record<SettingKind, boolean>;
  leaveTypeSeedEnabled: boolean;
  initialSettings?: SettingItem[];
  initialLeaveTypes?: LeaveType[];
}>) {
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
        <>
          <div className="settings-grid">
            {CATALOG_KINDS.map((kind) => (
              <SettingsCatalogSection
                key={kind}
                kind={kind}
                label={LABELS[kind]}
                items={settings.items.filter(
                  (item) =>
                    item.kind === kind &&
                    (kind !== "status" ||
                      item.category === EMPLOYMENT_STATUS_CATEGORY),
                )}
                category={
                  kind === "status" ? EMPLOYMENT_STATUS_CATEGORY : undefined
                }
                seedEnabled={seedFlags[kind]}
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
                  await settings.seed(kind);
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
        </>
      )}
    </div>
  );
}
