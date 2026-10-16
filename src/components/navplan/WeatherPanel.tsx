"use client"

import { useTranslation } from "react-i18next"
import { formatDateTime } from "@/lib/format"
import type { WeatherReport } from "@/lib/navplan/types"
import { formatUtcDateTime } from "./FlightConditions"

interface WeatherPanelProps {
  reports: WeatherReport[]
  /** ICAO → role, to say which report is the departure, destination or alternate. */
  roles: Record<string, "departure" | "destination" | "alternate">
  windSource: string
}

const ageMinutes = (iso: string | null | undefined, now: Date) => {
  if (!iso) return null
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : Math.max(0, Math.round((now.getTime() - time) / 60000))
}

// A METAR older than this is shown as old (routine METARs are every 30 or 60 minutes).
const OLD_METAR_MIN = 90

/** Raw METAR/TAF of the aerodromes of the plan, with their age and the source of the winds aloft. */
export function WeatherPanel({ reports, roles, windSource }: WeatherPanelProps) {
  const { t } = useTranslation("navplan")
  const now = new Date()

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("weather.none")}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const age = ageMinutes(report.observedAt, now)
            const role = roles[report.icao]
            return (
              <li key={report.icao} className="space-y-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {report.icao}
                    {role && <span className="ml-2 text-sm font-normal text-muted-foreground">{t(`weather.role.${role}`)}</span>}
                  </p>
                  {report.observedAt && (
                    <p className={age !== null && age > OLD_METAR_MIN ? "text-xs font-medium text-warning" : "text-xs text-muted-foreground"}>
                      {t("weather.observed", { date: formatDateTime(report.observedAt), minutes: age ?? 0 })}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">METAR</p>
                  <p className="break-words rounded-md bg-muted p-2 font-mono text-xs leading-relaxed">{report.metar || t("weather.unavailable")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    TAF
                    {report.tafValidFrom && report.tafValidTo && (
                      <span className="font-normal">
                        {" · "}
                        {t("weather.tafValidity", { from: formatUtcDateTime(report.tafValidFrom), to: formatUtcDateTime(report.tafValidTo) })}
                      </span>
                    )}
                  </p>
                  <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-2 font-mono text-xs leading-relaxed">
                    {report.taf || t("weather.unavailable")}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{t("weather.windSource", { source: windSource || "—" })}</p>
        <p>{t("weather.automatic")}</p>
        <p>{t("weather.metarSource")}</p>
      </div>
    </div>
  )
}
