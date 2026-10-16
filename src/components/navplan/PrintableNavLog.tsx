"use client"

import { useTranslation } from "react-i18next"
import { formatDate } from "@/lib/format"
import type { FlightPlanInput, FlightPlanResult, Leg, PdfFormat } from "@/lib/navplan/types"
import {
  formatCourse,
  formatDrift,
  formatKt,
  formatLitres,
  formatMinutes,
  formatNm,
  formatUtcTime,
  formatWind,
} from "@/lib/navplan/units"
import { legProfileNotes } from "./NavLogTable"
import { massBalanceComputed } from "@/lib/navplan/status"
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

const zonesToContact = (leg: Leg) =>
  leg.crossings
    .filter((crossing) => crossing.relation !== "ABOVE" && crossing.relation !== "BELOW")
    .map((crossing) => {
      const frequency = crossing.airspace.frequencies[0]
      return frequency ? `${crossing.airspace.name} ${frequency.mhz}` : crossing.airspace.name
    })
    .join(" · ")

/** The QNH the plan was computed with, so the paper log never says "—" when the METAR gave it. */
export const printedQnh = (qnh: number | null | undefined) => (typeof qnh === "number" ? `${Math.round(qnh)} hPa` : "—")

/** Paper nav log of design § 2.10, with blank columns for the actual times and fuel. */
export function PrintableNavLog({ result, input, aircraft, pilot, format }: PrintableNavLogProps) {
  const { t } = useTranslation("navplan")
  const legs = result.alternateLeg ? [...result.legs, result.alternateLeg] : result.legs
  let cumulativeDistance = 0

  return (
    <section className="navlog-print" data-format={format} aria-hidden="true">
      <header className="navlog-print__header">
        <strong>{t("print.title")}</strong>
        <span>{t("print.aircraft", { value: aircraft })}</span>
        <span>{t("print.pilot", { value: pilot })}</span>
        <span>{t("print.date", { value: formatDate(input.departureTime), time: formatUtcTime(input.departureTime) })}</span>
        <span>{t("print.qnh", { value: printedQnh(result.qnhHpa ?? input.qnhHpa) })}</span>
        <span>{t("print.airac", { value: result.navdata.airac })}</span>
        <span>{t("print.wind", { value: result.windSource })}</span>
      </header>
      {result.navdata.stale && <p className="navlog-print__warning">{t("navdata.staleTitle", { airac: result.navdata.airac, date: formatDate(result.navdata.effectiveFrom) })}</p>}
      {result.massBalance.status === "BLOCKING" && massBalanceComputed(result.massBalance) && <p className="navlog-print__warning">{t("print.outOfLimits")}</p>}
      <table>
        <thead>
          <tr>
            <th>{t("print.columns.point")}</th>
            <th>{t("print.columns.altitude")}</th>
            <th>{t("print.columns.trueCourse")}</th>
            <th>{t("print.columns.magneticCourse")}</th>
            <th>{t("print.columns.wind")}</th>
            <th>{t("print.columns.drift")}</th>
            <th>{t("print.columns.magneticHeading")}</th>
            <th>{t("print.columns.tas")}</th>
            <th>{t("print.columns.gs")}</th>
            <th>{t("print.columns.distance")}</th>
            <th>{t("print.columns.cumulativeDistance")}</th>
            <th>{t("print.columns.time")}</th>
            <th>{t("print.columns.cumulativeTime")}</th>
            <th>{t("print.columns.eta")}</th>
            <th>{t("print.columns.ata")}</th>
            <th>{t("print.columns.fuelPlanned")}</th>
            <th>{t("print.columns.fuelActual")}</th>
            <th>{t("print.columns.contacts")}</th>
            <th>{t("print.columns.remarks")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{result.legs[0]?.from.ident ?? "—"}</td>
            <td colSpan={18} />
          </tr>
          {legs.map((leg, position) => {
            const isAlternate = position === result.legs.length
            cumulativeDistance = isAlternate ? leg.distanceNm : cumulativeDistance + leg.distanceNm
            const { toc, tod } = legProfileNotes(leg)
            const remarks = [
              isAlternate ? t("log.alternate") : null,
              toc !== undefined ? `TOC ${formatNm(toc)}` : null,
              tod !== undefined ? `TOD ${formatNm(tod)}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
            return (
              <tr key={`${isAlternate ? "alt" : "leg"}-${leg.index}`}>
                <td>{leg.to.ident}</td>
                <td>{leg.altitudeFt}</td>
                <td>{formatCourse(leg.trueCourseDeg)}</td>
                <td>{formatCourse(leg.magneticCourseDeg)}</td>
                <td>{formatWind(leg.wind, t("log.calm"))}</td>
                <td>{formatDrift(leg.windCorrectionDeg)}</td>
                <td className="navlog-print__strong">{formatCourse(leg.magneticHeadingDeg)}</td>
                <td>{formatKt(leg.tasKt)}</td>
                <td>{formatKt(leg.groundSpeedKt)}</td>
                <td>{formatNm(leg.distanceNm)}</td>
                <td>{formatNm(cumulativeDistance)}</td>
                <td>{formatMinutes(leg.timeMin)}</td>
                <td>{formatMinutes(leg.cumulativeTimeMin)}</td>
                <td>{formatUtcTime(leg.eta)}</td>
                <td />
                <td>{formatLitres(leg.fuelRemainingL, 0)}</td>
                <td />
                <td>{zonesToContact(leg)}</td>
                <td>{remarks}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <footer className="navlog-print__footer">
        <span>
          {t("print.reserve", { litres: formatLitres(result.fuel.finalReserveL), minutes: result.fuel.finalReserveMin })}
        </span>
        <span>{t("print.loaded", { litres: formatLitres(result.fuel.loadedL) })}</span>
        <span>{t("print.endurance", { value: formatMinutes(result.fuel.enduranceMin) })}</span>
        <span>☐ {t("print.notamChecked")}</span>
        <p>{t("disclaimer.preparation")}</p>
      </footer>
    </section>
  )
}
