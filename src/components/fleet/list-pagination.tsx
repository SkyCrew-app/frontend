import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ListPaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  /** Noun of what is listed, already translated and in the right number, e.g. "maintenances". */
  itemsLabel?: string
}

/** Footer of a paginated list: range shown, then previous / next. */
export function ListPagination({ page, pageSize, totalItems, onPageChange, itemsLabel }: ListPaginationProps) {
  const { t } = useTranslation("fleet")
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  if (totalItems === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground tabular-nums">
        {itemsLabel
          ? t("pagination.rangeOf", { from: first, to: last, total: totalItems, items: itemsLabel })
          : t("common:pagination.range", { from: first, to: last, total: totalItems })}
      </p>
      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-2 sm:justify-end" aria-label={t("pagination.label")}>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {t("common:pagination.previous")}
          </Button>
          <span className="whitespace-nowrap text-sm text-muted-foreground tabular-nums">
            {t("common:pagination.pageOf", { page, total: totalPages })}
          </span>
          <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            {t("common:pagination.next")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  )
}
