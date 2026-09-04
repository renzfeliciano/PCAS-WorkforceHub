import { z } from "zod";

export const leaveEligibilitySchema = z.enum(["Any", "Female", "Male"]);

export const createLeaveTypeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((value) => value.toUpperCase()),
  eligibility: leaveEligibilitySchema.default("Any"),
  description: z.string().trim().max(160).optional(),
});

export const updateLeaveTypeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((value) => value.toUpperCase())
    .optional(),
  eligibility: leaveEligibilitySchema.optional(),
  description: z.string().trim().max(160).optional(),
  active: z.boolean().optional(),
});

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;
export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
