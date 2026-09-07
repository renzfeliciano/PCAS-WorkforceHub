export type JobApplication = {
  id: string;
  applicantName: string;
  position: string;
  email?: string;
  phone?: string;
  /** Catalog-driven (see RECRUITMENT_STAGE_CATEGORY) — a free string matching a "recruitment" status catalog entry, not a fixed union. */
  stage: string;
  appliedDate: string;
  notes?: string;
  createdAt: string;
};
