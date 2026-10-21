"use client"

import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { checkStatusLabel, checkStatusVariant } from "@/lib/navplan/status"
import type { AerodromeDistances, PlanAerodrome, RunwayDistance } from "@/lib/navplan/types"
import { formatFt, formatNumber } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"

const metres = (value: number | null | undefined) => (typeof value === "number" ? `${formatNumber(value, 0)} m` : "?")

/** What is needed against what is available on one runway direction, in a sentence. */
export function useRunwayDistanceText() {
  const { t } = useTranslation("navplan")
  return (distances: AerodromeDistances, runway: RunwayDistance) => {
    if (runway.requiredDistance15mM == null) return t("distances.notComputed")
    return distances.kind === "TAKEOFF"
      ? t("distances.takeoffLine", {
          roll: metres(runway.requiredGroundRollM),
          tora: metres(runway.availableRunM),
          distance: metres(runway.requiredDistance15mM),
          toda: metres(runway.availableDistanceM),
        })
      : t("distances.landingLine", { distance: metres(runway.requiredDistance15mM), lda: metres(runway.availableDistanceM) })
  }
}

/** Mass, pressure altitude, temperature and where they come from. */
function DistanceConditionsLine({ distances }: { distances: AerodromeDistances }) {
  const { t } = useTranslation("navplan")
  return (
    <p className="text-xs text-muted-foreground">
      {t("distances.conditions", {
        mass: distances.massKg != null ? `${formatNumber(distances.massKg, 0)} kg` : "?",
        pa: formatFt(distances.pressureAltitudeFt),
        temperature: formatNumber(distances.temperatureC, 0),
        source: t(`distances.conditionsSource.${distances.conditionsSource}`, { defaultValue: distances.conditionsSource }),
        factor: formatNumber(distances.safetyFactor, 2),
      })}
    </p>
  )
}

/** Every runway direction of the aerodrome with its distances (the aerodrome sheet; compact in its popover, without the notes). */
export function RunwayDistanceList({ distances, compact = false }: { distances: AerodromeDistances; compact?: boolean }) {
  const { t } = useTranslation("navplan")
  const text = useRunwayDistanceText()
  if (distances.dataMissing) return <p className="text-sm font-medium text-warning">{t("distances.missing")}</p>
  const runways = [...distances.runways].sort((a, b) => Number(b.suggested) - Number(a.suggested))
  return (
    <div className="space-y-2">
      <DistanceConditionsLine distances={distances} />
      <ul className="space-y-2">
        {runways.map((runway) => (
          <li key={runway.designator} className="text-sm">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{runway.designator}</span>
              <Badge variant={checkStatusVariant(runway.status)}>{checkStatusLabel(runway.status)}</Badge>
              {runway.suggested && <span className="text-xs text-muted-foreground">{t("aerodrome.bestRunway")}</span>}
            </div>
            <p className="tabular-nums">
              {text(distances, runway)}
              {runway.marginM != null && <span className={cn("ml-1", runway.marginM < 0 && "font-semibold text-destructive")}>({t("distances.margin", { value: metres(runway.marginM) })})</span>}
            </p>
            {!compact && runway.factors.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("distances.factors")} : {runway.factors.map((factor) => `${factor.label} ×${formatNumber(factor.factor, 2)}`).join(" · ")}
              </p>
            )}
            {!compact && runway.messages.length > 0 && <p className="text-xs text-muted-foreground">{runway.messages.join(" ")}</p>}
          </li>
        ))}
      </ul>
      {!compact && distances.messages.length > 0 && <p className="text-xs text-muted-foreground">{distances.messages.join(" ")}</p>}
      {!compact && distances.tableSource && <p className="text-xs text-muted-foreground">{t("distances.tableSource", { source: distances.tableSource })}</p>}
    </div>
  )
}

/**
 * Take-off at the departure, landing at the destination and the alternate: the suggested runway
 * of each, the others being on the aerodrome sheet.
 */
export function RunwayDistancesSummary({ aerodromes }: { aerodromes?: PlanAerodrome[] }) {
  const { t } = useTranslation("navplan")
  const text = useRunwayDistanceText()
  const withDistances = (aerodromes ?? []).filter((aerodrome) => aerodrome.distances)
  if (withDistances.length === 0) return null
  const missing = withDistances.every((aerodrome) => aerodrome.distances!.dataMissing)
  return (
    <div className="space-y-3">
      {missing && <p className="text-sm font-medium text-warning">{t("distances.missing")}</p>}
      <ul className="grid gap-3 md:grid-cols-3">
        {withDistances.map((aerodrome) => {
          const distances = aerodrome.distances!
          const suggested = distances.runways.find((runway) => runway.suggested)
          return (
            <li key={`${aerodrome.role}-${aerodrome.icao}`} className="space-y-1 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">
                  {t(distances.kind === "TAKEOFF" ? "distances.takeoff" : "distances.landing")} {aerodrome.icao}
                </span>
                <span className="text-xs text-muted-foreground">{t(`aerodrome.role.${aerodrome.role}`)}</span>
                <Badge variant={checkStatusVariant(distances.status)} className="ml-auto">
                  {checkStatusLabel(distances.status)}
                </Badge>
              </div>
              {distances.dataMissing ? (
                <p className="text-sm text-muted-foreground">{t("distances.notEntered")}</p>
              ) : suggested ? (
                <>
                  <p className="text-sm">{t("distances.runway", { designator: suggested.designator })}</p>
                  <p className="text-sm tabular-nums">{text(distances, suggested)}</p>
                  {suggested.marginM != null && (
                    <p className={cn("text-sm tabular-nums", suggested.marginM < 0 && "font-semibold text-destructive")}>{t("distances.margin", { value: metres(suggested.marginM) })}</p>
                  )}
                  <DistanceConditionsLine distances={distances} />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("distances.noRunway")}</p>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t("distances.hint")}</p>
    </div>
  )
}
