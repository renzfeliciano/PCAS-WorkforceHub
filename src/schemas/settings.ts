import { z } from "zod";

export const settingKindSchema = z.enum(["position", "project", "status"]);
export const settingItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: settingKindSchema,
  description: z.string().trim().max(160).optional(),
  active: z.boolean().default(true),
});
export type SettingItemInput = z.infer<typeof settingItemSchema>;
