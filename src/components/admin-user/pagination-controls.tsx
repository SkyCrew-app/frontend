"use client"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationControlsProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  /** Plural noun shown after the total, e.g. "membres". */
  itemLabel?: string
}

export function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemLabel = "membres",
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (totalItems === 0) return null

  const first = (currentPage - 1) * itemsPerPage + 1
  const last = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm tabular-nums text-muted-foreground">
        {first}–{last} sur {totalItems} {itemLabel}
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Pagination">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="px-1 text-sm tabular-nums text-muted-foreground">
            Page {currentPage} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  )
}
