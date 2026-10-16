"use client"

import { useTranslation } from "react-i18next"
import type { Leg } from "@/lib/navplan/types"
import { formatFt, formatNm, formatNumber } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"
import { BLANK_COLUMNS, NAVLOG_COLUMNS, legProfileNotes, navLogCell, navLogCumulative, navLogRows, type NavLogColumn, type NavLogRow } from "./navlog-rows"

export { legProfileNotes }

interface NavLogTableProps {
  legs: Leg[]
  alternateLeg?: Leg | null
  totalDistanceNm: number
  totalTimeMin: number
}

/** TOC, TOD and the suggested level of the leg leading to a point, in words. */
export function useRowNotes() {
  const { t } = useTranslation("navplan")
  return (row: NavLogRow) => {
    if (!row.leg) return []
    const { toc, tod } = legProfileNotes(row.leg)
    return [
      toc !== undefined ? t("log.tocAt", { distance: formatNm(toc) }) : null,
      tod !== undefined ? t("log.todAt", { distance: formatNm(tod) }) : null,
      row.leg.suggestedAltitudeFt && row.leg.suggestedAltitudeFt !== row.leg.altitudeFt
        ? t("log.suggestedAltitude", { altitude: formatFt(row.leg.suggestedAltitudeFt) })
        : null,
    ].filter((note): note is string => Boolean(note))
  }
}

/** Heading of a nav log column: the paper abbreviation spelt out on hover, and its unit. */
export function NavLogHeading({ column }: { column: NavLogColumn }) {
  const { t } = useTranslation("navplan")
  const unit = t(`log.units.${column}`, { defaultValue: "" })
  return (
    <>
      <abbr title={t(`log.long.${column}`)} className="no-underline">
        {t(`log.columns.${column}`)}
      </abbr>
      {unit && <span className="block text-[0.7rem] font-normal">{unit}</span>}
    </>
  )
}

const ALIGN_LEFT: ReadonlySet<NavLogColumn> = new Set(["point", "frequency"])
// On a phone card the figure carries its unit (there is no column heading above it).
const UNIT_AFTER_VALUE: ReadonlySet<NavLogColumn> = new Set(["altitude", "tas", "groundSpeed", "distance", "time", "fuelRemaining"])

/**
 * The nav log in the format of the paper one: a line per point with the figures of the leg that
 * reaches it, the expected time over it, and blank boxes for the actual time and fuel. A table on
 * a wide screen (the printed log has the same columns); on a phone one card per leg.
 */
export function NavLogTable({ legs, alternateLeg, totalDistanceNm, totalTimeMin }: NavLogTableProps) {
  const { t } = useTranslation("navplan")
  const rows = navLogRows({ legs, alternateLeg })
  const labels = { calm: t("log.calm"), noForecast: t("log.noWindForecast") }
  const notesOf = useRowNotes()
  const distanceIndex = NAVLOG_COLUMNS.indexOf("distance")

  return (
    <div className="space-y-3">
      {/* Its own scrolling region, reachable with the keyboard when the log is wider than the screen. */}
      <div
        className="relative hidden overflow-x-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:block"
        tabIndex={0}
        role="region"
        aria-label={t("log.caption")}
      >
        <table className="w-full border-collapse text-[0.8125rem] tabular-nums [&_td]:border [&_td]:px-1.5 [&_td]:py-1.5 [&_th]:border [&_th]:px-1.5 [&_th]:py-1.5">
          <caption className="sr-only">{t("log.caption")}</caption>
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {NAVLOG_COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={cn("whitespace-nowrap align-bottom font-semibold", ALIGN_LEFT.has(column) ? "text-left" : "text-center")}
                >
                  <NavLogHeading column={column} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const notes = notesOf(row)
              return (
                <tr key={row.key} className={cn(row.kind === "alternate" && "bg-muted/40")}>
                  {NAVLOG_COLUMNS.map((column) => {
                    if (column === "point") {
                      return (
                        <th key={column} scope="row" className="min-w-[6rem] max-w-[10rem] text-left align-top font-normal">
                          <span className="block font-semibold">
                            {row.kind === "alternate" && <span className="text-xs font-normal text-muted-foreground">{t("log.alternate")} </span>}
                            {row.ident}
                          </span>
                          {row.name && row.name !== row.ident && <span className="block truncate text-xs text-muted-foreground">{row.name}</span>}
                          {notes.length > 0 && <span className="block text-xs text-muted-foreground">{notes.join(" · ")}</span>}
                        </th>
                      )
                    }
                    const cumulative = navLogCumulative(row, column)
                    return (
                      <td
                        key={column}
                        className={cn(
                          "align-top",
                          ALIGN_LEFT.has(column) ? "text-left text-xs" : column === "wind" ? "min-w-[4.5rem] text-center" : "whitespace-nowrap text-center",
                          column === "magneticHeading" && "font-semibold",
                          BLANK_COLUMNS.has(column) && "min-w-[3.5rem] bg-muted/30",
                        )}
                      >
                        {navLogCell(row, column, labels)}
                        {cumulative && <span className="block text-xs text-muted-foreground">{cumulative}</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-muted/60 font-semibold">
            <tr>
              <th scope="row" className="text-left">
                {t("log.total")}
              </th>
              <td colSpan={distanceIndex - 1} />
              <td className="text-center">{formatNumber(totalDistanceNm, 1)}</td>
              <td className="text-center">{formatNumber(totalTimeMin, 0)}</td>
              <td colSpan={NAVLOG_COLUMNS.length - distanceIndex - 2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Phone: one card per leg, nothing to scroll sideways. */}
      <ol className="space-y-3 md:hidden" aria-label={t("log.caption")}>
        {rows
          .filter((row) => row.leg)
          .map((row) => {
            const previous = rows[rows.indexOf(row) - 1]
            const from = row.kind === "alternate" ? (row.leg?.from.ident ?? "") : (previous?.ident ?? "")
            const notes = notesOf(row)
            return (
              <li key={row.key} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {row.kind === "alternate" && <span className="mr-1 text-xs font-normal text-muted-foreground">{t("log.alternate")}</span>}
                    {from} → {row.ident}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">{row.leg ? formatFt(row.leg.altitudeFt) : ""}</p>
                </div>
                {notes.length > 0 && <p className="text-xs text-muted-foreground">{notes.join(" · ")}</p>}
                <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
                  <MobileFact column="magneticHeading" row={row} strong />
                  <MobileFact column="time" row={row} strong />
                  <MobileFact column="fuelRemaining" row={row} strong />
                  <MobileFact column="magneticCourse" row={row} />
                  <MobileFact column="wind" row={row} />
                  <MobileFact column="drift" row={row} />
                  <MobileFact column="groundSpeed" row={row} />
                  <MobileFact column="distance" row={row} />
                  <MobileFact column="eta" row={row} />
                </dl>
                {row.frequencies && <p className="mt-2 text-xs text-muted-foreground">{row.frequencies}</p>}
              </li>
            )
          })}
        <li className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium tabular-nums">
          <span>{t("log.total")}</span>
          <span>
            {formatNm(totalDistanceNm)} · {formatNumber(totalTimeMin, 0)} min
          </span>
        </li>
      </ol>
    </div>
  )
}

function MobileFact({ column, row, strong = false }: { column: NavLogColumn; row: NavLogRow; strong?: boolean }) {
  const { t } = useTranslation("navplan")
  const unit = t(`log.units.${column}`, { defaultValue: "" })
  const value = navLogCell(row, column, { calm: t("log.calm"), noForecast: t("log.noWindForecast") })
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">
        <abbr title={t(`log.long.${column}`)} className="no-underline">
          {t(`log.columns.${column}`)}
        </abbr>
      </dt>
      <dd className={cn("tabular-nums", strong ? "text-base font-semibold" : "")}>
        {value}
        {unit && value && UNIT_AFTER_VALUE.has(column) ? ` ${unit}` : ""}
      </dd>
    </div>
  )
}
