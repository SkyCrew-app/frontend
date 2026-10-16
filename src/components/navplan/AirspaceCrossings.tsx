"use client"

import { useTranslation } from "react-i18next"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { airspaceTypeLabel, checkStatusVariant } from "@/lib/navplan/status"
import type { AirspaceCrossing, CheckStatus, Leg } from "@/lib/navplan/types"
import { formatFt, formatNm } from "@/lib/navplan/units"

export const SOFIA_BRIEFING_URL = "https://sofia-briefing.aviation-civile.gouv.fr"
export const SIA_URL = "https://www.sia.aviation-civile.gouv.fr"

const crossed = (crossing: AirspaceCrossing) => crossing.relation !== "ABOVE" && crossing.relation !== "BELOW"

/** Worst status of the crossings of a plan; an unknown activity is never "OK" (design § 2.7). */
export function crossingsStatus(legs: Leg[]): CheckStatus {
  const all = legs.flatMap((leg) => leg.crossings).filter(crossed)
  if (all.some((crossing) => crossing.status === "BLOCKING")) return "BLOCKING"
  if (all.some((crossing) => crossing.status === "WARNING" || !crossing.activityKnown)) return "WARNING"
  return "OK"
}

function CrossingItem({ crossing }: { crossing: AirspaceCrossing }) {
  const { t } = useTranslation("navplan")
  const { airspace } = crossing
  const unknownActivity = !crossing.activityKnown
  return (
    <li className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{airspace.name}</p>
        <Badge variant="outline">
          {airspaceTypeLabel(airspace.type)}
          {airspace.icaoClass ? ` · ${t("crossings.class", { value: airspace.icaoClass })}` : ""}
        </Badge>
        <Badge variant={checkStatusVariant(crossing.status)} className="ml-auto">
          {unknownActivity && crossing.status !== "BLOCKING" ? t("crossings.activityUnknown") : t(`crossings.relation.${crossing.relation}`)}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {t("crossings.limits", { ceiling: airspace.ceiling.label, floor: airspace.floor.label })}
        {" · "}
        {t("crossings.span", { entry: formatNm(crossing.entryNm), exit: formatNm(crossing.exitNm) })}
        {" · "}
        {t("crossings.aircraftAltitude", {
          min: formatFt(crossing.aircraftMinAltFt),
          max: formatFt(crossing.aircraftMaxAltFt),
        })}
      </p>
      <p className="text-sm">{crossing.requirement}</p>
      {airspace.frequencies.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {airspace.frequencies.map((frequency) => [frequency.callsign ?? frequency.service, frequency.mhz].join(" ")).join(" · ")}
        </p>
      )}
      {airspace.activity && <p className="text-xs text-muted-foreground">{t("crossings.activity", { value: airspace.activity })}</p>}
    </li>
  )
}

/** Airspaces met leg by leg: what each one requires, and where to check its activity. */
export function AirspaceCrossings({ legs, alternateLeg }: { legs: Leg[]; alternateLeg?: Leg | null }) {
  const { t } = useTranslation("navplan")
  const all = alternateLeg ? [...legs, alternateLeg] : legs
  const total = all.reduce((count, leg) => count + leg.crossings.filter(crossed).length, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
        <p className="font-medium">{t("crossings.checkNotam")}</p>
        <p className="mt-1 text-muted-foreground">{t("crossings.unknownIsNotInactive")}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <a className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline" href={SOFIA_BRIEFING_URL} target="_blank" rel="noopener noreferrer">
            {t("crossings.sofia")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t("crossings.newWindow")}</span>
          </a>
          <a className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline" href={SIA_URL} target="_blank" rel="noopener noreferrer">
            {t("crossings.sia")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t("crossings.newWindow")}</span>
          </a>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{t("crossings.none")}</p>
      ) : (
        all.map((leg, position) => {
          const items = leg.crossings.filter(crossed)
          if (items.length === 0) return null
          const isAlternate = position === legs.length
          return (
            <section key={`${isAlternate ? "alt" : "leg"}-${leg.index}`} className="space-y-2" aria-label={`${leg.from.ident} → ${leg.to.ident}`}>
              <h3 className="text-sm font-semibold">
                {isAlternate ? `${t("log.alternate")} ` : ""}
                {leg.from.ident} → {leg.to.ident}
              </h3>
              <ul className="space-y-2">
                {items.map((crossing) => (
                  <CrossingItem key={`${crossing.airspace.id}-${crossing.entryNm}`} crossing={crossing} />
                ))}
              </ul>
            </section>
          )
        })
      )}

      {all.some((leg) => leg.crossings.some((crossing) => !crossed(crossing))) && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">{t("crossings.overUnder")}</summary>
          <ul className="mt-2 space-y-1 pl-4">
            {all.flatMap((leg) =>
              leg.crossings
                .filter((crossing) => !crossed(crossing))
                .map((crossing) => (
                  <li key={`${leg.index}-${crossing.airspace.id}-${crossing.entryNm}`} className="text-xs text-muted-foreground">
                    {leg.from.ident} → {leg.to.ident} : {crossing.airspace.name} ({t(`crossings.relation.${crossing.relation}`)},{" "}
                    {t("crossings.limits", { ceiling: crossing.airspace.ceiling.label, floor: crossing.airspace.floor.label })})
                  </li>
                )),
            )}
          </ul>
        </details>
      )}
    </div>
  )
}
