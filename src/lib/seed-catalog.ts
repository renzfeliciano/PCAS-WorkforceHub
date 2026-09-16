import type { CatalogKind } from "@/types/catalog";
import type { LeaveEligibility } from "@/types/leave-type";

export const seedCatalog: Record<CatalogKind, readonly string[]> = {
  position: [
    "President",
    "Operations Manager",
    "Administrative Head",
    "Human Resources Generalist/Paralegal",
    "Accounting and Finance Generalist",
    "Building Administrator/Property Manager",
    "Building Engineer",
    "Project Bookkeeper",
    "Billing/Cashier Staff",
    "Front Desk Staff",
    "Maintenance/Handyman",
    "Housekeeper",
    "Accounting Head",
    "Parking Attendant",
    "OJT/Intern",
    "On-Call",
  ],
  project: [
    "EGI Rufino",
    "PCAS – HO",
    "EGI Taft Tower",
    "Ivory Court",
    "EGI Homes Medina",
    "Trinity Plaza Tower 1",
    "Mactan Oasis Gardens",
    "EGI City by the Sea Building I",
    "EGI City by the Sea Building II",
    "EGI City by the Sea Building III",
    "South Insula",
    "West Insula",
    "University Suites",
    "Estrella Condominium Corporation",
    "EGI Albergo Di Ferroca",
    "Metropolitan Terraces Condominium",
  ],
  status: [
    "Transfer",
    "Contractual",
    "Probationary",
    "Regular",
    "Terminated",
    "Resigned",
    "AWOL",
  ],
};

/** Seeded under the "status" kind, category "attendance" (see ATTENDANCE_STATUS_CATEGORY). */
export const attendanceStatusCatalog: readonly string[] = [
  "Present",
  "Absent",
  "Tardy/Late",
  "Half-day",
  "On leave",
  "Day off",
  "Restday work",
  "Holiday work",
  "Undertime",
];

/** Seeded under the "status" kind, category "recruitment" (see RECRUITMENT_STAGE_CATEGORY) — the Kanban columns on the Application tracking board. */
export const recruitmentStageCatalog: readonly string[] = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

/** Seeded under the "status" kind, category "event" (see EVENT_CATEGORY_CATEGORY) — the calendar's event categories. */
export const eventCategoryCatalog: readonly string[] = [
  "Meeting",
  "Holiday",
  "Deadline",
  "Reminder",
  "Other",
];

/** Seeded under the "status" kind, category "case-classification" (see CASE_CLASSIFICATION_CATEGORY). */
export const caseClassificationCatalog: readonly string[] = [
  "SeNA/Labor Case",
  "Criminal Case",
  "Civil Case",
  "HLURB/DSHUD",
  "Others",
];

/** Seeded under the "status" kind, category "case-status" (see CASE_STATUS_CATEGORY). */
export const caseStatusCatalog: readonly string[] = [
  "Mediation",
  "Ongoing",
  "Pending",
  "Dismissed",
];

export const leaveTypeCatalog: readonly {
  name: string;
  code: string;
  eligibility: LeaveEligibility;
}[] = [
  { name: "Vacation Leave", code: "VL", eligibility: "Any" },
  { name: "Sick Leave", code: "SL", eligibility: "Any" },
  { name: "Emergency Leave", code: "EL", eligibility: "Any" },
  // commented for now
  // { name: "Service Incentive Leave", code: "SIL", eligibility: "Any" },
  // { name: "Paternity Leave", code: "PL", eligibility: "Male" },
  // { name: "Maternity Leave", code: "ML", eligibility: "Female" },
  // { name: "Solo Parent Leave", code: "SPL", eligibility: "Any" },
  // { name: "Bereavement Leave", code: "BL", eligibility: "Any" },
  // { name: "Offset", code: "OFF", eligibility: "Any" },
];
