import { z } from "zod";

export function paginationQuerySchema(defaultPageSize: number) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(defaultPageSize),
  });
}

export function sortQuerySchema<T extends readonly [string, ...string[]]>(allowedFields: T) {
  return z.object({
    sortBy: z.enum(allowedFields).optional(),
    sortDir: z.enum(["asc", "desc"]).optional(),
  });
}
