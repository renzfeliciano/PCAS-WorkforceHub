/**
 * Employment status names as seeded/configured in Settings (case-sensitive,
 * matched the same way the dashboard groups statuses). Shared between the
 * employee schema (server-side rules) and the form dialog (conditional UI)
 * so both agree on which statuses need an end-of-contract date vs. a last day.
 */
export const END_OF_CONTRACT_STATUSES = ["Contractual", "Probationary"];
export const LAST_DAY_STATUSES = ["AWOL", "Terminated", "Resigned"];

export const needsEndOfContract = (status: string | undefined) =>
  Boolean(status && END_OF_CONTRACT_STATUSES.includes(status));

export const needsLastDay = (status: string | undefined) =>
  Boolean(status && LAST_DAY_STATUSES.includes(status));
