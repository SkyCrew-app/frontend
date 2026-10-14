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

const maintenanceMinutes = (openingTime: string | null | undefined, hours: number) => {
  const from = minutesOf(openingTime) ?? 0
  return { from, to: Math.min(from + Math.round(hours * 60), 24 * 60) }
}

const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`

/**
 * When the weekly maintenance starts and ends, as "HH:MM", for the settings being edited: it starts
 * when bookings open. `start` is null while no opening time is set, `end` while the length is not valid.
 */
export function maintenanceHours(
  openingTime: string | null | undefined,
  duration: number | null | undefined,
): { start: string | null; end: string | null } {
  if (minutesOf(openingTime) === null) return { start: null, end: null }
  const hours = Number(duration)
  const { from, to } = maintenanceMinutes(openingTime, Number.isFinite(hours) && hours > 0 ? hours : 0)
  return { start: clock(from), end: Number.isFinite(hours) && hours > 0 ? clock(to) : null }
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
  const { from, to } = maintenanceMinutes(settings.reservationStartTime, hours)
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
