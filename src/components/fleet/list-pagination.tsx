import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ListPaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  /** Plural noun of what is listed, e.g. "maintenances". */
  itemsLabel?: string
}

/** Footer of a paginated list: range shown, then previous / next. */
export function ListPagination({ page, pageSize, totalItems, onPageChange, itemsLabel }: ListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground tabular-nums">
        {first}–{last} sur {totalItems}
        {itemsLabel ? ` ${itemsLabel}` : ""}
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Pagination">
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} sur {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Suivant
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  )
}
