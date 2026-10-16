"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Info, Loader2, OctagonAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { checkStatusLabel, checkStatusVariant, massBalanceComputed } from "@/lib/navplan/status"
import type { CheckStatus, FlightPlanResult, Notice } from "@/lib/navplan/types"
import { formatLitres, formatMinutes, formatNm } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"

const STATUS_DOT: Record<CheckStatus, string> = {
  OK: "bg-success",
  WARNING: "bg-warning",
  BLOCKING: "bg-destructive",
}

const rank = (status: CheckStatus) => (status === "BLOCKING" ? 2 : status === "WARNING" ? 1 : 0)

/** A point to check before departure: from the API's notices, or said by the builder itself. */
export interface Check {
  key: string
  status: CheckStatus
  message: string
}

export const checksFromNotices = (notices: Notice[]): Check[] =>
  notices
    // The disclaimer is written by every screen itself (PreparationDisclaimer).
    .filter((notice) => notice.code !== "DISCLAIMER")
    .map((notice) => ({ key: `${notice.code}-${notice.message}`, status: notice.status, message: notice.message }))

// Shown before "see all": the worst point, never hiding a blocking one.
const SHOWN_CHECKS = 1

function Figure({ label, value, detail, status }: { label: string; value: string; detail?: string; status?: CheckStatus }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status && <span className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[status])} aria-hidden="true" />}
        {label}
      </dt>
      <dd className={cn("text-base font-semibold tabular-nums", status === "BLOCKING" && "text-destructive")}>
        {value}
        {detail && <span className="ml-1 text-xs font-normal text-muted-foreground">{detail}</span>}
        {status && <span className="sr-only"> ({checkStatusLabel(status)})</span>}
      </dd>
    </div>
  )
}

/**
 * What the pilot needs at a glance on every step: the verdict, distance, flight time, fuel needed
 * against fuel on board, mass and balance, and the points to check — kept short.
 */
export function PlanSummary({ result, pending = false, checks }: { result: FlightPlanResult; pending?: boolean; checks: Check[] }) {
  const { t } = useTranslation("navplan")
  const mbComputed = massBalanceComputed(result.massBalance)
  return (
    <section className="rounded-xl border bg-card px-4 py-3" aria-labelledby="plan-summary-title" aria-busy={pending}>
      <h2 id="plan-summary-title" className="sr-only">
        {t("summary.title")}
      </h2>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant={checkStatusVariant(result.status)} className="whitespace-nowrap">
            {t("results.overall", { status: checkStatusLabel(result.status) })}
          </Badge>
          {pending && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {t("results.updating")}
            </span>
          )}
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Figure label={t("results.distance")} value={formatNm(result.totalDistanceNm)} />
          <Figure label={t("results.time")} value={formatMinutes(result.totalTimeMin)} />
          <Figure
            label={t("summary.fuel")}
            value={formatLitres(result.fuel.minimumBlockL, 0)}
            detail={t("summary.fuelOnBoard", { litres: formatLitres(result.fuel.loadedL, 0) })}
            status={result.fuel.status}
          />
          <Figure
            label={t("results.massBalance")}
            value={!mbComputed ? t("massBalance.notComputedShort") : result.massBalance.status === "BLOCKING" ? t("massBalance.outside") : t("massBalance.within")}
            status={result.massBalance.status}
          />
        </dl>
      </div>
      <ChecksList checks={checks} />
    </section>
  )
}

/** The points to check, worst first: the first ones, then the rest on demand. */
export function ChecksList({ checks }: { checks: Check[] }) {
  const { t } = useTranslation("navplan")
  const [expanded, setExpanded] = useState(false)
  if (checks.length === 0) return null
  const sorted = [...checks].sort((a, b) => rank(b.status) - rank(a.status))
  // Folded: the worst point only (every blocking one), on one line each.
  const always = Math.max(SHOWN_CHECKS, sorted.filter((check) => check.status === "BLOCKING").length)
  const shown = expanded ? sorted : sorted.slice(0, always)
  return (
    <div className="mt-3 flex flex-col gap-1 border-t pt-2 sm:flex-row sm:items-start sm:gap-3">
      <ul className="min-w-0 flex-1 space-y-1 text-sm" id="plan-checks" aria-label={t("summary.checksTitle", { count: sorted.length })}>
        {shown.map((check) => {
          const Icon = check.status === "BLOCKING" ? OctagonAlert : check.status === "WARNING" ? AlertTriangle : Info
          return (
            <li key={check.key} className={cn("flex items-start gap-2", check.status === "BLOCKING" && "font-medium text-destructive")}>
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", check.status === "WARNING" ? "text-warning" : check.status === "OK" ? "text-muted-foreground" : "")}
                aria-hidden="true"
              />
              <span className={cn("min-w-0", !expanded && "sm:truncate")}>
                <span className="sr-only">{t("summary.statusPrefix", { status: checkStatusLabel(check.status) })} </span>
                {check.message}
              </span>
            </li>
          )
        })}
      </ul>
      {sorted.length > always && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto shrink-0 self-start px-0 py-0.5 text-xs"
          aria-controls="plan-checks"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? t("summary.showFewer") : t("summary.showAll", { count: sorted.length })}
        </Button>
      )}
    </div>
  )
}
