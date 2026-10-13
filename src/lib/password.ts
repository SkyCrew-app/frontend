import i18n from "@/lib/i18n"

// Shortest password the API accepts.
export const PASSWORD_MIN_LENGTH = 8

// What is wrong with a new password typed twice, or null when it can be sent.
export function newPasswordError(password: string, confirmation: string): string | null {
  if (!password || !confirmation) return i18n.t("auth:password.fillAll")
  if (password.length < PASSWORD_MIN_LENGTH) {
    return i18n.t("auth:password.tooShort", { count: PASSWORD_MIN_LENGTH })
  }
  if (password !== confirmation) return i18n.t("auth:password.mismatch")
  return null
}
