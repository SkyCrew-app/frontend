"use client"

import { ReactNode, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

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
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-4 py-3 text-left font-semibold transition-colors",
            isComplete
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-muted hover:bg-muted/80",
          )}
        >
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
            <span>{category}</span>
          </div>
          <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
            {checkedCount}/{totalCount}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
