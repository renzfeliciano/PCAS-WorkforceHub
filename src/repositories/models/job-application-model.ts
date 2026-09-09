import { model, models, Schema } from "mongoose";

const jobApplicationSchema = new Schema(
  {
    applicantName: { type: String, required: true, trim: true },
    // Catalog-driven (kind "position") Setting._id — the applicant's
    // position dropdown is sourced from the same Position catalog Employee
    // uses, so it gets the same id-reference treatment.
    positionId: { type: String, required: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    // Catalog-driven (RECRUITMENT_STAGE_CATEGORY) Setting._id, not a fixed
    // enum — admins can rename/add pipeline stages in Settings without a
    // schema change, and a rename is reflected here without touching this
    // document (resolved to a display name at read time).
    stageId: { type: String, required: true, index: true },
    appliedDate: { type: String, required: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

export const JobApplicationModel =
  models.JobApplication ?? model("JobApplication", jobApplicationSchema);
