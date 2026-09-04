import { z } from "zod";

const requiredText = z.string().trim().min(1);
export const genderSchema = z.enum(["Male", "Female"]);
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
  contactNumber: requiredText,
  address: requiredText,
  sssNumber: requiredText,
  philHealthNumber: requiredText,
  pagIbigNumber: requiredText,
  tinNumber: requiredText,
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
  status: z.string().trim().optional(),
  includeArchived: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === "true"),
});
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type EmployeeUpdateInput = z.infer<typeof updateEmployeeSchema>;
