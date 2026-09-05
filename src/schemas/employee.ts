import { z } from "zod";
import { paginationQuerySchema, sortQuerySchema } from "@/schemas/list-query";
import { needsEndOfContract, needsLastDay } from "@/lib/employment-status";

const requiredText = z.string().trim().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const employeeSortFields = [
  "employeeNumber",
  "name",
  "position",
  "projectSite",
] as const;
export const genderSchema = z.enum(["Male", "Female"]);

/** SSS: XX-XXXXXXX-X (10 digits) */
export const sssNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{7}-\d{1}$/, "Use format XX-XXXXXXX-X");
/** PhilHealth: XX-XXXXXXXXX-X (12 digits) */
export const philHealthNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{9}-\d{1}$/, "Use format XX-XXXXXXXXX-X");
/** Pag-IBIG: XXXX-XXXX-XXXX (12 digits) */
export const pagIbigNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{4}-\d{4}$/, "Use format XXXX-XXXX-XXXX");
/** TIN: XXX-XXX-XXX (9 digits) or XXX-XXX-XXX-XXX (12 digits with branch code) */
export const tinNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{3}-\d{3}-\d{3}(-\d{3})?$/, "Use format XXX-XXX-XXX or XXX-XXX-XXX-XXX");
/** PH mobile number: XXXX-XXX-XXXX (11 digits) */
export const contactNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{3}-\d{4}$/, "Use format XXXX-XXX-XXXX");
export const leaveBalanceSchema = z.object({
  leaveTypeId: z.string().trim().min(1),
  balance: z.number().int().min(0),
});

const employeeObjectSchema = z.object({
  employeeNumber: requiredText,
  name: requiredText.max(30, "Must be 30 characters or fewer"),
  gender: genderSchema,
  position: requiredText,
  projectSite: requiredText,
  dateHired: isoDate,
  endOfContract: isoDate.optional().nullable(),
  lastDay: isoDate.optional().nullable(),
  employmentStatus: requiredText,
  contactNumber: contactNumberSchema.optional().nullable(),
  address: z.string().trim().max(255, "Must be 255 characters or fewer").optional().nullable(),
  sssNumber: sssNumberSchema.optional().nullable(),
  philHealthNumber: philHealthNumberSchema.optional().nullable(),
  pagIbigNumber: pagIbigNumberSchema.optional().nullable(),
  tinNumber: tinNumberSchema.optional().nullable(),
  leaveBalances: z.array(leaveBalanceSchema).default([]),
});

/**
 * End of contract only applies to contractual/probationary staff, and last
 * day only applies to AWOL/terminated/resigned staff (regular employees get
 * neither). Only enforced when employmentStatus is present in the payload,
 * so partial patches that don't touch status/dates are left alone.
 */
function withEmploymentDateRules<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const { employmentStatus, endOfContract, lastDay } = data as {
      employmentStatus?: string;
      endOfContract?: string;
      lastDay?: string;
    };
    if (!employmentStatus) return;

    const requiresEndOfContract = needsEndOfContract(employmentStatus);
    const requiresLastDay = needsLastDay(employmentStatus);

    if (requiresEndOfContract && !endOfContract) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endOfContract"],
        message: "End of contract is required for this employment status.",
      });
    }
    if (!requiresEndOfContract && endOfContract) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endOfContract"],
        message: "End of contract only applies to contractual or probationary employees.",
      });
    }
    if (requiresLastDay && !lastDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastDay"],
        message: "Last day is required for this employment status.",
      });
    }
    if (!requiresLastDay && lastDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lastDay"],
        message: "Last day only applies to AWOL, terminated, or resigned employees.",
      });
    }
  });
}

export const employeeSchema = withEmploymentDateRules(employeeObjectSchema);
export const createEmployeeSchema = employeeSchema;
export const updateEmployeeSchema = withEmploymentDateRules(
  employeeObjectSchema.partial().extend({
    archived: z.boolean().optional(),
  }),
);
export const updateLeaveBalancesSchema = z.array(leaveBalanceSchema);
export const employeeListQuerySchema = paginationQuerySchema(20)
  .extend(sortQuerySchema(employeeSortFields).shape)
  .extend({
    query: z.string().trim().optional(),
    status: z
      .string()
      .trim()
      .optional()
      .transform((value) =>
        value ? value.split(",").map((entry) => entry.trim()).filter(Boolean) : undefined,
      ),
    includeArchived: z
      .union([z.literal("true"), z.literal("false")])
      .optional()
      .transform((value) => value === "true"),
  });
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type EmployeeUpdateInput = z.infer<typeof updateEmployeeSchema>;
