export type ParsedEmployeeName = {
  last: string;
  first: string;
  middleInitial?: string;
};

export class UnparseableNameError extends Error {
  constructor(name: string) {
    super(`Cannot parse employee name "${name}": expected "Last, First Middle" format`);
    this.name = "UnparseableNameError";
  }
}

function toLettersOnly(value: string): string {
  return value.replace(/[^a-zA-Z]/g, "").toLowerCase();
}

/** Roster names are stored as "Last, First Middle" (or "Last, First M."). */
export function parseEmployeeName(name: string): ParsedEmployeeName {
  const commaIndex = name.indexOf(",");
  if (commaIndex === -1) throw new UnparseableNameError(name);

  const last = toLettersOnly(name.slice(0, commaIndex));
  const givenTokens = name
    .slice(commaIndex + 1)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = givenTokens[0] ? toLettersOnly(givenTokens[0]) : "";
  if (!last || !first) throw new UnparseableNameError(name);

  const middleInitial = givenTokens[1] ? toLettersOnly(givenTokens[1]).charAt(0) : undefined;
  return { last, first, middleInitial: middleInitial || undefined };
}

/**
 * Tries last_first, then last_first_middleinitial, then numeric suffixes
 * (last_first2, last_first_m2, ...) until a username not already taken is found.
 */
export function generateUsername(
  parsed: ParsedEmployeeName,
  existingUsernames: ReadonlySet<string>,
): string {
  const base = `${parsed.last}_${parsed.first}`;
  if (!existingUsernames.has(base)) return base;

  const withMiddle = parsed.middleInitial ? `${base}_${parsed.middleInitial}` : base;
  if (withMiddle !== base && !existingUsernames.has(withMiddle)) return withMiddle;

  let suffix = 2;
  while (existingUsernames.has(`${withMiddle}${suffix}`)) suffix += 1;
  return `${withMiddle}${suffix}`;
}

export function generateUniqueUsername(
  name: string,
  existingUsernames: ReadonlySet<string>,
): string {
  return generateUsername(parseEmployeeName(name), existingUsernames);
}
