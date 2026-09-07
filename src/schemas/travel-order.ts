import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const travelOrderSchema = z
  .object({
    employeeIds: z.array(z.string().trim().min(1)).min(1, "Select at least one employee"),
    startDate: isoDate,
    endDate: isoDate,
    remarks: z.string().trim().max(255).optional(),
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

export const createTravelOrderSchema = travelOrderSchema;
export const updateTravelOrderSchema = travelOrderSchema;
export type TravelOrderInput = z.infer<typeof travelOrderSchema>;
