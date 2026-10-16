"use client"

import { useTranslation } from "react-i18next"
import { Moon, Sun } from "lucide-react"
import type { FlightPlanResult } from "@/lib/navplan/types"
import { formatUtcTime } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"

const ROLES = ["departure", "destination", "alternate"] as const

/** "16/10 17:30Z" — the date is written when it is not the reference day. */
export const formatUtcDateTime = (iso: string | null | undefined, reference?: string | null) => {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  const sameDay = reference && new Date(reference).toISOString().slice(0, 10) === date.toISOString().slice(0, 10)
  if (sameDay) return formatUtcTime(iso)
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")} ${formatUtcTime(iso)}`
}

/** Where the QNH of the plan comes from: the pilot, a METAR and its time, or none (standard). */
export function useQnhOrigin(result: Pick<FlightPlanResult, "qnhSource" | "qnhStation" | "qnhObservedAt">, departureTime?: string) {
  const { t } = useTranslation("navplan")
  if (result.qnhSource === "METAR")
    return t("conditions.qnhSource.METAR", { icao: result.qnhStation ?? "", time: formatUtcDateTime(result.qnhObservedAt, departureTime) })
  if (result.qnhSource === "DEFAULT") return t("conditions.qnhSource.DEFAULT")
  if (result.qnhSource === "INPUT") return t("conditions.qnhSource.INPUT")
  return null
}

/**
 * Day or night (SERA: night runs from the end of evening civil twilight to the beginning of
 * morning civil twilight), the twilight, sunrise and sunset times of each aerodrome of the plan,
 * and where the QNH comes from. Times in UTC, as on the nav log.
 */
export function FlightConditions({ result, departureTime }: { result: FlightPlanResult; departureTime?: string }) {
  const { t } = useTranslation("navplan")
  const daylight = result.daylight
  const qnh = useQnhOrigin(result, departureTime)
  if (!daylight && !qnh) return null
  const Icon = daylight?.night ? Moon : Sun

  return (
    <section className="space-y-2 rounded-lg border p-3 text-sm" aria-labelledby="flight-conditions-title">
      <h3 id="flight-conditions-title" className="font-medium">
        {t("conditions.title")}
      </h3>
      {daylight && (
        <p className={cn("flex items-start gap-2", daylight.night && "font-medium text-warning")}>
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {daylight.night ? t("conditions.night", { time: formatUtcDateTime(daylight.nightFrom, departureTime) }) : t("conditions.day")}
          </span>
        </p>
      )}
      {daylight && daylight.aerodromes.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-xs [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:py-1">
            <caption className="sr-only">{t("conditions.caption")}</caption>
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="text-left font-medium">
                  {t("conditions.columns.aerodrome")}
                </th>
                <th scope="col" className="text-right font-medium">
                  {t("conditions.columns.civilDawn")}
                </th>
                <th scope="col" className="text-right font-medium">
                  {t("conditions.columns.sunrise")}
                </th>
                <th scope="col" className="text-right font-medium">
                  {t("conditions.columns.sunset")}
                </th>
                <th scope="col" className="text-right font-medium">
                  {t("conditions.columns.civilDusk")}
                </th>
              </tr>
            </thead>
            <tbody>
              {daylight.aerodromes.map((aerodrome) => (
                <tr key={`${aerodrome.role}-${aerodrome.icao}`} className="border-b last:border-0">
                  <th scope="row" className="text-left font-medium">
                    {aerodrome.icao}{" "}
                    <span className="font-normal text-muted-foreground">
                      {ROLES.includes(aerodrome.role as (typeof ROLES)[number]) ? t(`weather.role.${aerodrome.role}`) : aerodrome.role} ·{" "}
                      {formatUtcDateTime(aerodrome.at)}
                    </span>
                  </th>
                  <td className="text-right tabular-nums">{formatUtcTime(aerodrome.civilDawn)}</td>
                  <td className="text-right tabular-nums">{formatUtcTime(aerodrome.sunrise)}</td>
                  <td className="text-right tabular-nums">{formatUtcTime(aerodrome.sunset)}</td>
                  <td className="text-right tabular-nums">{formatUtcTime(aerodrome.civilDusk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {qnh && <p className="text-muted-foreground">{t("conditions.qnh", { qnh: result.qnhHpa ? Math.round(result.qnhHpa) : "—", source: qnh })}</p>}
    </section>
  )
}
