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
          : "hover:bg-accent"
      }`}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseUp={onMouseUp}
    >
      <div className="p-2 h-full flex items-center justify-center text-sm">
        <span className={isSelected ? "text-primary-foreground" : "text-muted-foreground/60"}>Libre</span>
      </div>
    </TableCell>
  )
}

