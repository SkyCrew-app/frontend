"use client"

import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { checkStatusLabel, checkStatusVariant } from "@/lib/navplan/status"
import type { FlightPlanningSettings, FuelPlan, ReserveCase } from "@/lib/navplan/types"
import { formatLitres, formatMinutes } from "@/lib/navplan/units"
import { formatDecimal } from "@/lib/format"
import { cn } from "@/lib/utils"

interface FuelSummaryProps {
  fuel: FuelPlan
  reserveCase: ReserveCase
  settings?: FlightPlanningSettings | null
}

/**
 * The fuel balance of design § 2.6: what the rule requires at the block, what is on board, and
 * what is left on landing — with the rule applied written in full.
 */
export function FuelSummary({ fuel, reserveCase, settings }: FuelSummaryProps) {
  const { t } = useTranslation("navplan")
  const contingencyRule = settings
    ? t("fuel.contingencyRule", {
        percent: formatDecimal(settings.contingencyPercent, 1),
        litres: formatLitres(settings.contingencyMinL),
      })
    : null

  const required = [
    { key: "taxi", label: t("fuel.taxi"), value: fuel.taxiL },
    { key: "trip", label: t("fuel.trip"), value: fuel.tripL },
    { key: "contingency", label: t("fuel.contingency"), value: fuel.contingencyL, note: contingencyRule },
    { key: "alternate", label: t("fuel.alternate"), value: fuel.alternateL },
    {
      key: "reserve",
      label: t("fuel.finalReserve", { minutes: fuel.finalReserveMin }),
      value: fuel.finalReserveL,
      note: t(`fuel.reserveRule.${reserveCase}`, { minutes: fuel.finalReserveMin }),
    },
    {
      key: "margin",
      label: t("fuel.clubMargin"),
      value: fuel.clubMarginL,
      note: settings ? t("fuel.clubMarginRule", { minutes: settings.clubMarginMin }) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("fuel.intro")}</p>
        <Badge variant={checkStatusVariant(fuel.status)}>{checkStatusLabel(fuel.status)}</Badge>
      </div>

      {fuel.messages.length > 0 && (
        <ul
          className={cn(
            "list-disc space-y-1 rounded-lg border p-3 pl-7 text-sm",
            fuel.status === "BLOCKING" ? "border-destructive/50 bg-destructive/10" : "border-warning/50 bg-warning/10",
          )}
        >
          {fuel.messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      <dl className="divide-y rounded-lg border text-sm">
        {required.map((line) => (
          <div key={line.key} className="flex items-start justify-between gap-4 px-3 py-2">
            <dt className="min-w-0">
              {line.label}
              {line.note && <span className="block text-xs text-muted-foreground">{line.note}</span>}
            </dt>
            <dd className="shrink-0 tabular-nums">{formatLitres(line.value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 bg-muted/50 px-3 py-2 font-semibold">
          <dt>{t("fuel.minimumBlock")}</dt>
          <dd className="tabular-nums">{formatLitres(fuel.minimumBlockL)}</dd>
        </div>
        <div className="flex justify-between gap-4 px-3 py-2">
          <dt>{t("fuel.loaded")}</dt>
          <dd className="tabular-nums">
            {formatLitres(fuel.loadedL)}
            <span className="ml-1 text-xs text-muted-foreground">{t("fuel.usableOf", { usable: formatLitres(fuel.usableL) })}</span>
          </dd>
        </div>
        <div className={cn("flex justify-between gap-4 px-3 py-2", fuel.extraL < 0 && "text-destructive")}>
          <dt>{fuel.extraL < 0 ? t("fuel.missing") : t("fuel.extra")}</dt>
          <dd className="font-medium tabular-nums">{formatLitres(Math.abs(fuel.extraL))}</dd>
        </div>
        <div className={cn("flex justify-between gap-4 px-3 py-2", fuel.landingL < fuel.finalReserveL && "text-destructive")}>
          <dt>{t("fuel.landing")}</dt>
          <dd className="font-medium tabular-nums">{formatLitres(fuel.landingL)}</dd>
        </div>
        {fuel.landingAtAlternateL !== null && fuel.landingAtAlternateL !== undefined && (
          <div className="flex justify-between gap-4 px-3 py-2">
            <dt>{t("fuel.landingAtAlternate")}</dt>
            <dd className="tabular-nums">{formatLitres(fuel.landingAtAlternateL)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 px-3 py-2">
          <dt>{t("fuel.endurance")}</dt>
          <dd className="tabular-nums">{formatMinutes(fuel.enduranceMin)}</dd>
        </div>
      </dl>

      <p className="text-xs text-muted-foreground">{t("fuel.regulation")}</p>
    </div>
  )
}
