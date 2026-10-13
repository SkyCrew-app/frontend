"use client"

import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { flightTypeLabel } from "@/components/flight/flight-type"

export type FlightPlanSortOrder = "newest" | "oldest"

interface FlightPlanFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  flightTypeFilter: string
  setFlightTypeFilter: (value: string) => void
  sortOrder: FlightPlanSortOrder
  setSortOrder: (value: FlightPlanSortOrder) => void
  /** Flight types actually present in the list. */
  flightTypes: string[]
  resetFilters: () => void
  hasActiveFilters: boolean
}

/** One-row toolbar of "Mes plans de vol": search, type, sort. */
export function FlightPlanFilters({
  searchTerm,
  setSearchTerm,
  flightTypeFilter,
  setFlightTypeFilter,
  sortOrder,
  setSortOrder,
  flightTypes,
  resetFilters,
  hasActiveFilters,
}: FlightPlanFiltersProps) {
  const { t } = useTranslation("flights")

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("plans.filters.searchLabel")}
          placeholder={t("plans.filters.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {flightTypes.length > 1 && (
        <Select value={flightTypeFilter} onValueChange={setFlightTypeFilter}>
          <SelectTrigger aria-label={t("plans.filters.typeLabel")} className="sm:w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("plans.filters.allTypes")}</SelectItem>
            {flightTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {flightTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as FlightPlanSortOrder)}>
        <SelectTrigger aria-label={t("plans.filters.sortLabel")} className="sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">{t("plans.filters.newest")}</SelectItem>
          <SelectItem value="oldest">{t("plans.filters.oldest")}</SelectItem>
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
