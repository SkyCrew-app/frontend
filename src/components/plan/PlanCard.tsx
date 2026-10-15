"use client"

import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePlan } from "@/components/hooks/usePlan"
import { isFull, planIncludes, usage } from "@/lib/plan"

/** The plan of the club for its administrators: what it includes and how much of it is used. */
export function PlanCard() {
  const { t } = useTranslation("common")
  const { plan } = usePlan({ fresh: true })
  // Nothing to say until the API has answered.
  if (!plan) return null

  const limits = [
    { key: "aircraft", label: t("plan.card.aircraft"), used: plan.aircraftInService, max: plan.maxAircraft },
    { key: "members", label: t("plan.card.members"), used: plan.activeMembers, max: plan.maxMembers },
  ]
  const instruction = planIncludes(plan, "INSTRUCTION")
  const anyFull = limits.some((limit) => isFull(limit.used, limit.max))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{t("plan.card.title")}</CardTitle>
          <CardDescription>{t("plan.card.description")}</CardDescription>
        </div>
        <Badge variant="info" className="shrink-0">
          {t(`plan.name.${plan.plan}`)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-4 sm:grid-cols-3">
          {limits.map((limit) => (
            <div key={limit.key} className="space-y-1">
              <dt className="text-sm text-muted-foreground">{limit.label}</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span className="text-xl font-semibold tabular-nums">{usage(limit.used, limit.max)}</span>
                {limit.max === null ? (
                  <span className="text-sm text-muted-foreground">{t("plan.card.unlimited")}</span>
                ) : (
                  isFull(limit.used, limit.max) && <Badge variant="warning">{t("plan.card.full")}</Badge>
                )}
              </dd>
            </div>
          ))}
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">{t("plan.card.instruction")}</dt>
            <dd>
              <Badge variant={instruction ? "success" : "neutral"}>
                {instruction ? t("plan.card.included") : t("plan.card.notIncluded")}
              </Badge>
            </dd>
          </div>
        </dl>
        {anyFull && <p className="text-sm">{t("plan.card.fullHint")}</p>}
        <p className="text-sm text-muted-foreground">{t("plan.card.change")}</p>
      </CardContent>
    </Card>
  )
}
