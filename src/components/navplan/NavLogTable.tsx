"use client"

import { useTranslation } from "react-i18next"
import type { Leg } from "@/lib/navplan/types"
import {
  formatCourse,
  formatDrift,
  formatFt,
  formatKt,
  formatLitres,
  formatMinutes,
  formatNm,
  formatUtcTime,
  formatWind,
} from "@/lib/navplan/units"
import { cn } from "@/lib/utils"

interface NavLogTableProps {
  legs: Leg[]
  alternateLeg?: Leg | null
  totalDistanceNm: number
  totalTimeMin: number
}

/** Where the climb ends / the descent starts on a leg, from the phase segments of the API. */
export function legProfileNotes(leg: Leg): { toc?: number; tod?: number } {
  const climb = leg.segments.find((segment) => segment.phase === "CLIMB")
  const descent = leg.segments.find((segment) => segment.phase === "DESCENT")
  return {
    toc: climb && climb.toNm < leg.distanceNm - 0.05 ? climb.toNm : undefined,
    tod: descent && descent.fromNm > 0.05 ? descent.fromNm : undefined,
  }
}

const legName = (leg: Leg) => `${leg.from.ident} → ${leg.to.ident}`

function ProfileNote({ leg }: { leg: Leg }) {
  const { t } = useTranslation("navplan")
  const { toc, tod } = legProfileNotes(leg)
  const notes = [
    toc !== undefined ? t("log.tocAt", { distance: formatNm(toc) }) : null,
    tod !== undefined ? t("log.todAt", { distance: formatNm(tod) }) : null,
    leg.suggestedAltitudeFt && leg.suggestedAltitudeFt !== leg.altitudeFt
      ? t("log.suggestedAltitude", { altitude: formatFt(leg.suggestedAltitudeFt) })
      : null,
  ].filter(Boolean)
  if (notes.length === 0) return null
  return <span className="block whitespace-normal text-xs font-normal text-muted-foreground">{notes.join(" · ")}</span>
}

/**
 * The nav log, leg by leg, as the API computed it. A table on a wide screen; on a phone one
 * card per leg with the figures a pilot reads in flight first (heading, time, fuel).
 */
export function NavLogTable({ legs, alternateLeg, totalDistanceNm, totalTimeMin }: NavLogTableProps) {
  const { t } = useTranslation("navplan")
  const rows = alternateLeg ? [...legs, alternateLeg] : legs
  const calm = t("log.calm")
  // Without a winds aloft forecast the API assumes a calm wind: said so, never shown as a forecast.
  const windOf = (leg: Leg) => (leg.wind.source === "NONE" ? t("log.noWindForecast") : formatWind(leg.wind, calm))

  return (
    <div className="space-y-3">
      {/* Its own scrolling region, reachable with the keyboard when the log is wider than the screen. */}
      <div className="relative hidden overflow-x-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:block" tabIndex={0} role="region" aria-label={t("log.caption")}>
        <table className="w-full whitespace-nowrap text-sm [&_td]:px-2.5 [&_td]:py-2 [&_th]:px-2.5 [&_th]:py-2">
          <caption className="sr-only">{t("log.caption")}</caption>
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="font-medium text-left">{t("log.columns.leg")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.altitude")}</th>
              <th scope="col" className="font-medium text-right">
                <abbr title={t("log.columns.magneticCourseLong")}>{t("log.columns.magneticCourse")}</abbr>
              </th>
              <th scope="col" className="font-medium text-right">{t("log.columns.wind")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.drift")}</th>
              <th scope="col" className="font-medium text-right">
                <abbr title={t("log.columns.magneticHeadingLong")}>{t("log.columns.magneticHeading")}</abbr>
              </th>
              <th scope="col" className="font-medium text-right">{t("log.columns.groundSpeed")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.distance")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.time")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.eta")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.fuel")}</th>
              <th scope="col" className="font-medium text-right">{t("log.columns.fuelRemaining")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((leg) => {
              const isAlternate = leg === alternateLeg
              return (
                <tr key={`${isAlternate ? "alt" : "leg"}-${leg.index}`} className={cn("border-b last:border-0", isAlternate && "bg-muted/40")}>
                  <td className="font-medium">
                    {isAlternate && <span className="mr-1 text-xs text-muted-foreground">{t("log.alternate")}</span>}
                    {legName(leg)}
                    <ProfileNote leg={leg} />
                  </td>
                  <td className="text-right tabular-nums">{formatFt(leg.altitudeFt)}</td>
                  <td className="text-right tabular-nums">{formatCourse(leg.magneticCourseDeg)}</td>
                  <td className="text-right tabular-nums">{windOf(leg)}</td>
                  <td className="text-right tabular-nums">{formatDrift(leg.windCorrectionDeg)}</td>
                  <td className="text-right font-semibold tabular-nums">{formatCourse(leg.magneticHeadingDeg)}</td>
                  <td className="text-right tabular-nums">{formatKt(leg.groundSpeedKt)}</td>
                  <td className="text-right tabular-nums">{formatNm(leg.distanceNm)}</td>
                  <td className="text-right tabular-nums">{formatMinutes(leg.timeMin)}</td>
                  <td className="text-right tabular-nums">{formatUtcTime(leg.eta)}</td>
                  <td className="text-right tabular-nums">{formatLitres(leg.fuelL)}</td>
                  <td className="text-right tabular-nums">{formatLitres(leg.fuelRemainingL)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t bg-muted/40">
            <tr className="border-b">
              <td className="font-medium">{t("log.total")}</td>
              <td colSpan={6} />
              <td className="text-right font-medium tabular-nums">{formatNm(totalDistanceNm)}</td>
              <td className="text-right font-medium tabular-nums">{formatMinutes(totalTimeMin)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Phone: one card per leg, nothing to scroll sideways. */}
      <ol className="space-y-3 md:hidden" aria-label={t("log.caption")}>
        {rows.map((leg) => {
          const isAlternate = leg === alternateLeg
          return (
            <li key={`${isAlternate ? "alt" : "leg"}-${leg.index}`} className="rounded-lg border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {isAlternate && <span className="mr-1 text-xs font-normal text-muted-foreground">{t("log.alternate")}</span>}
                  {legName(leg)}
                </p>
                <p className="text-sm tabular-nums text-muted-foreground">{formatFt(leg.altitudeFt)}</p>
              </div>
              <ProfileNote leg={leg} />
              <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                <MobileFact label={t("log.columns.magneticHeading")} value={formatCourse(leg.magneticHeadingDeg)} strong />
                <MobileFact label={t("log.columns.time")} value={formatMinutes(leg.timeMin)} strong />
                <MobileFact label={t("log.columns.fuelRemaining")} value={formatLitres(leg.fuelRemainingL)} strong />
                <MobileFact label={t("log.columns.magneticCourse")} value={formatCourse(leg.magneticCourseDeg)} />
                <MobileFact label={t("log.columns.wind")} value={windOf(leg)} />
                <MobileFact label={t("log.columns.drift")} value={formatDrift(leg.windCorrectionDeg)} />
                <MobileFact label={t("log.columns.groundSpeed")} value={formatKt(leg.groundSpeedKt)} />
                <MobileFact label={t("log.columns.distance")} value={formatNm(leg.distanceNm)} />
                <MobileFact label={t("log.columns.eta")} value={formatUtcTime(leg.eta)} />
              </dl>
            </li>
          )
        })}
        <li className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium tabular-nums">
          <span>{t("log.total")}</span>
          <span>
            {formatNm(totalDistanceNm)} · {formatMinutes(totalTimeMin)}
          </span>
        </li>
      </ol>
    </div>
  )
}

function MobileFact({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-base font-semibold" : "")}>{value}</dd>
    </div>
  )
}
