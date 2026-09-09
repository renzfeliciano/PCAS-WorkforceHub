export type SettingKind = "position" | "project" | "status";

export const EMPLOYMENT_STATUS_CATEGORY = "employment";
export const ATTENDANCE_STATUS_CATEGORY = "attendance";
export const RECRUITMENT_STAGE_CATEGORY = "recruitment";
export const EVENT_CATEGORY_CATEGORY = "event";

export type SettingItem = {
  id: string;
  name: string;
  kind: SettingKind;
  category?: string;
  description?: string;
  active: boolean;
};
