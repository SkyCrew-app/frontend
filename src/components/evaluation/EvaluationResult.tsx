"use client"

import { CheckCircle2, RotateCcw, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface EvaluationResultProps {
  score: number
  passed: boolean
  passScore: number
  onRetry: () => void
  onContinue: () => void
}

// What the member sees once the answers are sent: passed or not, the score, what to do next.
export function EvaluationResult({ score, passed, passScore, onRetry, onContinue }: EvaluationResultProps) {
  const { t } = useTranslation("instruction")
  const rounded = Math.round(score)
  const Icon = passed ? CheckCircle2 : XCircle

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:p-10" role="status">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{passed ? t("evaluations.result.passedTitle") : t("evaluations.result.failedTitle")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {passed
              ? t("evaluations.result.passedDescription")
              : t("evaluations.result.failedDescription")}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <p className="text-3xl font-semibold tabular-nums">{t("shared.percent", { value: rounded })}</p>
          <Progress
            value={Math.min(100, Math.max(0, rounded))}
            className="h-2"
            aria-label={t("evaluations.result.scoreAria", { score: rounded })}
          />
          <p className="text-xs tabular-nums text-muted-foreground">
            {t("shared.requiredScore", { score: t("shared.percent", { value: Math.round(passScore) }) })}
          </p>
        </div>

        <div className="flex w-full flex-col-reverse justify-center gap-2 sm:w-auto sm:flex-row">
          {passed ? (
            <Button onClick={onContinue}>{t("evaluations.result.viewAll")}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onContinue}>
                {t("evaluations.result.viewAll")}
              </Button>
              <Button onClick={onRetry}>
                <RotateCcw className="h-4 w-4" />
                {t("common:actions.retry")}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
