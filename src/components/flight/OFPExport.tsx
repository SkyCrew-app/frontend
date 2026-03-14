"use client"

import { useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WaypointData {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  ground_speed_kts?: number
  wind_correction_deg?: number
  fuel_remaining_liters?: number
  time_from_dep_min?: number
  leg_distance_nm?: number
}

interface FuelPolicy {
  taxi_liters: number
  trip_liters: number
  contingency_liters: number
  alternate_liters: number
  final_reserve_liters: number
  total_liters: number
}

interface WindSummary {
  wind_dir_deg: number
  wind_speed_kts: number
  headwind_kts: number
  crosswind_kts: number
  wca_deg: number
  ground_speed_kts: number
}

interface AircraftInfo {
  registration_number: string
  model: string
  cruiseSpeed?: number
  consumption?: number
  maxAltitude?: number
  total_flight_hours?: number
}

interface AirportInfo {
  ICAO: string
  name: string
  elevation?: number
  runways?: { ident: string; surface: string; length: number }[]
  weather?: { METAR?: string }
}

interface OFPExportProps {
  departureInfo: AirportInfo
  arrivalInfo: AirportInfo
  waypoints: WaypointData[]
  aircraft?: AircraftInfo | null
  pilotName?: string
  pilotEmail?: string
  flightType?: string
  flightNumber?: string
  departureTime?: string
  arrivalTime?: string
  totalDistanceKm?: number
  totalTimeHours?: number
  fuelPolicy?: FuelPolicy | null
  windSummary?: WindSummary | null
  performanceProfile?: string
  weatherConditions?: string
  passengers?: number
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OFPExport(props: OFPExportProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    if (!printRef.current) return

    const printWindow = window.open("", "_blank", "width=900,height=1200")
    if (!printWindow) return

    const content = printRef.current.innerHTML

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OFP - ${props.departureInfo.ICAO} to ${props.arrivalInfo.ICAO}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 10px;
            color: #000;
            background: #fff;
            padding: 12mm 10mm;
            line-height: 1.4;
          }
          .ofp-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .ofp-header h1 { font-size: 16px; letter-spacing: 2px; }
          .ofp-header h2 { font-size: 12px; margin-top: 2px; }
          .ofp-section {
            margin-bottom: 10px;
            border: 1px solid #000;
            page-break-inside: avoid;
          }
          .ofp-section-title {
            background: #000;
            color: #fff;
            padding: 3px 8px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1px;
          }
          .ofp-section-body { padding: 6px 8px; }
          .ofp-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px 20px;
          }
          .ofp-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 4px 20px;
          }
          .ofp-label { font-weight: bold; }
          .ofp-row { display: flex; gap: 4px; }
          .ofp-row .ofp-label { min-width: 120px; }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          th, td {
            border: 1px solid #333;
            padding: 3px 5px;
            text-align: center;
          }
          th {
            background: #ddd;
            font-weight: bold;
          }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .ofp-fuel-table td { text-align: right; }
          .ofp-fuel-table td:first-child { text-align: left; }
          .ofp-footer {
            margin-top: 15px;
            border-top: 1px solid #000;
            padding-top: 8px;
            font-size: 9px;
          }
          .ofp-sig-line {
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
          }
          .ofp-sig-box {
            border-top: 1px solid #000;
            width: 200px;
            text-align: center;
            padding-top: 4px;
          }
          .text-warning { font-weight: bold; }
          @media print {
            body { padding: 5mm; }
          }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }, [props])

  const {
    departureInfo,
    arrivalInfo,
    waypoints,
    aircraft,
    pilotName,
    pilotEmail,
    flightType,
    flightNumber,
    departureTime,
    arrivalTime,
    totalDistanceKm,
    totalTimeHours,
    fuelPolicy,
    windSummary,
    performanceProfile,
    weatherConditions,
    passengers,
  } = props

  // Compute nav log
  const legs: { from: string; to: string; track: number; hdg: number; dist: number; alt: string; gs: number; ete: string; eta: string; fuel: string }[] = []
  let cumDist = 0

  for (let i = 0; i < waypoints.length - 1; i++) {
    const w1 = waypoints[i]
    const w2 = waypoints[i + 1]
    const dist = w2.leg_distance_nm ?? haversineNm(w1.lat, w1.lon, w2.lat, w2.lon)
    const trk = computeBearing(w1.lat, w1.lon, w2.lat, w2.lon)
    const wca = w2.wind_correction_deg ?? 0
    const gs = w2.ground_speed_kts ?? 100
    const eteMin = gs > 0 ? (dist / gs) * 60 : 0
    cumDist += dist

    legs.push({
      from: w1.ident,
      to: w2.ident,
      track: Math.round(trk),
      hdg: Math.round((trk + wca + 360) % 360),
      dist: Math.round(dist * 10) / 10,
      alt: formatAlt(w2.alt),
      gs: Math.round(gs),
      ete: formatTime(eteMin),
      eta: w2.time_from_dep_min !== undefined ? formatTime(w2.time_from_dep_min) : "-",
      fuel: w2.fuel_remaining_liters !== undefined ? `${w2.fuel_remaining_liters.toFixed(1)}` : "-",
    })
  }

  const now = new Date()

  return (
    <>
      <Button onClick={handlePrint} variant="outline" className="gap-2">
        <Printer className="h-4 w-4" />
        Imprimer OFP
      </Button>

      {/* Hidden printable content */}
      <div ref={printRef} style={{ display: "none" }}>
        {/* ---- HEADER ---- */}
        <div className="ofp-header">
          <h1>OPERATIONAL FLIGHT PLAN</h1>
          <h2>
            {departureInfo.ICAO} — {arrivalInfo.ICAO}
          </h2>
          <div>
            Generated: {now.toLocaleDateString()} {now.toLocaleTimeString()} UTC |{" "}
            {flightNumber || "N/A"}
          </div>
        </div>

        {/* ---- FLIGHT INFO ---- */}
        <div className="ofp-section">
          <div className="ofp-section-title">FLIGHT INFORMATION</div>
          <div className="ofp-section-body">
            <div className="ofp-grid">
              <div className="ofp-row"><span className="ofp-label">Flight Nr:</span> {flightNumber || "N/A"}</div>
              <div className="ofp-row"><span className="ofp-label">Flight Rules:</span> {flightType || "VFR"}</div>
              <div className="ofp-row"><span className="ofp-label">PIC:</span> {pilotName || "N/A"} {pilotEmail ? `(${pilotEmail})` : ""}</div>
              <div className="ofp-row"><span className="ofp-label">PAX:</span> {passengers ?? "N/A"}</div>
              <div className="ofp-row"><span className="ofp-label">DEP:</span> {departureInfo.ICAO} - {departureInfo.name} (Elev: {departureInfo.elevation ?? "?"}ft)</div>
              <div className="ofp-row"><span className="ofp-label">ARR:</span> {arrivalInfo.ICAO} - {arrivalInfo.name} (Elev: {arrivalInfo.elevation ?? "?"}ft)</div>
              <div className="ofp-row"><span className="ofp-label">ETD:</span> {departureTime || "N/A"}</div>
              <div className="ofp-row"><span className="ofp-label">ETA:</span> {arrivalTime || "N/A"}</div>
              <div className="ofp-row"><span className="ofp-label">EET:</span> {totalTimeHours ? formatTime(totalTimeHours * 60) : "N/A"}</div>
              <div className="ofp-row"><span className="ofp-label">Distance:</span> {totalDistanceKm ? `${totalDistanceKm.toFixed(0)} km / ${cumDist.toFixed(0)} NM` : "N/A"}</div>
            </div>
          </div>
        </div>

        {/* ---- AIRCRAFT ---- */}
        {aircraft && (
          <div className="ofp-section">
            <div className="ofp-section-title">AIRCRAFT</div>
            <div className="ofp-section-body">
              <div className="ofp-grid-3">
                <div className="ofp-row"><span className="ofp-label">REG:</span> {aircraft.registration_number}</div>
                <div className="ofp-row"><span className="ofp-label">Type:</span> {aircraft.model}</div>
                <div className="ofp-row"><span className="ofp-label">Perf Profile:</span> {performanceProfile || "Default"}</div>
                <div className="ofp-row"><span className="ofp-label">Vcrz:</span> {aircraft.cruiseSpeed ? `${aircraft.cruiseSpeed} km/h` : "N/A"}</div>
                <div className="ofp-row"><span className="ofp-label">Consumption:</span> {aircraft.consumption ? `${aircraft.consumption} L/h` : "N/A"}</div>
                <div className="ofp-row"><span className="ofp-label">Ceiling:</span> {aircraft.maxAltitude ? `${aircraft.maxAltitude} ft` : "N/A"}</div>
                <div className="ofp-row"><span className="ofp-label">Total hrs:</span> {aircraft.total_flight_hours ?? "N/A"} h</div>
              </div>
            </div>
          </div>
        )}

        {/* ---- WEATHER ---- */}
        {weatherConditions && (
          <div className="ofp-section">
            <div className="ofp-section-title">WEATHER</div>
            <div className="ofp-section-body">
              <div>{weatherConditions}</div>
              {windSummary && (
                <div style={{ marginTop: "4px" }}>
                  Wind: {Math.round(windSummary.wind_dir_deg).toString().padStart(3, "0")}/{Math.round(windSummary.wind_speed_kts)}kt |
                  HC: {Math.round(windSummary.headwind_kts)}kt |
                  XC: {Math.round(Math.abs(windSummary.crosswind_kts))}kt |
                  WCA: {windSummary.wca_deg > 0 ? "+" : ""}{windSummary.wca_deg.toFixed(1)} |
                  GS: {Math.round(windSummary.ground_speed_kts)}kt
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---- NAV LOG ---- */}
        <div className="ofp-section">
          <div className="ofp-section-title">NAVIGATION LOG</div>
          <div className="ofp-section-body" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th className="text-left">FROM</th>
                  <th className="text-left">TO</th>
                  <th>TRK</th>
                  <th>HDG</th>
                  <th>DIST (NM)</th>
                  <th>ALT</th>
                  <th>GS (kt)</th>
                  <th>ETE</th>
                  <th>ETA (T+)</th>
                  <th>FUEL REM (L)</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((leg, i) => (
                  <tr key={i}>
                    <td className="text-left font-bold">{leg.from}</td>
                    <td className="text-left font-bold">{leg.to}</td>
                    <td>{leg.track.toString().padStart(3, "0")}</td>
                    <td className="font-bold">{leg.hdg.toString().padStart(3, "0")}</td>
                    <td>{leg.dist}</td>
                    <td>{leg.alt}</td>
                    <td>{leg.gs}</td>
                    <td>{leg.ete}</td>
                    <td className="font-bold">{leg.eta}</td>
                    <td>{leg.fuel}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-left font-bold">TOTAL</td>
                  <td className="font-bold">{cumDist.toFixed(1)}</td>
                  <td colSpan={3}></td>
                  <td className="font-bold">{totalTimeHours ? formatTime(totalTimeHours * 60) : "-"}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ---- FUEL POLICY ---- */}
        {fuelPolicy && (
          <div className="ofp-section">
            <div className="ofp-section-title">FUEL POLICY (ICAO)</div>
            <div className="ofp-section-body" style={{ padding: 0 }}>
              <table className="ofp-fuel-table">
                <tbody>
                  <tr><td className="text-left">Taxi fuel</td><td>{fuelPolicy.taxi_liters.toFixed(1)} L</td></tr>
                  <tr><td className="text-left">Trip fuel</td><td>{fuelPolicy.trip_liters.toFixed(1)} L</td></tr>
                  <tr><td className="text-left">Contingency (5%)</td><td>{fuelPolicy.contingency_liters.toFixed(1)} L</td></tr>
                  <tr><td className="text-left">Alternate</td><td>{fuelPolicy.alternate_liters.toFixed(1)} L</td></tr>
                  <tr><td className="text-left">Final reserve ({flightType === "IFR" ? "30min IFR" : "45min VFR"})</td><td>{fuelPolicy.final_reserve_liters.toFixed(1)} L</td></tr>
                  <tr className="font-bold" style={{ borderTop: "2px solid #000" }}>
                    <td className="text-left">MINIMUM FUEL REQUIRED</td>
                    <td>{fuelPolicy.total_liters.toFixed(1)} L</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- FOOTER ---- */}
        <div className="ofp-footer">
          <div className="text-warning">
            ATTENTION: Ce document est fourni a titre indicatif uniquement. Le commandant de bord
            reste seul responsable de la preparation et de la securite du vol. Verifiez les NOTAMs,
            la meteo et les restrictions d&apos;espace aerien avant le depart.
          </div>
          <div className="ofp-sig-line">
            <div>
              <div className="ofp-sig-box">Signature PIC</div>
            </div>
            <div>
              <div className="ofp-sig-box">Date</div>
            </div>
          </div>
          <div style={{ marginTop: "10px", textAlign: "center", color: "#888", fontSize: "8px" }}>
            SkyCrew OFP Generator — {now.toISOString()}
          </div>
        </div>
      </div>
    </>
  )
}
