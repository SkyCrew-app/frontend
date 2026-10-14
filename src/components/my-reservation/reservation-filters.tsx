"use client"

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { flightCategoryOptions } from "@/components/reservation/flight-category"

export type ReservationSortOrder = "newest" | "oldest"

interface ReservationFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  sortOrder: ReservationSortOrder
  setSortOrder: (value: ReservationSortOrder) => void
  resetFilters: () => void
  hasActiveFilters: boolean
}

// No status filter: a booking is confirmed when it is made and deleted when it is cancelled,
// so every booking listed has the same status.
/** One-row toolbar of "Mes réservations": search, category, sort. */
export function ReservationFilters({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  resetFilters,
  hasActiveFilters,
}: ReservationFiltersProps) {
  const { t } = useTranslation("reservations")
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("my.filters.searchLabel")}
          placeholder={t("my.filters.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger aria-label={t("my.filters.categoryLabel")} className="sm:w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("my.filters.allCategories")}</SelectItem>
          {flightCategoryOptions().map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as ReservationSortOrder)}>
        <SelectTrigger aria-label={t("my.filters.sortLabel")} className="sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t("my.filters.newestFirst")}</SelectItem>
          <SelectItem value="oldest">{t("my.filters.oldestFirst")}</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="self-start text-muted-foreground sm:self-auto">
          <X className="h-4 w-4" />
          {t("common:actions.reset")}
        </Button>
      )}
    </div>
  )
}
