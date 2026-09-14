/** Escapes regex metacharacters so user-supplied search text can't be used to inject a pattern into a MongoDB $regex query. */
export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
