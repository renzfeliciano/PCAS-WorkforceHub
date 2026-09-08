import { z } from "zod";
import { contactNumberSchema, emailSchema } from "@/schemas/shared";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** The default stage a new applicant lands in — must match a seeded name in the "recruitment" status catalog (see RECRUITMENT_STAGE_CATEGORY). */
export const DEFAULT_APPLICATION_STAGE = "Applied";

export const jobApplicationSchema = z.object({
  applicantName: z.string().trim().min(1, "Applicant name is required").max(120),
  position: z.string().trim().min(1, "Position is required").max(120),
  email: emailSchema.optional(),
  phone: contactNumberSchema.optional(),
  appliedDate: isoDate,
  remarks: z.string().trim().max(500).optional(),
});

export const createJobApplicationSchema = jobApplicationSchema;
export const updateJobApplicationSchema = jobApplicationSchema;
export type JobApplicationInput = z.infer<typeof jobApplicationSchema>;

/** Stages are catalog-driven (admin-editable in Settings), so this is a loose
 * non-empty check rather than a fixed enum — the same trust-the-UI-dropdown
 * approach used for attendance status. */
export const moveApplicationStageSchema = z.object({
  stage: z.string().trim().min(1, "Select a stage"),
});
export type MoveApplicationStageInput = z.infer<typeof moveApplicationStageSchema>;
