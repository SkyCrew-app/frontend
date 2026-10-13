"use client"

import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface QuestionStepperProps {
  currentQuestion: number
  // One entry per question, in order: true once it has an answer.
  answered: boolean[]
  onNavigate: (index: number) => void
}

// The numbered buttons above a question: where the member is, what is answered, what is left.
export function QuestionStepper({ currentQuestion, answered, onNavigate }: QuestionStepperProps) {
  const { t } = useTranslation("instruction")
  const answeredCount = answered.filter(Boolean).length

  return (
    <nav aria-label={t("evaluations.stepper.navAria")} className="space-y-3">
      <ol className="flex flex-wrap gap-2">
        {answered.map((isAnswered, index) => {
          const isCurrent = index === currentQuestion
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => onNavigate(index)}
                aria-current={isCurrent ? "step" : undefined}
                aria-label={t(isAnswered ? "evaluations.stepper.answeredAria" : "evaluations.stepper.unansweredAria", {
                  number: index + 1,
                })}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium tabular-nums transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isAnswered
                      ? "border-transparent bg-success/15 text-success hover:bg-success/25"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
              >
                {index + 1}
              </button>
            </li>
          )
        })}
      </ol>
      <p className="text-xs tabular-nums text-muted-foreground">
        {t("evaluations.stepper.summary", { answered: answeredCount, total: answered.length })}
      </p>
    </nav>
  )
}
