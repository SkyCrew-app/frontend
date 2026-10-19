"use client"

import { useTranslation } from "react-i18next"
import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { airspaceTypeLabel, checkStatusVariant } from "@/lib/navplan/status"
import type { AirspaceCrossing, CheckStatus, Leg, Notice, UnverifiedAirspace } from "@/lib/navplan/types"
import { formatFt, formatNm } from "@/lib/navplan/units"

export const SOFIA_BRIEFING_URL = "https://sofia-briefing.aviation-civile.gouv.fr"
export const SIA_URL = "https://www.sia.aviation-civile.gouv.fr"

const crossed = (crossing: AirspaceCrossing) => crossing.relation !== "ABOVE" && crossing.relation !== "BELOW"

/** The API had no airspace to check the route against (aerodromes only, before an SIA import). */
export const airspacesNotChecked = (notices: Pick<Notice, "code">[] = []) =>
  notices.some((notice) => notice.code === "NAVDATA_NO_AIRSPACE")

/**
 * Worst status of the crossings of a plan; an unknown activity is never "OK" (design § 2.7),
 * and neither is a route that could not be checked at all, or one near an area without outline.
 */
export function crossingsStatus(legs: Leg[], notChecked = false, unverified: UnverifiedAirspace[] = []): CheckStatus {
  if (notChecked) return "WARNING"
  const all = legs.flatMap((leg) => leg.crossings).filter(crossed)
  if (all.some((crossing) => crossing.status === "BLOCKING")) return "BLOCKING"
  if (all.some((crossing) => crossing.status === "WARNING" || !crossing.activityKnown) || unverified.length > 0) return "WARNING"
  return "OK"
}

const SHOWN_RADIOS = 3

const RANK: Record<CheckStatus, number> = { OK: 0, WARNING: 1, BLOCKING: 2 }

/**
 * The airspaces the route goes through (not over or under them), once each with the crossing of
 * worst status, in route order: what the map highlights and the summary lists.
 */
export function crossedAirspaces(legs: Leg[]): AirspaceCrossing[] {
  const worst = new Map<string, AirspaceCrossing>()
  for (const crossing of legs.flatMap((leg) => leg.crossings).filter(crossed)) {
    const known = worst.get(crossing.airspace.id)
    if (!known || RANK[crossing.status] > RANK[known.status]) worst.set(crossing.airspace.id, crossing)
  }
  return [...worst.values()]
}

/** Worst status of each crossed airspace, by id: the map draws them over the others. */
export const crossedAirspaceStatuses = (legs: Leg[]): Record<string, CheckStatus> =>
  Object.fromEntries(crossedAirspaces(legs).map((crossing) => [crossing.airspace.id, crossing.status]))

/** Areas near the route that the API could not check: the SIA publishes no outline for them. */
function UnverifiedList({ items }: { items: UnverifiedAirspace[] }) {
  const { t } = useTranslation("navplan")
  return (
    <section className="space-y-2 rounded-lg border border-warning/50 p-3" aria-label={t("crossings.unverifiedTitle")}>
      <h3 className="text-sm font-semibold">{t("crossings.unverifiedTitle")}</h3>
      <p className="text-xs text-muted-foreground">{t("crossings.unverifiedDescription")}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.airspace.id} className="text-sm">
            <p>{item.message}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {airspaceTypeLabel(item.airspace.type)}
              {" · "}
              {t("crossings.limits", { ceiling: item.airspace.ceiling.label, floor: item.airspace.floor.label })}
              {" · "}
              {item.distanceNm == null ? t("crossings.unverifiedUnlocated") : t("crossings.unverifiedDistance", { distance: formatNm(item.distanceNm) })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CrossingItem({ crossing }: { crossing: AirspaceCrossing }) {
  const { t } = useTranslation("navplan")
  const { airspace } = crossing
  const unknownActivity = !crossing.activityKnown
  // The TMA PARIS list fifteen sectors of PARIS Contrôle: the first ones, then how many more.
  const radios = [...new Set(airspace.frequencies.map((frequency) => [frequency.callsign ?? frequency.service, frequency.mhz].join(" ")))]
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
      {radios.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {radios.slice(0, SHOWN_RADIOS).join(" · ")}
          {radios.length > SHOWN_RADIOS && ` ${t("crossings.moreRadios", { count: radios.length - SHOWN_RADIOS })}`}
        </p>
      )}
      {/* The SIA writes the activity on several lines, French then English. */}
      {airspace.activity && <p className="whitespace-pre-line text-xs text-muted-foreground">{t("crossings.activity", { value: airspace.activity })}</p>}
    </li>
  )
}

/** Airspaces met leg by leg: what each one requires, and where to check its activity. */
export function AirspaceCrossings({
  legs,
  alternateLeg,
  notChecked = false,
  unverified = [],
}: {
  legs: Leg[]
  alternateLeg?: Leg | null
  /** No airspace data: say the route was not checked, never "no area crossed". */
  notChecked?: boolean
  /** Areas near the route without a published outline. */
  unverified?: UnverifiedAirspace[]
}) {
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

      {!notChecked && unverified.length > 0 && <UnverifiedList items={unverified} />}

      {notChecked ? (
        <div className="space-y-1 text-sm" role="note">
          <p className="font-medium">{t("crossings.notCheckedTitle")}</p>
          <p className="text-muted-foreground">{t("crossings.notCheckedDescription")}</p>
        </div>
      ) : total === 0 ? (
        unverified.length === 0 && <p className="text-sm text-muted-foreground">{t("crossings.none")}</p>
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
