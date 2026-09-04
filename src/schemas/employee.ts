import { z } from "zod";

const requiredText = z.string().trim().min(1);
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
export const employeeSchema = z.object({
  name: requiredText,
  gender: genderSchema,
  position: requiredText,
  projectSite: requiredText,
  dateHired: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  endOfContract: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  employmentStatus: requiredText,
  contactNumber: contactNumberSchema,
  address: requiredText,
  sssNumber: sssNumberSchema,
  philHealthNumber: philHealthNumberSchema,
  pagIbigNumber: pagIbigNumberSchema,
  tinNumber: tinNumberSchema,
  leaveBalances: z.array(leaveBalanceSchema).default([]),
});
export const createEmployeeSchema = employeeSchema;
export const updateEmployeeSchema = employeeSchema.partial().extend({
  archived: z.boolean().optional(),
});
export const updateLeaveBalancesSchema = z.array(leaveBalanceSchema);
export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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
