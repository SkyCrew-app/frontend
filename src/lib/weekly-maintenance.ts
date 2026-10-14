import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { toWeekday } from "@/lib/settings"
import type { TimeRange } from "@/lib/free-ranges"

export interface MaintenanceSettings {
  maintenanceDay?: string | null
  maintenanceDuration?: number | null
  reservationStartTime?: string | null
}

const plain = (day: string) =>
  day
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()

const minutesOf = (time: string | null | undefined): number | null => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? "")
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/**
 * The club's weekly maintenance on a given day, or null on other days. As the API reads it
 * (booking-rules.ts, weeklyMaintenanceWindow): the settings give a day and a length in hours,
 * and the maintenance starts when bookings open that day (midnight when no opening is set).
 */
export function maintenanceOn(settings: MaintenanceSettings | null | undefined, date: Date): TimeRange | null {
  const hours = Number(settings?.maintenanceDuration)
  if (!settings?.maintenanceDay || !Number.isFinite(hours) || hours <= 0) return null
  if (plain(toWeekday(settings.maintenanceDay)) !== plain(format(date, "EEEE", { locale: fr }))) return null
  const from = minutesOf(settings.reservationStartTime) ?? 0
  const to = Math.min(from + Math.round(hours * 60), 24 * 60)
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return {
    start: new Date(midnight.getTime() + from * 60_000),
    end: new Date(midnight.getTime() + to * 60_000),
  }
}

/** The maintenance a slot runs into (the API refuses it), or null. */
export function maintenanceClash(
  settings: MaintenanceSettings | null | undefined,
  start: Date,
  end: Date,
): TimeRange | null {
  const window = maintenanceOn(settings, start)
  return window && start < window.end && window.start < end ? window : null
}
