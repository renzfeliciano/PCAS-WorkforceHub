function formatGroupedDigits(rawValue: string, groupSizes: number[]): string {
  const maxDigits = groupSizes.reduce((sum, size) => sum + size, 0);
  const digits = rawValue.replace(/\D/g, "").slice(0, maxDigits);
  const groups: string[] = [];
  let cursor = 0;
  for (const size of groupSizes) {
    if (cursor >= digits.length) break;
    groups.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }
  return groups.join("-");
}

/** SSS: XX-XXXXXXX-X (10 digits) */
export const formatSssNumber = (value: string) => formatGroupedDigits(value, [2, 7, 1]);
/** PhilHealth: XX-XXXXXXXXX-X (12 digits) */
export const formatPhilHealthNumber = (value: string) => formatGroupedDigits(value, [2, 9, 1]);
/** Pag-IBIG: XXXX-XXXX-XXXX (12 digits) */
export const formatPagIbigNumber = (value: string) => formatGroupedDigits(value, [4, 4, 4]);
/** TIN: XXX-XXX-XXX or XXX-XXX-XXX-XXX (9 or 12 digits) */
export const formatTinNumber = (value: string) => formatGroupedDigits(value, [3, 3, 3, 3]);
/** PH mobile number: XXXX-XXX-XXXX (11 digits) */
export const formatContactNumber = (value: string) => formatGroupedDigits(value, [4, 3, 4]);
