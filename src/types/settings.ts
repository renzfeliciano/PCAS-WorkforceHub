export type SettingKind = "position" | "project" | "status";

export const EMPLOYMENT_STATUS_CATEGORY = "employment";
export const ATTENDANCE_STATUS_CATEGORY = "attendance";
export const RECRUITMENT_STAGE_CATEGORY = "recruitment";
export const EVENT_CATEGORY_CATEGORY = "event";
export const CASE_CLASSIFICATION_CATEGORY = "case-classification";
export const CASE_STATUS_CATEGORY = "case-status";

export type SettingItem = {
  id: string;
  name: string;
  kind: SettingKind;
  category?: string;
  description?: string;
  active: boolean;
  /** Position entries only: grants the attendance self-service exception to anyone holding this position. */
  grantsAttendanceSelfService: boolean;
};
