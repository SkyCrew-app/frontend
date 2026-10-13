"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ClipboardCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { learningRoutes } from "@/lib/learning-navigation"
import type { EvaluationAttempt } from "@/lib/learning-progress"
import { SectionCard } from "./section-card"

export interface EvaluationToTake {
  id: number
  pass_score: number
  module?: { id: number; title: string } | null
}

interface EvaluationsCardProps {
  evaluations: EvaluationToTake[]
  latestAttempts: ReadonlyMap<number, EvaluationAttempt>
  error?: boolean
  onRetry?: () => void
}

export function EvaluationsCard({ evaluations, latestAttempts, error = false, onRetry }: EvaluationsCardProps) {
  const { t } = useTranslation("instruction")
  const shown = evaluations.slice(0, 4)

  return (
    <SectionCard
      title={t("home.evaluations.title")}
      description={t("home.evaluations.description")}
      href={learningRoutes.evaluations}
      linkLabel={t("home.evaluations.link")}
    >
      {error ? (
        <ErrorState onRetry={onRetry} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={t("home.evaluations.emptyTitle")}
          description={t("home.evaluations.emptyDescription")}
        />
      ) : (
        <ul className="divide-y">
          {shown.map((evaluation) => {
            const failed = latestAttempts.has(Number(evaluation.id))
            return (
              <li key={evaluation.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{evaluation.module?.title ?? t("shared.evaluationFallback")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("shared.requiredScore", {
                      score: t("shared.percent", { value: Math.round(evaluation.pass_score) }),
                    })}
                  </p>
                </div>
                {failed && <Badge variant="warning">{t("shared.toRetake")}</Badge>}
                <Button variant="outline" size="sm" asChild>
                  <Link href={learningRoutes.evaluation(evaluation.id)}>{failed ? t("shared.retake") : t("shared.take")}</Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {evaluations.length > shown.length && (
        <p className="mt-3 px-2 text-xs text-muted-foreground">
          {t("home.evaluations.more", { count: evaluations.length - shown.length })}
        </p>
      )}
    </SectionCard>
  )
}
