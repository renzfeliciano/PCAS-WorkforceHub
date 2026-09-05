import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const leaveRecordSchema = z
  .object({
    leaveTypeId: z.string().trim().min(1),
    startDate: isoDate,
    endDate: isoDate,
    reason: z.string().trim().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after the start date.",
      });
    }
  });

export const createLeaveRecordSchema = leaveRecordSchema;
export const updateLeaveRecordSchema = leaveRecordSchema;
export type LeaveRecordInput = z.infer<typeof leaveRecordSchema>;
