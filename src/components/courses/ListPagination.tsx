"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

interface ListPaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
}

// Previous / next under a long list. Renders nothing while everything fits on one page.
export function ListPagination({ page, pageCount, onPageChange }: ListPaginationProps) {
  const { t } = useTranslation("instruction")
  if (pageCount <= 1) return null

  return (
    <nav className="flex items-center justify-end gap-2" aria-label={t("courses.pagination.label")}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={t("common:pagination.previousPage")}
      >
        <ChevronLeft className="h-4 w-4" />
        {t("common:pagination.previous")}
      </Button>
      <span className="px-2 text-sm tabular-nums text-muted-foreground">
        {t("common:pagination.pageOf", { page, total: pageCount })}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label={t("common:pagination.nextPage")}
      >
        {t("common:pagination.next")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  )
}

// The slice of `items` shown on `page`, and the number of pages.
export function paginate<T>(items: T[], page: number, pageSize: number): { rows: T[]; pageCount: number; page: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  return { rows: items.slice((current - 1) * pageSize, current * pageSize), pageCount, page: current }
}
