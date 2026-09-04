import { z } from "zod";

export const settingKindSchema = z.enum(["position", "project", "status"]);
export const settingItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: settingKindSchema,
  category: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(160).optional(),
  active: z.boolean().default(true),
});
export const createSettingSchema = settingItemSchema
  .omit({ active: true })
  .refine((value) => value.kind !== "status" || Boolean(value.category), {
    message: "Category is required for status entries",
    path: ["category"],
  });
export const updateSettingSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(160).optional(),
  active: z.boolean().optional(),
});
export type SettingItemInput = z.infer<typeof settingItemSchema>;
export type CreateSettingInput = z.infer<typeof createSettingSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
