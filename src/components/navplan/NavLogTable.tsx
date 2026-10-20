"use client"

import { useTranslation } from "react-i18next"
import type { Leg, PlanAerodrome } from "@/lib/navplan/types"
import { AerodromeSheetPopover } from "./AerodromeSheet"
import { formatFt, formatNm, formatNumber } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"
import { pointLabel } from "@/lib/navplan/aerodrome"
import { BLANK_COLUMNS, NAVLOG_COLUMNS, legProfileNotes, navLogCell, navLogCumulative, navLogRows, type NavLogColumn, type NavLogRow } from "./navlog-rows"

export { legProfileNotes }

interface NavLogTableProps {
  legs: Leg[]
  alternateLeg?: Leg | null
  totalDistanceNm: number
  totalTimeMin: number
  /** METAR figures of the departure, destination and alternate, for their sheet. */
  aerodromes?: PlanAerodrome[]
  /** Shows the full sheet of an aerodrome on the page. */
  onOpenAerodrome?: (icao: string) => void
}

/** The point of a log line; an aerodrome opens its sheet. */
function PointName({ row, aerodromes, onOpenAerodrome }: { row: NavLogRow; aerodromes?: PlanAerodrome[]; onOpenAerodrome?: (icao: string) => void }) {
  const { t } = useTranslation("navplan")
  if (row.point.type !== "AERODROME") return <>{row.ident}</>
  const planned = aerodromes?.find((aerodrome) => aerodrome.icao === row.point.ident)
  const role = row.kind === "departure" ? "departure" : row.kind === "alternate" ? "alternate" : (planned?.role ?? "enroute")
  return (
    <AerodromeSheetPopover
      icao={row.point.ident}
      role={role}
      conditions={planned?.conditions}
      // The distances of the plan's role of this aerodrome (not of an aerodrome flown over).
      distances={planned && planned.role === role ? planned.distances : undefined}
      onOpenFull={onOpenAerodrome ? () => onOpenAerodrome(row.point.ident) : undefined}>
      <button
        type="button"
        className="rounded-sm font-semibold underline decoration-dotted underline-offset-4 hover:decoration-solid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${row.ident} — ${t("aerodrome.sheetOf", { icao: row.point.ident })}`}
      >
        {row.ident}
      </button>
    </AerodromeSheetPopover>
  )
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
      // The obstacle closest to the planned altitude on the leg (all of them in the Zones step).
      ...(row.leg.obstacles ?? [])
        .slice()
        .sort((a, b) => a.marginFt - b.marginFt)
        .slice(0, 1)
        .map((obstacle) => t("log.obstacleNote", { amsl: formatFt(obstacle.amslFt), margin: formatFt(obstacle.marginFt) })),
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
const UNIT_AFTER_VALUE: ReadonlySet<NavLogColumn> = new Set(["altitude", "msa", "tas", "groundSpeed", "distance", "time", "fuelRemaining"])

/**
 * The nav log in the format of the paper one: a line per point with the figures of the leg that
 * reaches it, the expected time over it, and blank boxes for the actual time and fuel. A table on
 * a wide screen (the printed log has the same columns); on a phone one card per leg.
 */
export function NavLogTable({ legs, alternateLeg, totalDistanceNm, totalTimeMin, aerodromes, onOpenAerodrome }: NavLogTableProps) {
  const { t } = useTranslation("navplan")
  const rows = navLogRows({ legs, alternateLeg })
  const labels = { calm: t("log.calm"), noForecast: t("log.noWindForecast") }
  const notesOf = useRowNotes()
  const distanceIndex = NAVLOG_COLUMNS.indexOf("distance")

  return (
    <div className="space-y-3">
      {/* Its own scrolling region, reachable with the keyboard when the log is wider than the screen. */}
      <div
        className="relative hidden overflow-x-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:block"
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
                            <PointName row={row} aerodromes={aerodromes} onOpenAerodrome={onOpenAerodrome} />
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
                          column === "msa" && row.leg?.terrain?.status === "WARNING" && "bg-warning/15 font-semibold text-warning",
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

      {/* Narrower screens (the log has 17 columns): one card per leg, nothing to scroll sideways. */}
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:hidden" aria-label={t("log.caption")}>
        {rows
          .filter((row) => row.leg)
          .map((row) => {
            const previous = rows[rows.indexOf(row) - 1]
            const from = row.kind === "alternate" ? (row.leg ? pointLabel(row.leg.from) : "") : (previous?.ident ?? "")
            const notes = notesOf(row)
            return (
              <li key={row.key} className="rounded-lg border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    {row.kind === "alternate" && <span className="mr-1 text-xs font-normal text-muted-foreground">{t("log.alternate")}</span>}
                    {from} → <PointName row={row} aerodromes={aerodromes} onOpenAerodrome={onOpenAerodrome} />
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
                  {row.leg?.terrain && <MobileFact column="msa" row={row} warn={row.leg.terrain.status === "WARNING"} />}
                </dl>
                {row.frequencies && <p className="mt-2 text-xs text-muted-foreground">{row.frequencies}</p>}
              </li>
            )
          })}
        <li className="flex justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm font-medium tabular-nums sm:col-span-2 xl:col-span-3">
          <span>{t("log.total")}</span>
          <span>
            {formatNm(totalDistanceNm)} · {formatNumber(totalTimeMin, 0)} min
          </span>
        </li>
      </ol>
    </div>
  )
}

function MobileFact({ column, row, strong = false, warn = false }: { column: NavLogColumn; row: NavLogRow; strong?: boolean; warn?: boolean }) {
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
      <dd className={cn("tabular-nums", strong ? "text-base font-semibold" : "", warn && "font-semibold text-warning")}>
        {value}
        {unit && value && UNIT_AFTER_VALUE.has(column) ? ` ${unit}` : ""}
      </dd>
    </div>
  )
}
