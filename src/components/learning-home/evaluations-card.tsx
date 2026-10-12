import Link from "next/link"
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
  const shown = evaluations.slice(0, 4)

  return (
    <SectionCard
      title="Évaluations à passer"
      description="Les évaluations que vous n'avez pas encore réussies."
      href={learningRoutes.evaluations}
      linkLabel="Mes évaluations"
    >
      {error ? (
        <ErrorState onRetry={onRetry} />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucune évaluation à passer"
          description="Vous êtes à jour : toutes les évaluations disponibles sont réussies."
        />
      ) : (
        <ul className="divide-y">
          {shown.map((evaluation) => {
            const failed = latestAttempts.has(Number(evaluation.id))
            return (
              <li key={evaluation.id} className="flex flex-wrap items-center gap-3 px-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{evaluation.module?.title ?? "Évaluation"}</p>
                  <p className="text-sm text-muted-foreground">Score requis : {Math.round(evaluation.pass_score)} %</p>
                </div>
                {failed && <Badge variant="warning">À repasser</Badge>}
                <Button variant="outline" size="sm" asChild>
                  <Link href={learningRoutes.evaluation(evaluation.id)}>{failed ? "Repasser" : "Passer"}</Link>
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {evaluations.length > shown.length && (
        <p className="mt-3 px-2 text-xs text-muted-foreground">
          Et {evaluations.length - shown.length} autre{evaluations.length - shown.length > 1 ? "s" : ""}.
        </p>
      )}
    </SectionCard>
  )
}
