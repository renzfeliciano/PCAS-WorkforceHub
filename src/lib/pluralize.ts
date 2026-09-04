/** Standard for count labels across tables: singular when the count is exactly 1. */
export function pluralize(count: number, singular: string, plural: string = `${singular}s`) {
  return count === 1 ? singular : plural;
}
