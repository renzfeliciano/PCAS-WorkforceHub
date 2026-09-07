import { model, models, Schema } from "mongoose";
import { DEFAULT_APPLICATION_STAGE } from "@/schemas/job-application";

const jobApplicationSchema = new Schema(
  {
    applicantName: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    // Catalog-driven (RECRUITMENT_STAGE_CATEGORY), not a fixed enum — admins
    // can rename/add pipeline stages in Settings without a schema change.
    stage: { type: String, required: true, default: DEFAULT_APPLICATION_STAGE, index: true },
    appliedDate: { type: String, required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export const JobApplicationModel =
  models.JobApplication ?? model("JobApplication", jobApplicationSchema);
