import { z } from "zod";
import { paginationQuerySchema, sortQuerySchema } from "@/schemas/list-query";
import { emailSchema } from "@/schemas/shared";

export const roleSchema = z.enum(["Admin", "HR", "Manager", "Employee"]);

export const userSortFields = ["name", "username", "role", "active", "position", "projectSite"] as const;

export const userListQuerySchema = paginationQuerySchema(20)
  .extend(sortQuerySchema(userSortFields).shape)
  .extend({
    query: z.string().trim().optional(),
    role: roleSchema.optional(),
    status: z.enum(["active", "inactive"]).optional(),
  });

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(40),
  email: emailSchema.optional(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  role: roleSchema,
  // Set only by roster account provisioning — never accepted as free text
  // from the public create-user form.
  employeeId: z.string().trim().min(1).optional(),
});

export const updateUserSchema = z
  .object({
    username: z.string().trim().min(3).max(40).optional(),
    email: emailSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    role: roleSchema.optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
