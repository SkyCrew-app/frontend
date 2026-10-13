// Same rule as the API: the international form ("+" and 8 to 15 digits) or
// the French national form (10 digits starting with 0).
const PHONE_NUMBER = /^(\+[1-9]\d{7,14}|0[1-9]\d{8})$/

/** "+33 6 12-34.56 78" → "+33612345678": the number as it is saved. */
export function normalisePhone(value: string | null | undefined): string {
  const compact = (value ?? "").replace(/[\s.\-()]/g, "")
  return compact.startsWith("00") ? `+${compact.slice(2)}` : compact
}

/** Spaces, dots and dashes are tolerated; an empty value is not a number. */
export const isValidPhone = (value: string | null | undefined): boolean => PHONE_NUMBER.test(normalisePhone(value))
