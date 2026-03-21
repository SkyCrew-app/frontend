"use client"

import { cn } from "@/lib/utils"

interface ChecklistProgressProps {
  checked: number
  total: number
  required: number
  checkedRequired?: number
}

export function ChecklistProgress({ checked, total, required, checkedRequired }: ChecklistProgressProps) {
  const percentage = total > 0 ? Math.round((checked / total) * 100) : 0

  const getColor = () => {
    if (percentage === 100) return "bg-green-500"
    if (percentage >= 50) return "bg-orange-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Progression : {checked}/{total} items
        </span>
        <span
          className={cn(
            "font-semibold",
            percentage === 100 ? "text-green-600" : percentage >= 50 ? "text-orange-600" : "text-red-600",
          )}
        >
          {percentage}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full transition-all duration-500 ease-out rounded-full", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {required > 0 && checkedRequired !== undefined && (
        <p className="text-xs text-muted-foreground">
          Obligatoires : {checkedRequired}/{required}
        </p>
      )}
    </div>
  )
}
