import { z } from "zod";

const requiredText = z.string().trim().min(1);
export const leaveCreditsSchema = z.object({
  sickLeave: z.number().int().min(0),
  vacationLeave: z.number().int().min(0),
});
export const employeeSchema = z.object({
  employeeNumber: requiredText,
  name: requiredText,
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
  leaveCredits: leaveCreditsSchema,
});
export const createEmployeeSchema = employeeSchema;
export const updateLeaveCreditsSchema = leaveCreditsSchema;
export type EmployeeInput = z.infer<typeof employeeSchema>;
