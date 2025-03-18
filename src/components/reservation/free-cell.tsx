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
          ? "bg-teal-400 hover:bg-teal-500"
          : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
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

