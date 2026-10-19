"use client"

import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { AlertTriangle, ExternalLink, Info, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AERODROME_DETAILS } from "@/graphql/navdata"
import { currentLocale } from "@/lib/i18n"
import { frequenciesByService, isLimitedUse, metres } from "@/lib/navplan/aerodrome"
import type { AerodromeConditions, AerodromeDetails, AerodromeSheet as Sheet, FlightPlanResult, RunwayWind } from "@/lib/navplan/types"
import { formatCourse, formatFt } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"

export type SheetRole = "departure" | "destination" | "alternate" | "enroute"

/** The AD 2 sheet of an aerodrome, asked once per ICAO and kept by Apollo. */
export function useAerodromeSheet(icao: string | null | undefined, skip = false) {
  const { data, loading, error } = useQuery<{ aerodrome: AerodromeDetails | null }>(AERODROME_DETAILS, {
    variables: { icao: icao ?? "" },
    skip: skip || !icao,
  })
  return { sheet: data?.aerodrome?.sheet ?? null, loading, error }
}

const signedVariation = (deg: number) => `${Math.abs(deg).toFixed(1).replace(".", currentLocale().startsWith("fr") ? "," : ".")}° ${deg >= 0 ? "E" : "W"}`

/** Status of the aerodrome, shown prominently when its use is limited. */
export function AerodromeStatus({ sheet }: { sheet: Pick<Sheet, "status" | "vfr" | "privateFlights"> }) {
  const { t } = useTranslation("navplan")
  if (!sheet.status && sheet.vfr !== false) return null
  const limited = isLimitedUse(sheet.status)
  return (
    <div className={cn("space-y-1 rounded-md p-2 text-sm", limited || sheet.vfr === false ? "border border-warning/60 bg-warning/10" : "bg-muted/50")}>
      {sheet.status && (
        <div className="flex flex-wrap items-center gap-2">
          {limited && <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />}
          <Badge variant={limited ? "warning" : "success"}>{t(`aerodrome.status.${sheet.status}`, { defaultValue: sheet.status })}</Badge>
          <span>{t(`aerodrome.statusHint.${sheet.status}`, { defaultValue: "" })}</span>
        </div>
      )}
      {sheet.vfr === false && <p className="font-medium">{t("aerodrome.noVfr")}</p>}
      {sheet.privateFlights === false && <p>{t("aerodrome.noPrivate")}</p>}
    </div>
  )
}

/** "07R · QFU 069° · TORA 1 050 m · LDA 890 m · seuil décalé": what each direction offers. */
function RunwayLines({ sheet, compact = false }: { sheet: Sheet; compact?: boolean }) {
  const { t } = useTranslation("navplan")
  const locale = currentLocale()
  if (sheet.runways.length === 0) return null
  return (
    <ul className="space-y-2">
      {sheet.runways.map((runway) => (
        <li key={runway.designator} className="text-sm">
          <p>
            <span className="font-semibold">{t("aerodrome.runway", { designator: runway.designator })}</span>
            {" · "}
            {t("aerodrome.runwaySize", { length: runway.lengthM ?? "?", width: runway.widthM ?? "?" })}
            {runway.surface ? ` · ${runway.surface}` : ""}
            {runway.main && !compact ? ` · ${t("aerodrome.mainRunway")}` : ""}
          </p>
          <ul className="text-muted-foreground">
            {runway.ends.map((end) => {
              const distances = [
                end.toraM != null ? t("aerodrome.tora", { value: metres(end.toraM, locale) }) : null,
                !compact && end.todaM != null ? t("aerodrome.toda", { value: metres(end.todaM, locale) }) : null,
                !compact && end.asdaM != null ? t("aerodrome.asda", { value: metres(end.asdaM, locale) }) : null,
                end.ldaM != null ? t("aerodrome.lda", { value: metres(end.ldaM, locale) }) : null,
              ].filter(Boolean)
              return (
                <li key={end.designator} className="tabular-nums">
                  <span className="font-medium text-foreground">{end.designator}</span>
                  {end.magneticBearingDeg != null && ` · ${t("aerodrome.qfu", { value: formatCourse(end.magneticBearingDeg) })}`}
                  {!compact && end.trueBearingDeg != null && ` (${t("aerodrome.trueBearing", { value: formatCourse(end.trueBearingDeg) })})`}
                  {" · "}
                  {distances.length > 0 ? distances.join(" · ") : t("aerodrome.distancesUnknown")}
                  {end.displacedThreshold && ` · ${t("aerodrome.displaced")}`}
                  {!compact && end.remarks && (
                    <details className="mt-0.5">
                      <summary className="cursor-pointer text-xs">{t("aerodrome.reduced")}</summary>
                      <p className="whitespace-pre-line text-xs">{end.remarks}</p>
                    </details>
                  )}
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )
}

function FrequencyLines({ sheet }: { sheet: Sheet }) {
  const { t } = useTranslation("navplan")
  const groups = frequenciesByService(sheet.frequencies)
  if (groups.length === 0) return null
  return (
    <ul className="space-y-1 text-sm">
      {groups.map((group) => (
        <li key={`${group.service}-${group.callsign}`}>
          <span className="font-semibold">{group.service}</span>
          {group.callsign && <span className="text-muted-foreground"> {group.callsign}</span>}{" "}
          {group.frequencies.map((frequency, index) => (
            <span key={frequency.mhz} className="tabular-nums">
              {index > 0 && " · "}
              <span className="font-medium">{frequency.mhz}</span>
              {(frequency.hoursCode || frequency.auxiliary || frequency.remark) && (
                <span className="text-xs text-muted-foreground">
                  {" ("}
                  {[
                    frequency.hoursCode ? t(`aerodrome.hoursCode.${frequency.hoursCode}`, { defaultValue: frequency.hoursCode }) : null,
                    frequency.auxiliary ? t("aerodrome.auxiliary") : null,
                    frequency.remark ? frequency.remark.split("\n")[0] : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  {")"}
                </span>
              )}
            </span>
          ))}
        </li>
      ))}
    </ul>
  )
}

const windWord = (wind: RunwayWind, t: (key: string, options?: Record<string, unknown>) => string) => {
  const head = wind.headwindKt >= 0 ? t("aerodrome.head", { value: wind.headwindKt }) : t("aerodrome.tail", { value: -wind.headwindKt })
  const cross =
    wind.crosswindKt === 0
      ? t("aerodrome.noCross")
      : wind.crosswindKt > 0
        ? t("aerodrome.crossRight", { value: wind.crosswindKt })
        : t("aerodrome.crossLeft", { value: -wind.crosswindKt })
  return `${head}, ${cross}`
}

/** Wind on each runway direction and density altitude, from the METAR of the aerodrome. */
export function RunwayWindLines({ conditions }: { conditions: AerodromeConditions | null | undefined }) {
  const { t } = useTranslation("navplan")
  if (!conditions) return <p className="text-sm text-muted-foreground">{t("aerodrome.noMetar")}</p>
  const wind =
    conditions.windSpeedKt == null
      ? null
      : conditions.windVariable
        ? t("aerodrome.metarWindVariable", { speed: conditions.windSpeedKt })
        : conditions.windDirectionDeg == null
          ? t("aerodrome.metarCalm")
          : t("aerodrome.metarWind", {
              wind: `${formatCourse(conditions.windDirectionDeg)} ${conditions.windSpeedKt} kt${conditions.gustKt ? ` G${conditions.gustKt}` : ""}`,
            })
  const runways = [...conditions.runways].sort((a, b) => Number(b.best) - Number(a.best))
  return (
    <div className="space-y-1 text-sm">
      <p>
        {[
          wind,
          conditions.temperatureC != null ? t("aerodrome.temperature", { value: conditions.temperatureC, qnh: conditions.qnhHpa ?? "?" }) : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {conditions.densityAltitudeFt != null && (
        <p className="font-medium">
          {t("aerodrome.densityAltitude", { value: formatFt(conditions.densityAltitudeFt) })}
          {conditions.pressureAltitudeFt != null && (
            <span className="font-normal text-muted-foreground"> ({t("aerodrome.pressureAltitude", { value: formatFt(conditions.pressureAltitudeFt) })})</span>
          )}
        </p>
      )}
      {runways.length > 0 && (
        <ul className="tabular-nums">
          {runways.map((runway) => (
            <li key={runway.designator} className={cn(runway.best ? "font-medium" : "text-muted-foreground")}>
              {runway.designator} : {windWord(runway, t)}
              {runway.gustCrosswindKt != null && runway.gustHeadwindKt != null && (
                <span className="text-xs"> — {t("aerodrome.gusts", { head: runway.gustHeadwindKt >= 0 ? t("aerodrome.head", { value: runway.gustHeadwindKt }) : t("aerodrome.tail", { value: -runway.gustHeadwindKt }), cross: Math.abs(runway.gustCrosswindKt) })}</span>
              )}
              {runway.best && <Badge variant="success" className="ml-2 align-middle">{t("aerodrome.bestRunway")}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function VacLink({ sheet }: { sheet: Sheet }) {
  const { t } = useTranslation("navplan")
  const href = sheet.vacUrl ?? sheet.chartsUrl
  return (
    <a className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline" href={href} target="_blank" rel="noopener noreferrer">
      {sheet.vacUrl ? t("aerodrome.vac") : t("aerodrome.vacUnknown")}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{t("crossings.newWindow")}</span>
    </a>
  )
}

function SheetHeading({ sheet, role, as: Heading = "h3" }: { sheet: Sheet; role?: SheetRole; as?: "h3" | "h4" | "p" }) {
  const { t } = useTranslation("navplan")
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <Heading className="text-base font-semibold">
        {sheet.icao}
        {sheet.name && <span className="font-normal"> {sheet.name}</span>}
      </Heading>
      {role && <span className="text-xs text-muted-foreground">{t(`aerodrome.role.${role}`)}</span>}
      <span className="text-sm tabular-nums text-muted-foreground">
        {sheet.elevationFt != null && t("aerodrome.elevation", { value: formatFt(sheet.elevationFt) })}
        {sheet.magneticVariationDeg != null &&
          ` · ${sheet.magneticVariationYear ? t("aerodrome.variationYear", { value: signedVariation(sheet.magneticVariationDeg), year: sheet.magneticVariationYear }) : t("aerodrome.variation", { value: signedVariation(sheet.magneticVariationDeg) })}`}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </section>
  )
}

/** The whole sheet: everything of AD 2 a pilot reads before leaving, nothing to scroll inside. */
export function AerodromeSheetContent({
  sheet: given,
  role,
  conditions,
  showConditions = true,
  logFrequency,
}: {
  sheet: Sheet
  role?: SheetRole
  conditions?: AerodromeConditions | null
  showConditions?: boolean
  /** What the plan's nav log prints for it (with the ground and ATIS of its role). */
  logFrequency?: string | null
}) {
  const { t } = useTranslation("navplan")
  const sheet = logFrequency ? { ...given, navLogFrequency: logFrequency } : given
  return (
    <div className="space-y-3">
      <SheetHeading sheet={sheet} role={role} />
      <AerodromeStatus sheet={sheet} />
      {sheet.source !== "SIA" && <p className="text-sm text-muted-foreground">{t("aerodrome.noSiaData")}</p>}
      {sheet.navLogFrequency && (
        <div className="text-sm">
          <p className="font-medium">{t("aerodrome.logFrequency", { value: sheet.navLogFrequency })}</p>
          {sheet.navLogFrequency.includes("/ A/A") && <p className="text-xs text-muted-foreground">{t("aerodrome.logFrequencyRule")}</p>}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <Section title={t("aerodrome.frequencies")}>
          <FrequencyLines sheet={sheet} />
        </Section>
        <Section title={t("aerodrome.runways")}>
          <RunwayLines sheet={sheet} />
          <p className="text-xs text-muted-foreground">{t("aerodrome.declaredHint")}</p>
        </Section>
        {sheet.atsHours && (
          <Section title={t("aerodrome.atsHours")}>
            <p className="whitespace-pre-line text-sm">{sheet.atsHours}</p>
          </Section>
        )}
        <Section title={t("aerodrome.fuel")}>
          <p className="text-sm font-medium">{sheet.fuelTypes.length > 0 ? sheet.fuelTypes.join(" · ") : t("aerodrome.fuelNone")}</p>
          {sheet.fuelHours && <p className="whitespace-pre-line text-sm text-muted-foreground">{t("aerodrome.fuelHours")} : {sheet.fuelHours}</p>}
          {(sheet.fuel || sheet.fuelRemarks) && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">{t("aerodrome.fuelDetails")}</summary>
              <p className="whitespace-pre-line text-xs">{[sheet.fuel, sheet.fuelRemarks].filter(Boolean).join("\n")}</p>
            </details>
          )}
        </Section>
      </div>
      {showConditions && (
        <Section title={t("aerodrome.conditions")}>
          <RunwayWindLines conditions={conditions} />
          {conditions && conditions.runways.length > 0 && <p className="text-xs text-muted-foreground">{t("aerodrome.windHint")}</p>}
        </Section>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <VacLink sheet={sheet} />
        {sheet.phone && <span className="text-sm text-muted-foreground">{t("aerodrome.phone", { phone: sheet.phone })}</span>}
      </div>
      {sheet.remarks && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t("aerodrome.remarks")}</summary>
          <p className="whitespace-pre-line text-xs">{sheet.remarks}</p>
        </details>
      )}
    </div>
  )
}

/** A card of the aerodromes step: the sheet of one aerodrome of the plan. */
export function AerodromeSheetCard({
  icao,
  role,
  conditions,
  id,
  logFrequency,
}: {
  icao: string
  role?: SheetRole
  conditions?: AerodromeConditions | null
  id?: string
  logFrequency?: string | null
}) {
  const { t } = useTranslation("navplan")
  const { sheet, loading } = useAerodromeSheet(icao)
  return (
    <article id={id} className="scroll-mt-24 rounded-lg border p-3" aria-label={t("aerodrome.sheetOf", { icao })}>
      {sheet ? (
        <AerodromeSheetContent sheet={sheet} role={role} conditions={conditions} logFrequency={logFrequency} />
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("aerodrome.loading")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("aerodrome.unavailable", { icao })}</p>
      )}
    </article>
  )
}

/** The essentials in a popover (status, frequencies, runways, fuel, VAC); the full sheet is on the page. */
export function AerodromeSheetPopover({
  icao,
  role,
  conditions,
  onOpenFull,
  className,
  children,
}: {
  icao: string
  role?: SheetRole
  conditions?: AerodromeConditions | null
  /** Shows the full sheet on the page (the aerodromes step). */
  onOpenFull?: () => void
  className?: string
  /** The trigger; an "i" button by default. */
  children?: React.ReactNode
}) {
  const { t } = useTranslation("navplan")
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children ?? (
          <Button type="button" variant="ghost" size="icon" className={cn("h-8 w-8 shrink-0", className)} aria-label={t("aerodrome.sheetOf", { icao })} title={t("aerodrome.sheetOf", { icao })}>
            <Info className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] space-y-3" align="start" aria-label={t("aerodrome.sheetOf", { icao })}>
        <PopoverSheet icao={icao} role={role} conditions={conditions} onOpenFull={onOpenFull} />
      </PopoverContent>
    </Popover>
  )
}

function PopoverSheet({ icao, role, conditions, onOpenFull }: { icao: string; role?: SheetRole; conditions?: AerodromeConditions | null; onOpenFull?: () => void }) {
  const { t } = useTranslation("navplan")
  const { sheet, loading } = useAerodromeSheet(icao)
  if (!sheet)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {loading ? t("aerodrome.loading") : t("aerodrome.unavailable", { icao })}
      </p>
    )
  const best = conditions?.runways.find((runway) => runway.best)
  return (
    <>
      <SheetHeading sheet={sheet} role={role} as="p" />
      <AerodromeStatus sheet={sheet} />
      {sheet.navLogFrequency && <p className="text-sm font-medium">{t("aerodrome.logFrequency", { value: sheet.navLogFrequency })}</p>}
      <RunwayLines sheet={sheet} compact />
      <p className="text-sm">
        <span className="font-medium">{t("aerodrome.fuel")} : </span>
        {sheet.fuelTypes.length > 0 ? sheet.fuelTypes.join(" · ") : t("aerodrome.fuelNone")}
      </p>
      {conditions && (best || conditions.densityAltitudeFt != null) && (
        <p className="text-sm tabular-nums">
          {best && `${best.designator} : ${windWord(best, t)}`}
          {best && conditions.densityAltitudeFt != null && " · "}
          {conditions.densityAltitudeFt != null && t("aerodrome.densityAltitude", { value: formatFt(conditions.densityAltitudeFt) })}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VacLink sheet={sheet} />
        {onOpenFull && (
          <Button type="button" variant="outline" size="sm" onClick={onOpenFull}>
            {t("aerodrome.fullSheet")}
          </Button>
        )}
      </div>
    </>
  )
}

/** Anchor of the full sheet of an aerodrome on the page. */
export const aerodromeSheetId = (icao: string) => `aerodrome-sheet-${icao}`

/**
 * The sheets of the aerodromes of the plan, stacked: departure, destination, alternate (with the
 * wind on their runways and density altitude from the METAR), then the aerodromes on the route.
 */
export function AerodromesPanel({ result }: { result: Pick<FlightPlanResult, "aerodromes" | "legs" | "alternateLeg"> }) {
  const roles: { icao: string; role: SheetRole; conditions?: AerodromeConditions | null }[] = []
  // The frequency each line of the nav log carries.
  const last = result.legs[result.legs.length - 1]
  const logFrequencyOf = (icao: string, role: SheetRole) =>
    role === "departure"
      ? result.legs[0]?.from.frequency
      : role === "destination"
        ? last?.to.frequency
        : role === "alternate"
          ? result.alternateLeg?.to.frequency
          : result.legs.find((leg) => leg.to.ident === icao)?.to.frequency
  const planned = result.aerodromes ?? []
  if (planned.length > 0) {
    for (const aerodrome of planned) roles.push({ icao: aerodrome.icao, role: aerodrome.role, conditions: aerodrome.conditions ?? null })
  } else if (result.legs.length > 0) {
    // A plan saved before the sheets: its aerodromes, without the METAR figures.
    roles.push({ icao: result.legs[0].from.ident, role: "departure" }, { icao: result.legs[result.legs.length - 1].to.ident, role: "destination" })
    if (result.alternateLeg) roles.push({ icao: result.alternateLeg.to.ident, role: "alternate" })
  }
  for (const leg of result.legs.slice(0, -1)) {
    if (leg.to.type === "AERODROME" && !roles.some((known) => known.icao === leg.to.ident)) roles.push({ icao: leg.to.ident, role: "enroute" })
  }
  return (
    <div className="space-y-3">
      {roles.map((entry) => (
        <AerodromeSheetCard
          key={`${entry.role}-${entry.icao}`}
          id={aerodromeSheetId(entry.icao)}
          icao={entry.icao}
          role={entry.role}
          conditions={entry.conditions}
          logFrequency={logFrequencyOf(entry.icao, entry.role)}
        />
      ))}
    </div>
  )
}
