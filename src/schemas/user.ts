import { z } from "zod";

export const roleSchema = z.enum(["Admin", "HR", "Manager", "Employee"]);

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(40),
  email: z.string().trim().email().optional(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(128),
  role: roleSchema,
});

export const updateUserSchema = z
  .object({
    username: z.string().trim().min(3).max(40).optional(),
    email: z.string().trim().email().optional(),
    name: z.string().trim().min(1).max(120).optional(),
    role: roleSchema.optional(),
    active: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
