"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ListPagerProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** Total number of items and their name, e.g. 42 and ["vol", "vols"]. */
  total?: number
  noun?: [string, string]
}

/** Previous / next pager shown under a paginated list; renders nothing for a single page. */
export function ListPager({ page, pageCount, onPageChange, total, noun }: ListPagerProps) {
  if (pageCount <= 1) return null

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        Page {page} sur {pageCount}
        {total !== undefined && noun && ` · ${total} ${total > 1 ? noun[1] : noun[0]}`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount}>
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
