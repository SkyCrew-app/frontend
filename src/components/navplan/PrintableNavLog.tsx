"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { formatDate } from "@/lib/format"
import type { FlightPlanInput, FlightPlanResult, PdfFormat } from "@/lib/navplan/types"
import { formatLitres, formatMinutes, formatUtcTime } from "@/lib/navplan/units"
import { NAVLOG_COLUMNS, navLogCell, navLogCumulative, navLogRows } from "./navlog-rows"
import { useRowNotes } from "./NavLogTable"
import { useQnhOrigin } from "./FlightConditions"
import { checkStatusLabel, massBalanceComputed } from "@/lib/navplan/status"
import "./navlog-print.css"

interface PrintableNavLogProps {
  result: FlightPlanResult
  input: FlightPlanInput
  aircraft: string
  pilot: string
  format: PdfFormat
}

const PAGE_STYLE_ID = "navlog-page-size"

/** Prints only the nav log, on A5 landscape (kneeboard) or A4 portrait. */
export function printNavLog(format: PdfFormat) {
  const style = document.createElement("style")
  style.id = PAGE_STYLE_ID
  style.textContent = `@page { size: ${format === "A5" ? "A5 landscape" : "A4 portrait"}; margin: 8mm; }`
  document.getElementById(PAGE_STYLE_ID)?.remove()
  document.head.appendChild(style)
  document.body.dataset.printMode = "navlog"
  const cleanup = () => {
    delete document.body.dataset.printMode
    document.getElementById(PAGE_STYLE_ID)?.remove()
    window.removeEventListener("afterprint", cleanup)
  }
  window.addEventListener("afterprint", cleanup)
  // Let menus close before the print dialog freezes the page.
  setTimeout(() => window.print(), 150)
}

/** The QNH the plan was computed with, so the paper log never says "—" when the METAR gave it. */
export const printedQnh = (qnh: number | null | undefined) => (typeof qnh === "number" ? `${Math.round(qnh)} hPa` : "—")

/** Paper nav log of design § 2.10: the columns of the screen, with blank boxes for the actual times and fuel. */
export function PrintableNavLog({ result, input, aircraft, pilot, format }: PrintableNavLogProps) {
  const { t } = useTranslation("navplan")
  // Printed as a child of <body>, so the rest of the page can be left out of the print
  // (display: none) instead of only hidden, which printed it as blank sheets.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const qnhOrigin = useQnhOrigin(result, input.departureTime)
  const rows = navLogRows(result)
  const labels = { calm: t("log.calm"), noForecast: t("log.noWindForecast") }
  const notesOf = useRowNotes()

  if (!mounted) return null
  return createPortal(
    <section className="navlog-print" data-format={format} aria-hidden="true">
      <header className="navlog-print__header">
        <strong>{t("print.title")}</strong>
        <span>{t("print.aircraft", { value: aircraft })}</span>
        <span>{t("print.pilot", { value: pilot })}</span>
        <span>{t("print.date", { value: formatDate(input.departureTime), time: formatUtcTime(input.departureTime) })}</span>
        <span>
          {t("print.qnh", { value: printedQnh(result.qnhHpa ?? input.qnhHpa) })}
          {qnhOrigin ? ` (${qnhOrigin})` : ""}
        </span>
        <span>
          {/* Aerodromes-only data has no AIRAC cycle. */}
          {result.navdata.airac === "OURAIRPORTS"
            ? t("print.navdataOurAirports", { date: formatDate(result.navdata.effectiveFrom) })
            : t("print.airac", { value: result.navdata.airac })}
        </span>
        <span>{t("print.wind", { value: result.windSource })}</span>
      </header>
      {result.navdata.stale && <p className="navlog-print__warning">{t("navdata.staleTitle", { airac: result.navdata.airac, date: formatDate(result.navdata.effectiveFrom) })}</p>}
      {result.massBalance.status === "BLOCKING" && massBalanceComputed(result.massBalance) && <p className="navlog-print__warning">{t("print.outOfLimits")}</p>}
      <table>
        <thead>
          <tr>
            {NAVLOG_COLUMNS.map((column) => (
              <th key={column}>
                {t(`log.columns.${column}`)}
                {t(`log.units.${column}`, { defaultValue: "" }) && <span className="navlog-print__unit">{t(`log.units.${column}`)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const notes = notesOf(row)
            return (
              <tr key={row.key}>
                {NAVLOG_COLUMNS.map((column) => {
                  if (column === "point") {
                    return (
                      <td key={column} className="navlog-print__point">
                        <span className="navlog-print__strong">
                          {row.kind === "alternate" ? `${t("log.alternate")} ` : ""}
                          {row.ident}
                        </span>
                        {row.name && row.name !== row.ident && <span className="navlog-print__note">{row.name}</span>}
                        {notes.length > 0 && <span className="navlog-print__note">{notes.join(" · ")}</span>}
                      </td>
                    )
                  }
                  const cumulative = navLogCumulative(row, column)
                  return (
                    <td key={column} className={`navlog-print__${column}`}>
                      {navLogCell(row, column, labels)}
                      {cumulative && <span className="navlog-print__note">{cumulative}</span>}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
      <PrintedAerodromes result={result} />
      {/* Not a <footer>: the application's print styles hide those. */}
      <div className="navlog-print__footer">
        <span>
          {t("print.reserve", { litres: formatLitres(result.fuel.finalReserveL), minutes: result.fuel.finalReserveMin })}
        </span>
        <span>{t("print.loaded", { litres: formatLitres(result.fuel.loadedL) })}</span>
        <span>{t("print.endurance", { value: formatMinutes(result.fuel.enduranceMin) })}</span>
        <span>☐ {t("print.notamChecked")}</span>
        <p>{t("disclaimer.preparation")}</p>
      </div>
    </section>,
    document.body,
  )
}

/** Under the log: METAR wind on the runways and density altitude of each aerodrome, the 0 °C isotherm. */
function PrintedAerodromes({ result }: { result: FlightPlanResult }) {
  const { t } = useTranslation("navplan")
  const lines = (result.aerodromes ?? [])
    .filter((aerodrome) => aerodrome.conditions)
    .map((aerodrome) => {
      const conditions = aerodrome.conditions!
      const best = conditions.runways.find((runway) => runway.best)
      const wind =
        conditions.windSpeedKt == null
          ? ""
          : conditions.windDirectionDeg == null
            ? `${conditions.windVariable ? "VRB" : "000"}/${conditions.windSpeedKt}`
            : `${String(conditions.windDirectionDeg).padStart(3, "0")}/${conditions.windSpeedKt}${conditions.gustKt ? `G${conditions.gustKt}` : ""}`
      const runway = best
        ? ` → ${best.designator} : ${best.headwindKt >= 0 ? t("aerodrome.head", { value: best.headwindKt }) : t("aerodrome.tail", { value: -best.headwindKt })}, ${
            best.crosswindKt === 0
              ? t("aerodrome.noCross")
              : best.crosswindKt > 0
                ? t("aerodrome.crossRight", { value: best.crosswindKt })
                : t("aerodrome.crossLeft", { value: -best.crosswindKt })
          }`
        : ""
      const density = conditions.densityAltitudeFt != null ? ` — ${t("aerodrome.densityAltitude", { value: `${conditions.densityAltitudeFt} ft` })}` : ""
      return `${t(`aerodrome.role.${aerodrome.role}`)} ${aerodrome.icao} : ${wind}${runway}${density}`
    })
  const freezing = (result.freezingLevels ?? [])
    .map((level) =>
      `${t(`weather.freezingPlace.${level.place}`, { ident: level.ident ?? "" })} ${
        level.state === "LEVEL"
          ? `${level.altitudeFt} ft`
          : level.state === "SURFACE"
            ? t("weather.freezingSurface")
            : level.state === "ABOVE"
              ? `> ${level.topFt} ft`
              : "?"
      }`,
    )
    .join(" · ")
  // Take-off and landing on the suggested runway of each aerodrome of the plan.
  const distances = (result.aerodromes ?? [])
    .filter((aerodrome) => aerodrome.distances)
    .map((aerodrome) => {
      const value = aerodrome.distances!
      const kind = t(value.kind === "TAKEOFF" ? "distances.takeoff" : "distances.landing")
      if (value.dataMissing) return `${kind} ${aerodrome.icao} : ${t("distances.notEntered")}`
      const runway = value.runways.find((candidate) => candidate.suggested)
      if (!runway) return `${kind} ${aerodrome.icao} : ${t("distances.noRunway")}`
      return `${kind} ${aerodrome.icao} ${runway.designator} : ${t(value.kind === "TAKEOFF" ? "distances.takeoffPrint" : "distances.landingPrint", {
        required: runway.requiredDistance15mM ?? "?",
        available: runway.availableDistanceM ?? "?",
      })} — ${checkStatusLabel(runway.status)}`
    })
  if (lines.length === 0 && !freezing && distances.length === 0 && !result.terrainSource) return null
  return (
    <div className="navlog-print__aerodromes">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {distances.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {result.legs.some((leg) => leg.terrain) && <p>{t("profile.printNote", { corridor: result.legs.find((leg) => leg.terrain)!.terrain!.corridorNm, margin: result.legs.find((leg) => leg.terrain)!.terrain!.marginFt })}</p>}
      {result.terrainSource && <p className="navlog-print__note">{result.terrainSource.attribution}</p>}
      {freezing && (
        <p>
          {t("weather.freezingTitle")} : {freezing}
        </p>
      )}
    </div>
  )
}
