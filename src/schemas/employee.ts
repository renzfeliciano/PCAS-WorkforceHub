import { z } from "zod";
import { paginationQuerySchema, sortQuerySchema } from "@/schemas/list-query";
import { contactNumberSchema } from "@/schemas/shared";
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
export const leaveBalanceSchema = z.object({
  leaveTypeId: z.string().trim().min(1),
  // Was restricted to half-day increments; clients need finer-grained
  // credits (e.g. 1.73). Standard shape is now "at most 3 whole-number
  // digits, at most 2 decimal places" (0-999.99), matching the input mask
  // in lib/leave-balance-input.ts, rather than a fixed step.
  balance: z
    .number()
    .min(0)
    .max(999.99, "Balances can have at most three whole-number digits")
    .multipleOf(0.01, "Balances can have at most two decimal places"),
});

const employeeObjectSchema = z.object({
  employeeNumber: z.string().trim().max(20).optional().nullable(),
  name: requiredText.max(30, "Must be 30 characters or fewer"),
  gender: genderSchema,
  positionId: requiredText,
  projectSiteId: requiredText,
  dateHired: isoDate,
  birthDate: isoDate.optional().nullable(),
  endOfContract: isoDate.optional().nullable(),
  lastDay: isoDate.optional().nullable(),
  employmentStatusId: requiredText,
  // Not persisted (the Employee model only stores employmentStatusId) —
  // carried in the payload solely so withEmploymentDateRules below can
  // still apply its required-date rule synchronously, without a DB lookup
  // to resolve the id to a name. The client already has this name (it's
  // rendering the option label), so it costs nothing to include.
  employmentStatusName: requiredText,
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
 * neither). Only enforced when employmentStatusName is present in the
 * payload, so partial patches that don't touch status/dates are left alone.
 */
function withEmploymentDateRules<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const { employmentStatusName, endOfContract, lastDay } = data as {
      employmentStatusName?: string;
      endOfContract?: string;
      lastDay?: string;
    };
    if (!employmentStatusName) return;

    const requiresEndOfContract = needsEndOfContract(employmentStatusName);
    const requiresLastDay = needsLastDay(employmentStatusName);

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
    projectId: z.string().trim().min(1).optional(),
    includeArchived: z
      .union([z.literal("true"), z.literal("false")])
      .optional()
      .transform((value) => value === "true"),
  });
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type EmployeeUpdateInput = z.infer<typeof updateEmployeeSchema>;
