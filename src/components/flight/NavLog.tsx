"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, Navigation } from "lucide-react"

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
  if (!alt || alt <= 0) return "-"
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

function getPhaseColor(type: string): string {
  switch (type?.toUpperCase()) {
    case "TOC": return "text-green-500"
    case "TOD": return "text-amber-500"
    case "SID": return "text-purple-400"
    case "STAR": return "text-purple-400"
    case "APP": return "text-orange-400"
    case "VOR": return "text-sky-400"
    case "NDB": return "text-red-400"
    case "FIX": return "text-emerald-400"
    default: return "text-muted-foreground"
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
      eta: wp2.time_from_dep_min !== undefined ? formatTime(wp2.time_from_dep_min) : "-",
      fuelRem: wp2.fuel_remaining_liters ?? null,
      cumDist,
    })
  }

  const totalDistNm = cumDist

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            <span>Navigation Log</span>
            <Badge variant="outline" className="font-mono text-xs">
              {departureIcao} → {arrivalIcao}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {aircraft && (
              <Badge variant="secondary" className="font-mono text-xs">
                {aircraft.registration_number} ({aircraft.model})
              </Badge>
            )}
            {pilotName && (
              <Badge variant="secondary" className="text-xs">
                PIC: {pilotName}
              </Badge>
            )}
            {flightType && (
              <Badge variant="outline" className="text-xs">
                {flightType}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        {/* Aircraft info bar */}
        {aircraft && (
          <div className="px-6 py-3 bg-muted/50 border-b border-border/50 flex flex-wrap gap-x-6 gap-y-1 text-xs font-mono text-muted-foreground">
            <span>A/C: <strong className="text-foreground">{aircraft.registration_number}</strong></span>
            <span>Type: <strong className="text-foreground">{aircraft.model}</strong></span>
            {aircraft.cruiseSpeed && <span>Vcrz: <strong className="text-foreground">{aircraft.cruiseSpeed} km/h</strong></span>}
            {aircraft.consumption && <span>Conso: <strong className="text-foreground">{aircraft.consumption} L/h</strong></span>}
            {aircraft.maxAltitude && <span>Plafond: <strong className="text-foreground">{aircraft.maxAltitude} ft</strong></span>}
          </div>
        )}

        {/* Nav log table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-muted/80 border-b border-border">
                <th className="px-3 py-2 text-left font-semibold">FROM</th>
                <th className="px-3 py-2 text-left font-semibold">TO</th>
                <th className="px-3 py-2 text-center font-semibold">TYPE</th>
                <th className="px-3 py-2 text-right font-semibold">TRK°</th>
                <th className="px-3 py-2 text-right font-semibold">WCA</th>
                <th className="px-3 py-2 text-right font-semibold">HDG°</th>
                <th className="px-3 py-2 text-right font-semibold">DIST</th>
                <th className="px-3 py-2 text-right font-semibold">CUM</th>
                <th className="px-3 py-2 text-right font-semibold">ALT</th>
                <th className="px-3 py-2 text-right font-semibold">GS</th>
                <th className="px-3 py-2 text-right font-semibold">ETE</th>
                <th className="px-3 py-2 text-right font-semibold">ETA</th>
                <th className="px-3 py-2 text-right font-semibold">REM</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => {
                const hdg = ((leg.track + leg.wca) + 360) % 360
                const isClimb = leg.toType === "TOC" || leg.toType === "SID"
                const isDescent = leg.toType === "TOD" || leg.toType === "STAR" || leg.toType === "APP"
                const rowBg = isClimb
                  ? "bg-green-500/5"
                  : isDescent
                    ? "bg-amber-500/5"
                    : i % 2 === 0
                      ? "bg-transparent"
                      : "bg-muted/30"

                return (
                  <tr key={i} className={`${rowBg} border-b border-border/30 hover:bg-muted/50 transition-colors`}>
                    <td className="px-3 py-2 font-semibold">{leg.from}</td>
                    <td className="px-3 py-2 font-semibold">{leg.to}</td>
                    <td className={`px-3 py-2 text-center ${getPhaseColor(leg.toType)}`}>
                      {getPhaseLabel(leg.toType)}
                    </td>
                    <td className="px-3 py-2 text-right text-purple-400">
                      {Math.round(leg.track).toString().padStart(3, "0")}°
                    </td>
                    <td className="px-3 py-2 text-right text-yellow-400">
                      {leg.wca !== 0 ? `${leg.wca > 0 ? "+" : ""}${leg.wca.toFixed(1)}°` : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-purple-300">
                      {Math.round(hdg).toString().padStart(3, "0")}°
                    </td>
                    <td className="px-3 py-2 text-right">{leg.distNm.toFixed(1)} NM</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{leg.cumDist.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={isClimb ? "text-green-400" : isDescent ? "text-amber-400" : ""}>
                        {formatAlt(leg.alt)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-sky-400">{leg.gs}kt</td>
                    <td className="px-3 py-2 text-right">{leg.ete}</td>
                    <td className="px-3 py-2 text-right font-semibold">{leg.eta}</td>
                    <td className="px-3 py-2 text-right">
                      {leg.fuelRem !== null ? (
                        <span className={leg.fuelRem < 10 ? "text-red-400 font-bold" : "text-emerald-400"}>
                          {leg.fuelRem.toFixed(1)}L
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/60 border-t-2 border-border font-semibold">
                <td className="px-3 py-2" colSpan={6}>TOTAUX</td>
                <td className="px-3 py-2 text-right">{totalDistNm.toFixed(1)} NM</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {totalDistanceKm ? `${totalDistanceKm.toFixed(0)} km` : ""}
                </td>
                <td className="px-3 py-2" colSpan={2}></td>
                <td className="px-3 py-2 text-right" colSpan={2}>
                  {totalTimeHours ? formatTime(totalTimeHours * 60) : "-"}
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
