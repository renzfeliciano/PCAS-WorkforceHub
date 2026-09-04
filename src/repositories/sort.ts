import type { SortDir } from "@/types/list-query";

/**
 * Maps a client-facing sort key to its Mongo field and validates it against
 * an allow-list, so `sortBy` can never be used to sort (or leak the
 * existence of) an arbitrary document field.
 */
export function resolveSort<TField extends string>(
  sortBy: string | undefined,
  sortDir: SortDir | undefined,
  fieldMap: Record<TField, string>,
  fallback: Record<string, 1 | -1>,
): Record<string, 1 | -1> {
  if (!sortBy || !(sortBy in fieldMap)) return fallback;
  const field = fieldMap[sortBy as TField];
  return { [field]: sortDir === "desc" ? -1 : 1 };
}
