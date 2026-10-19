"use client"

import { useTranslation } from "react-i18next"
import { formatDateTime } from "@/lib/format"
import type { FreezingLevel, Leg, PlanAerodrome, WeatherReport } from "@/lib/navplan/types"
import { pointLabel } from "@/lib/navplan/aerodrome"
import { formatFt } from "@/lib/navplan/units"
import { formatUtcDateTime } from "./FlightConditions"
import { RunwayWindLines } from "./AerodromeSheet"

interface WeatherPanelProps {
  reports: WeatherReport[]
  /** ICAO → role, to say which report is the departure, destination or alternate. */
  roles: Record<string, "departure" | "destination" | "alternate">
  windSource: string
  /** Side by side on a wide screen (the reports of the aerodromes around the route can be many). */
  columns?: boolean
  /** Runway wind and density altitude of the departure, destination and alternate. */
  aerodromes?: PlanAerodrome[]
  /** 0 °C isotherm from the winds aloft forecast. */
  freezingLevels?: FreezingLevel[]
  /** For the forecast temperature at each leg's altitude. */
  legs?: Leg[]
}

/** "Départ LFPN vers 7 500 ft · Mi-parcours au-dessus de 13 800 ft". */
function FreezingLevels({ levels }: { levels: FreezingLevel[] }) {
  const { t } = useTranslation("navplan")
  if (levels.length === 0) return null
  return (
    <section className="space-y-1 rounded-lg border p-3" aria-label={t("weather.freezingTitle")}>
      <h3 className="text-sm font-semibold">{t("weather.freezingTitle")}</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
        {levels.map((level) => (
          <li key={level.place}>
            <span className="text-muted-foreground">{t(`weather.freezingPlace.${level.place}`, { ident: level.ident ?? "" })} : </span>
            <span className="font-medium">
              {level.state === "LEVEL"
                ? t("weather.freezingLevel", { value: formatFt(level.altitudeFt) })
                : level.state === "SURFACE"
                  ? t("weather.freezingSurface")
                  : level.state === "ABOVE"
                    ? t("weather.freezingAbove", { value: formatFt(level.topFt) })
                    : t("weather.freezingUnknown")}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t("weather.freezingSource")}</p>
    </section>
  )
}

function LegTemperatures({ legs }: { legs: Leg[] }) {
  const { t } = useTranslation("navplan")
  const known = legs.filter((leg) => leg.wind.source !== "NONE" && typeof leg.wind.temperatureC === "number")
  if (known.length === 0) return null
  return (
    <section className="space-y-1 rounded-lg border p-3" aria-label={t("weather.legTemperatures")}>
      <h3 className="text-sm font-semibold">{t("weather.legTemperatures")}</h3>
      <ul className="space-y-0.5 text-sm tabular-nums">
        {known.map((leg) => (
          <li key={leg.index}>
            {t("weather.legTemperature", {
              leg: `${pointLabel(leg.from)} → ${pointLabel(leg.to)}`,
              altitude: formatFt(leg.altitudeFt),
              value: Math.round(leg.wind.temperatureC as number),
            })}
          </li>
        ))}
      </ul>
    </section>
  )
}

const ageMinutes = (iso: string | null | undefined, now: Date) => {
  if (!iso) return null
  const time = new Date(iso).getTime()
  return Number.isNaN(time) ? null : Math.max(0, Math.round((now.getTime() - time) / 60000))
}

// A METAR older than this is shown as old (routine METARs are every 30 or 60 minutes).
const OLD_METAR_MIN = 90

/** Raw METAR/TAF of the aerodromes of the plan, with their age and the source of the winds aloft. */
const ROLE_ORDER = { departure: 0, destination: 1, alternate: 2 } as const

export function WeatherPanel({ reports, roles, windSource, columns = false, aerodromes = [], freezingLevels = [], legs = [] }: WeatherPanelProps) {
  const { t } = useTranslation("navplan")
  const now = new Date()

  return (
    <div className="space-y-4">
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("weather.none")}</p>
      ) : (
        <ul className={columns ? "grid gap-3 lg:grid-cols-2 2xl:grid-cols-3" : "space-y-3"}>
          {/* The aerodromes of the plan first, then the others around the route. */}
          {[...reports]
            .sort((a, b) => (roles[a.icao] ? ROLE_ORDER[roles[a.icao]] : 3) - (roles[b.icao] ? ROLE_ORDER[roles[b.icao]] : 3))
            .map((report) => {
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
                {role && aerodromes.some((aerodrome) => aerodrome.icao === report.icao) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("aerodrome.conditions")}</p>
                    <RunwayWindLines conditions={aerodromes.find((aerodrome) => aerodrome.icao === report.icao)?.conditions} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className={columns ? "grid gap-3 lg:grid-cols-2" : "space-y-3"}>
        <FreezingLevels levels={freezingLevels} />
        <LegTemperatures legs={legs} />
      </div>
      <div className="space-y-1 text-xs text-muted-foreground">
        <p>{t("weather.windSource", { source: windSource || "—" })}</p>
        <p>{t("weather.automatic")}</p>
        <p>{t("weather.metarSource")}</p>
      </div>
    </div>
  )
}
