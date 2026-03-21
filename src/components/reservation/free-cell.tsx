"use client"

import { TableCell } from "@/components/ui/table"

interface FreeCellProps {
  isSelected: boolean
  onMouseDown: () => void
  onMouseEnter: () => void
  onMouseUp: () => void
}

export function FreeCell({ isSelected, onMouseDown, onMouseEnter, onMouseUp }: FreeCellProps) {
  return (
    <TableCell
      className={`text-center p-0 cursor-pointer select-none transition-colors ${
        isSelected
          ? "bg-primary hover:bg-primary/90"
          : "bg-muted/30 hover:bg-muted/50 dark:bg-muted/20 dark:hover:bg-muted/40"
      }`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
    >
      <div className="p-2 h-full flex items-center justify-center text-sm">
        <span className={isSelected ? "text-white" : "text-muted-foreground"}>Libre</span>
      </div>
    </TableCell>
  )
}

