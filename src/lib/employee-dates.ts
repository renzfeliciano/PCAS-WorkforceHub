function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** Full years between an ISO date and now (or `asOf`), the usual "count your birthdays" rule. */
export function calculateAge(birthDate: string, asOf: Date = new Date()): number {
  const { year, month, day } = parseIsoDate(birthDate);
  let age = asOf.getFullYear() - year;
  const hasHadBirthdayThisYear =
    asOf.getMonth() + 1 > month || (asOf.getMonth() + 1 === month && asOf.getDate() >= day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** "3 yrs 2 mos" style summary of tenure since `dateHired`. */
export function formatLengthOfService(dateHired: string, asOf: Date = new Date()): string {
  const { year, month, day } = parseIsoDate(dateHired);
  let years = asOf.getFullYear() - year;
  let months = asOf.getMonth() + 1 - month;
  if (asOf.getDate() < day) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "Less than a month";
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} mo${months === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/** Whether `birthDate`'s month/day falls within [today, today + windowDays]. */
export function isBirthdayWithinDays(birthDate: string, windowDays: number, today: Date = new Date()): boolean {
  const { month, day } = parseIsoDate(birthDate);
  const currentYear = today.getFullYear();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let candidate = new Date(currentYear, month - 1, day);
  if (candidate < startOfToday) candidate = new Date(currentYear + 1, month - 1, day);
  const diffDays = Math.round((candidate.getTime() - startOfToday.getTime()) / 86_400_000);
  return diffDays >= 0 && diffDays <= windowDays;
}

/** Whether `birthDate`'s month falls in the same calendar month as `today`. */
export function isBirthdayThisMonth(birthDate: string, today: Date = new Date()): boolean {
  const { month } = parseIsoDate(birthDate);
  return month === today.getMonth() + 1;
}

/** Whether the employee turns exactly `age` at some point in `today`'s calendar month. */
export function turnsAgeThisMonth(birthDate: string, age: number, today: Date = new Date()): boolean {
  const { year, month } = parseIsoDate(birthDate);
  return today.getMonth() + 1 === month && today.getFullYear() - year === age;
}
