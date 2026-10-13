import { Check } from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface StepIndicatorProps {
  steps: string[]
  current: number
  /** Only called for a step already passed: going forward goes through the checks of each step. */
  onStepClick: (index: number) => void
  className?: string
}

/** Numbered pills of a form in steps, same look as the steps of a SidePanel. */
export function StepIndicator({ steps, current, onStepClick, className }: StepIndicatorProps) {
  const { t } = useTranslation("flights")
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label={t("common:panel.steps")}>
      {steps.map((title, index) => {
        const done = index < current
        const active = index === current
        const last = index === steps.length - 1
        return (
          <li key={title} className={cn("flex items-center gap-2", !last && "flex-1")}>
            <button
              type="button"
              disabled={index > current}
              onClick={() => onStepClick(index)}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 items-center gap-2 rounded-md text-left text-sm disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                  active && "bg-primary text-primary-foreground",
                  done && "bg-success/15 text-success",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn("truncate", active ? "font-medium text-foreground" : "hidden text-muted-foreground sm:inline")}
              >
                {title}
              </span>
            </button>
            {!last && <span className="h-px min-w-3 flex-1 bg-border" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}
