import i18n from "@/lib/i18n"

// One wording and one colour per licence status, wherever a licence is shown.
type LicenseStatusVariant = "success" | "warning" | "danger"

interface LicenseLike {
  is_valid?: boolean | null
  status?: string | null
  expiration_date?: string | number | Date | null
}

// A licence expiring within this delay is flagged so the pilot can renew it in time.
const EXPIRES_SOON_DAYS = 90
const DAY_MS = 24 * 60 * 60 * 1000

const label = (key: string) => i18n.t(`profile:licenseStatus.${key}`)

export const licenseStatus = (
  license: LicenseLike,
  now: Date = new Date(),
): { label: string; variant: LicenseStatusVariant } => {
  const expiration = license.expiration_date ? new Date(license.expiration_date) : null
  const expiresAt = expiration && !Number.isNaN(expiration.getTime()) ? expiration.getTime() : null

  if (expiresAt !== null && expiresAt < now.getTime()) return { label: label("expired"), variant: "danger" }
  if ((license.status ?? "").toLowerCase() === "expired") return { label: label("expired"), variant: "danger" }
  if ((license.status ?? "").toLowerCase() === "pending") return { label: label("pending"), variant: "warning" }
  if (license.is_valid === false) return { label: label("invalid"), variant: "danger" }
  if (expiresAt !== null && expiresAt - now.getTime() <= EXPIRES_SOON_DAYS * DAY_MS) {
    return { label: label("expiresSoon"), variant: "warning" }
  }
  return { label: label("valid"), variant: "success" }
}
