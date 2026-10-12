"use client"

import { Plus } from "lucide-react"
import { TableCell } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface FreeCellProps {
  /** Spoken and hover label, e.g. "Réserver F-ABCD à 09:00". */
  label: string
  isSelected: boolean
  isCurrentHour?: boolean
  onMouseDown: () => void
  onMouseEnter: () => void
  /** Keyboard equivalent of a click on the slot. */
  onActivate: () => void
}

export function FreeCell({
  label,
  isSelected,
  isCurrentHour = false,
  onMouseDown,
  onMouseEnter,
  onActivate,
}: FreeCellProps) {
  return (
    <TableCell
      tabIndex={0}
      aria-label={label}
      title={label}
      className={cn(
        "group h-12 cursor-pointer select-none border-l border-border/50 p-0 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        isSelected ? "bg-primary/80 text-primary-foreground" : "hover:bg-primary/10",
        !isSelected && isCurrentHour && "bg-primary/5",
      )}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onActivate()
        }
      }}
    >
      <Plus
        className={cn(
          "mx-auto h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
          isSelected && "hidden",
        )}
        aria-hidden="true"
      />
    </TableCell>
  )
}
