export type SettingKind = "position" | "project" | "status";

export type SettingItem = {
  id: string;
  name: string;
  kind: SettingKind;
  description?: string;
  active: boolean;
};
