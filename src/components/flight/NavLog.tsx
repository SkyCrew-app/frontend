"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { flightTypeLabel } from "@/components/flight/flight-type"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WaypointData {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name?: string | null
  ground_speed_kts?: number
  wind_correction_deg?: number
  fuel_remaining_liters?: number
  time_from_dep_min?: number
  leg_distance_nm?: number
}

interface AircraftInfo {
  registration_number: string
  model: string
  cruiseSpeed?: number
  consumption?: number
  maxAltitude?: number
}

interface NavLogProps {
  waypoints: WaypointData[]
  aircraft?: AircraftInfo | null
  pilotName?: string
  flightType?: string
  totalDistanceKm?: number
  totalTimeHours?: number
  departureIcao: string
  arrivalIcao: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toRad = (d: number) => (d * Math.PI) / 180
const toDeg = (r: number) => (r * 180) / Math.PI

function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = toRad(lon2 - lon1)
  const y = Math.sin(dLon) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatAlt(alt: number): string {
  if (!alt || alt <= 0) return "—"
  if (alt >= 5000) return `FL${Math.round(alt / 100).toString().padStart(3, "0")}`
  return `${alt}`
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}:${m.toString().padStart(2, "0")}`
}

function getPhaseLabel(type: string): string {
  switch (type?.toUpperCase()) {
    case "APT": return ""
    case "SID": return "SID"
    case "TOC": return "T/C"
    case "TOD": return "T/D"
    case "STAR": return "STAR"
    case "APP": return "APP"
    case "VOR": return "VOR"
    case "NDB": return "NDB"
    case "FIX": return "FIX"
    default: return type || ""
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function NavLog({
  waypoints,
  aircraft,
  pilotName,
  flightType,
  totalDistanceKm,
  totalTimeHours,
  departureIcao,
  arrivalIcao,
}: NavLogProps) {
  const { t } = useTranslation("flights")

  if (!waypoints || waypoints.length < 2) return null

  // Compute per-leg data
  const legs: {
    from: string
    to: string
    toType: string
    track: number
    distNm: number
    alt: number
    gs: number
    wca: number
    ete: string
    eta: string
    fuelRem: number | null
    cumDist: number
  }[] = []

  let cumDist = 0

  for (let i = 0; i < waypoints.length - 1; i++) {
    const wp1 = waypoints[i]
    const wp2 = waypoints[i + 1]

    const distNm = wp2.leg_distance_nm ?? haversineNm(wp1.lat, wp1.lon, wp2.lat, wp2.lon)
    const track = computeBearing(wp1.lat, wp1.lon, wp2.lat, wp2.lon)
    const gs = wp2.ground_speed_kts ?? 100
    const wca = wp2.wind_correction_deg ?? 0
    const eteMin = gs > 0 ? (distNm / gs) * 60 : 0

    cumDist += distNm

    legs.push({
      from: wp1.ident,
      to: wp2.ident,
      toType: wp2.type,
      track,
      distNm,
      alt: wp2.alt,
      gs: Math.round(gs),
      wca,
      ete: formatTime(eteMin),
      eta: wp2.time_from_dep_min !== undefined ? formatTime(wp2.time_from_dep_min) : "—",
      fuelRem: wp2.fuel_remaining_liters ?? null,
      cumDist,
    })
  }

  const totalDistNm = cumDist

  const subtitle = [
    `${departureIcao} → ${arrivalIcao}`,
    aircraft ? `${aircraft.registration_number} (${aircraft.model})` : null,
    pilotName ? t("navLog.pilotInCommand", { name: pilotName }) : null,
    flightType ? flightTypeLabel(flightType) : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("navLog.title")}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* Aircraft performance used for the computation */}
        {aircraft && (aircraft.cruiseSpeed || aircraft.consumption || aircraft.maxAltitude) && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-y bg-muted/50 px-6 py-2 text-xs text-muted-foreground">
            {aircraft.cruiseSpeed && (
              <span>
                {t("navLog.performance.cruiseSpeed")} <strong className="text-foreground">{aircraft.cruiseSpeed} km/h</strong>
              </span>
            )}
            {aircraft.consumption && (
              <span>
                {t("navLog.performance.consumption")} <strong className="text-foreground">{aircraft.consumption} L/h</strong>
              </span>
            )}
            {aircraft.maxAltitude && (
              <span>
                {t("navLog.performance.ceiling")} <strong className="text-foreground">{aircraft.maxAltitude} ft</strong>
              </span>
            )}
          </div>
        )}

        {/* Nav log table */}
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">{t("navLog.columns.from")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("navLog.columns.to")}</th>
                <th className="px-3 py-2 text-center font-medium">{t("common:labels.type")}</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.trackHint")}>TRK</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.wcaHint")}>WCA</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.headingHint")}>HDG</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.distanceHint")}>{t("navLog.columns.distance")}</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.cumulativeDistanceHint")}>{t("navLog.columns.cumulativeDistance")}</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.altitudeHint")}>{t("navLog.columns.altitude")}</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.groundSpeedHint")}>GS</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.eteHint")}>ETE</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.elapsedHint")}>{t("navLog.columns.elapsed")}</th>
                <th className="px-3 py-2 text-right font-medium" title={t("navLog.columns.fuelHint")}>{t("navLog.columns.fuel")}</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => {
                const hdg = ((leg.track + leg.wca) + 360) % 360
                const isClimb = leg.toType === "TOC" || leg.toType === "SID"
                const isDescent = leg.toType === "TOD" || leg.toType === "STAR" || leg.toType === "APP"
                const rowBg = isClimb
                  ? "bg-success/5"
                  : isDescent
                    ? "bg-warning/5"
                    : i % 2 === 0
                      ? "bg-transparent"
                      : "bg-muted/30"

                return (
                  <tr key={i} className={`${rowBg} border-b border-border/50`}>
                    <td className="px-3 py-2 font-semibold">{leg.from}</td>
                    <td className="px-3 py-2 font-semibold">{leg.to}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground">
                      {getPhaseLabel(leg.toType)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {Math.round(leg.track).toString().padStart(3, "0")}°
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {leg.wca !== 0 ? `${leg.wca > 0 ? "+" : ""}${leg.wca.toFixed(1)}°` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-primary">
                      {Math.round(hdg).toString().padStart(3, "0")}°
                    </td>
                    <td className="px-3 py-2 text-right">{leg.distNm.toFixed(1)} NM</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{leg.cumDist.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={isClimb ? "text-success" : isDescent ? "text-warning" : ""}>
                        {formatAlt(leg.alt)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{leg.gs} kt</td>
                    <td className="px-3 py-2 text-right">{leg.ete}</td>
                    <td className="px-3 py-2 text-right font-semibold">{leg.eta}</td>
                    <td className="px-3 py-2 text-right">
                      {leg.fuelRem !== null ? (
                        <span className={leg.fuelRem < 10 ? "font-bold text-destructive" : undefined}>
                          {leg.fuelRem.toFixed(1)} L
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-muted/40 font-semibold">
                <td className="px-3 py-2" colSpan={6}>{t("common:labels.total")}</td>
                <td className="px-3 py-2 text-right">{totalDistNm.toFixed(1)} NM</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {totalDistanceKm ? `${totalDistanceKm.toFixed(0)} km` : ""}
                </td>
                <td className="px-3 py-2" colSpan={2}></td>
                <td className="px-3 py-2 text-right" colSpan={2}>
                  {totalTimeHours ? formatTime(totalTimeHours * 60) : "—"}
                </td>
                <td className="px-3 py-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
