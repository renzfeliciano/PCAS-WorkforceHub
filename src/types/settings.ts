export type SettingKind = "position" | "project" | "status";

export const EMPLOYMENT_STATUS_CATEGORY = "employment";

export type SettingItem = {
  id: string;
  name: string;
  kind: SettingKind;
  category?: string;
  description?: string;
  active: boolean;
};
