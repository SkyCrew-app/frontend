"use client"

import { useId, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { PlanLimit } from "@/lib/plan"

interface PlanLimitButtonProps {
  limit: PlanLimit
  /** The places of the plan when they are all used (see reachedLimit), null while there is room. */
  reached: number | null
  onClick: () => void
  children: ReactNode
}

/**
 * The button that adds an aircraft or a member. Once the plan's places are all used it stays in
 * view, unavailable, and says why; the API refuses one too many anyway.
 */
export function PlanLimitButton({ limit, reached, onClick, children }: PlanLimitButtonProps) {
  const { t } = useTranslation("common")
  const hintId = useId()
  if (reached === null) return <Button onClick={onClick}>{children}</Button>

  const hint = t(`plan.limit.${limit}`, { count: reached })
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* aria-disabled rather than disabled: the button stays focusable, so the reason can be read. */}
          <Button aria-disabled="true" aria-describedby={hintId} className="cursor-not-allowed opacity-50">
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{hint}</TooltipContent>
      </Tooltip>
      <span id={hintId} className="sr-only">
        {hint}
      </span>
    </TooltipProvider>
  )
}
