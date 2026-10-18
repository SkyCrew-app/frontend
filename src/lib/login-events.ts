import i18n from "@/lib/i18n"
import type { BadgeProps } from "@/components/ui/badge"

// The outcomes the API writes to the connection log (LoginOutcome in the backend's
// common/login-events/login-events.ts). Each one has its wording in French and English: a test
// checks it.
export const LOGIN_OUTCOMES = [
  "SUCCESS",
  "WRONG_PASSWORD",
  "UNKNOWN_ACCOUNT",
  "LOCKED_OR_THROTTLED",
  "SECOND_FACTOR_REQUIRED",
  "SECOND_FACTOR_FAILED",
  "ACCOUNT_DEACTIVATED",
  "LOGOUT",
] as const

export type LoginOutcome = (typeof LOGIN_OUTCOMES)[number]

export const LOGIN_DEVICE_TYPES = ["DESKTOP", "MOBILE", "TABLET", "BOT", "UNKNOWN"] as const
export const LOGIN_METHODS = ["PASSWORD", "TWO_FACTOR_CODE"] as const

// One line of the log, as the API returns it.
export interface LoginEvent {
  id: number
  created_at: string
  user_id?: number | null
  member_name?: string | null
  attempted_email?: string | null
  outcome: LoginOutcome | string
  method?: string | null
  ip_address?: string | null
  browser?: string | null
  os?: string | null
  device_type?: string | null
}

const BADGES: Record<LoginOutcome, NonNullable<BadgeProps["variant"]>> = {
  SUCCESS: "success",
  SECOND_FACTOR_REQUIRED: "info",
  LOGOUT: "neutral",
  WRONG_PASSWORD: "warning",
  SECOND_FACTOR_FAILED: "warning",
  UNKNOWN_ACCOUNT: "warning",
  LOCKED_OR_THROTTLED: "danger",
  ACCOUNT_DEACTIVATED: "danger",
}

/** "WRONG_PASSWORD" → "Mot de passe erroné"; an outcome this version does not know keeps its code. */
export const loginOutcomeLabel = (outcome: string) =>
  i18n.t(`administration:loginLog.outcomes.${outcome}`, { defaultValue: outcome })

export const loginOutcomeBadge = (outcome: string): NonNullable<BadgeProps["variant"]> =>
  BADGES[outcome as LoginOutcome] ?? "neutral"

/** "Firefox 131 · Windows · Ordinateur", or "Appareil inconnu" when the browser said nothing. */
export const loginDeviceLabel = (event: Pick<LoginEvent, "browser" | "os" | "device_type">) => {
  const type =
    event.device_type && event.device_type !== "UNKNOWN"
      ? i18n.t(`administration:loginLog.devices.${event.device_type}`, { defaultValue: event.device_type })
      : null
  const parts = [event.browser, event.os, type].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : i18n.t("administration:loginLog.devices.UNKNOWN")
}

export const loginMethodLabel = (method: string | null | undefined) =>
  method ? i18n.t(`administration:loginLog.methods.${method}`, { defaultValue: method }) : null

/** Whose account was tried: the member, or the address typed when it matches nobody. */
export const loginAccountLabel = (event: Pick<LoginEvent, "user_id" | "member_name" | "attempted_email">) => {
  if (event.member_name) return event.member_name
  if (event.user_id != null) return i18n.t("administration:loginLog.formerMember")
  return event.attempted_email
    ? i18n.t("administration:loginLog.unknownAddress", { email: event.attempted_email })
    : i18n.t("administration:loginLog.unknownAccount")
}

/** Periods offered as a filter, as the moment they start from (null: the whole log). */
export const LOGIN_PERIODS = ["all", "day", "week", "month"] as const
export type LoginPeriod = (typeof LOGIN_PERIODS)[number]

const PERIOD_HOURS: Record<Exclude<LoginPeriod, "all">, number> = { day: 24, week: 24 * 7, month: 24 * 30 }

export const periodStart = (period: LoginPeriod, now: number = Date.now()): string | null =>
  period === "all" ? null : new Date(now - PERIOD_HOURS[period] * 3600 * 1000).toISOString()
