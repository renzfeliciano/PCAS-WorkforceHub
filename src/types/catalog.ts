export type CatalogKind = "position" | "project" | "status";

export const EMPLOYMENT_STATUS_CATEGORY = "employment";
export const ATTENDANCE_STATUS_CATEGORY = "attendance";
export const RECRUITMENT_STAGE_CATEGORY = "recruitment";
export const EVENT_CATEGORY_CATEGORY = "event";
export const CASE_CLASSIFICATION_CATEGORY = "case-classification";
export const CASE_STATUS_CATEGORY = "case-status";

export type CatalogItem = {
  id: string;
  name: string;
  kind: CatalogKind;
  category?: string;
  description?: string;
  active: boolean;
  /** Position entries only: grants the attendance self-service exception to anyone holding this position. */
  grantsAttendanceSelfService: boolean;
  /**
   * Employment-status entries only (kind "status", category EMPLOYMENT_STATUS_CATEGORY):
   * whether an employee currently on this status counts toward "active" headcount
   * (e.g. the dashboard's Total employees stat). Defaults to true so a newly
   * added status (or one seeded before this flag existed) counts as active
   * until an Admin/HR explicitly turns it off — e.g. for Terminated/Resigned/AWOL.
   */
  countsAsActiveEmployment: boolean;
};
