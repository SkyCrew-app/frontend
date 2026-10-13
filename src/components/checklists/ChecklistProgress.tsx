"use client"

import { Trans, useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

interface ChecklistProgressProps {
  checked: number
  total: number
  /** Number of mandatory items; the line about them is hidden when 0. */
  required?: number
  checkedRequired?: number
  className?: string
}

// Progress is not a verdict: one neutral colour, green only once everything is checked.
export function ChecklistProgress({ checked, total, required = 0, checkedRequired, className }: ChecklistProgressProps) {
  const { t } = useTranslation("checklists")
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0
  const done = total > 0 && checked >= total

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          <Trans
            t={t}
            i18nKey="progress.checked"
            count={total}
            values={{ checked, total }}
            components={{ figures: <span className="font-medium tabular-nums text-foreground" /> }}
          />
        </span>
        <span className={cn("font-medium tabular-nums", done ? "text-success" : "text-foreground")}>
          {t("progress.percentage", { value: percentage })}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label={t("progress.ariaLabel")}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300 ease-out", done ? "bg-success" : "bg-primary")}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {required > 0 && checkedRequired !== undefined && checkedRequired < required && (
        <p className="text-xs text-muted-foreground">
          {t("progress.requiredRemaining", { count: required - checkedRequired })}
        </p>
      )}
    </div>
  )
}
