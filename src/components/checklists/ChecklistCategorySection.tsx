"use client"

import { ReactNode, useState } from "react"
import { CheckCircle2, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface ChecklistCategorySectionProps {
  category: string
  children: ReactNode
  checkedCount: number
  totalCount: number
  defaultOpen?: boolean
}

export function ChecklistCategorySection({
  category,
  children,
  checkedCount,
  totalCount,
  defaultOpen = true,
}: ChecklistCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isComplete = checkedCount === totalCount && totalCount > 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-left transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex min-w-0 items-center gap-2">
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}
              aria-hidden="true"
            />
            <span className="truncate font-semibold">{category}</span>
          </span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-sm tabular-nums",
              isComplete ? "font-medium text-success" : "text-muted-foreground",
            )}
          >
            {isComplete && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            {checkedCount} / {totalCount}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}
