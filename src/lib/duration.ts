const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
};

/**
 * Parses env-style duration strings like "1min", "20sec", "500ms" into
 * milliseconds. A bare number (no unit) is treated as minutes, matching the
 * historical SESSION_INACTIVITY_MINUTES convention. Falls back to
 * `fallbackMs` for missing/unparseable values.
 */
export function parseDurationMs(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]*)$/);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase() || "min";
  const multiplier = UNIT_MS[unit];
  if (!Number.isFinite(amount) || amount < 0 || !multiplier) return fallbackMs;
  return amount * multiplier;
}
