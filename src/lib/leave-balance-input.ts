/** Rounds to 2 decimal places to avoid floating-point drift (e.g. 1.2999999999999998). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Caps free typing to the standard leave-balance shape — at most 3
 * whole-number digits, at most 2 decimal places (0-999.99) — e.g. "1.734" is
 * truncated to "1.73" and "1234" to "123" as they're typed, rather than
 * rejected outright. Preserves in-progress states like "1." or "" so a
 * controlled input can display exactly what's been typed so far.
 */
export function formatBalanceInput(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned.slice(0, 3);
  const wholePart = cleaned.slice(0, dot).slice(0, 3);
  const decimalPart = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${wholePart}.${decimalPart}`;
}
