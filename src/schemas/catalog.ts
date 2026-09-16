import { z } from "zod";

export const catalogKindSchema = z.enum(["position", "project", "status"]);
export const catalogItemSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: catalogKindSchema,
  category: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(160).optional(),
  active: z.boolean().default(true),
  // Only meaningful for kind "position" — the UI only ever shows this
  // toggle there, but it's harmless (just unused) if set on another kind.
  // Optional (not .default()) so every other caller/fixture is unaffected;
  // an omitted key falls through to the model's own schema default.
  grantsAttendanceSelfService: z.boolean().optional(),
  // Only meaningful for kind "status" + category "employment" — same
  // optional/unused-elsewhere convention as grantsAttendanceSelfService above.
  countsAsActiveEmployment: z.boolean().optional(),
});
export const createCatalogSchema = catalogItemSchema
  .omit({ active: true })
  .refine((value) => value.kind !== "status" || Boolean(value.category), {
    message: "Category is required for status entries",
    path: ["category"],
  });
export const updateCatalogSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  category: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(160).optional(),
  active: z.boolean().optional(),
  grantsAttendanceSelfService: z.boolean().optional(),
  countsAsActiveEmployment: z.boolean().optional(),
});
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;
export type CreateCatalogInput = z.infer<typeof createCatalogSchema>;
export type UpdateCatalogInput = z.infer<typeof updateCatalogSchema>;
