"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Filter, X } from "lucide-react"
import { GET_AIRCRAFT_FOR_AUDIT } from "@/graphql/audit"
import type { AuditResultType, AuditFrequencyType } from "@/interfaces/audit"
import { auditFrequencyLabel, auditResult } from "@/lib/audit"
import { formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"

interface AuditFiltersProps {
  filters: {
    aircraftId: number | null
    auditResult: AuditResultType | null
    auditFrequency: AuditFrequencyType | null
    startDate: Date | null
    endDate: Date | null
    searchTerm: string
  }
  onFilterChange: (filters: any) => void
  onClearFilters: () => void
  enumsData: any
  loading: boolean
}

interface FilterChipProps {
  label: string
  removeLabel: string
  onRemove: () => void
}

function FilterChip({ label, removeLabel, onRemove }: FilterChipProps) {
  return (
    <Badge variant="neutral" className="gap-1 py-1 pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </Badge>
  )
}

export function AuditFilters({ filters, onFilterChange, onClearFilters, enumsData }: AuditFiltersProps) {
  const { t } = useTranslation("administration")
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const { data: aircraftData } = useQuery(GET_AIRCRAFT_FOR_AUDIT)

  const activeFiltersCount = [
    filters.aircraftId,
    filters.auditResult,
    filters.auditFrequency,
    filters.startDate,
    filters.endDate,
  ].filter(Boolean).length

  const selectedAircraft = (aircraftData?.getAircrafts ?? []).find((a: any) => a.id === filters.aircraftId)

  const handleClearFilters = () => {
    onClearFilters()
    setIsSheetOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <Filter className="h-4 w-4" />
            {t("audits.filters.button")}
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="px-1.5 tabular-nums">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col gap-6 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("audits.filters.title")}</SheetTitle>
            <SheetDescription>{t("audits.filters.description")}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aircraft-filter">{t("audits.fields.aircraft")}</Label>
              <Select
                value={filters.aircraftId?.toString() || "all"}
                onValueChange={(value) =>
                  onFilterChange({ aircraftId: value !== "all" ? Number.parseInt(value) : null })
                }
              >
                <SelectTrigger id="aircraft-filter">
                  <SelectValue placeholder={t("audits.allAircraft")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("audits.allAircraft")}</SelectItem>
                  {(aircraftData?.getAircrafts ?? []).map((aircraft: any) => (
                    <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                      {aircraft.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-filter">{t("audits.fields.result")}</Label>
              <Select
                value={filters.auditResult || "all"}
                onValueChange={(value) => onFilterChange({ auditResult: value !== "all" ? value : null })}
              >
                <SelectTrigger id="result-filter">
                  <SelectValue placeholder={t("audits.filters.allResults")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("audits.filters.allResults")}</SelectItem>
                  {enumsData?.auditResultTypes?.map((result: string) => (
                    <SelectItem key={result} value={result}>
                      {auditResult(result).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency-filter">{t("audits.fields.frequency")}</Label>
              <Select
                value={filters.auditFrequency || "all"}
                onValueChange={(value) => onFilterChange({ auditFrequency: value !== "all" ? value : null })}
              >
                <SelectTrigger id="frequency-filter">
                  <SelectValue placeholder={t("audits.filters.allFrequencies")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("audits.filters.allFrequencies")}</SelectItem>
                  {enumsData?.auditFrequencyTypes?.map((frequency: string) => (
                    <SelectItem key={frequency} value={frequency}>
                      {auditFrequencyLabel(frequency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2" role="group" aria-labelledby="start-date-filter-label">
                <Label id="start-date-filter-label">{t("audits.filters.from")}</Label>
                <DatePicker
                  date={filters.startDate || undefined}
                  onSelect={(date) => onFilterChange({ startDate: date ?? null })}
                  placeholder={t("audits.filters.startDate")}
                  toDate={filters.endDate || undefined}
                  clearable
                />
              </div>
              <div className="space-y-2" role="group" aria-labelledby="end-date-filter-label">
                <Label id="end-date-filter-label">{t("audits.filters.until")}</Label>
                <DatePicker
                  date={filters.endDate || undefined}
                  onSelect={(date) => onFilterChange({ endDate: date ?? null })}
                  placeholder={t("audits.filters.endDate")}
                  fromDate={filters.startDate || undefined}
                  popoverAlign="end"
                  clearable
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row justify-end gap-2 sm:space-x-0">
            <Button variant="outline" onClick={handleClearFilters} disabled={activeFiltersCount === 0}>
              {t("common:actions.reset")}
            </Button>
            <Button onClick={() => setIsSheetOpen(false)}>{t("audits.filters.show")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {filters.aircraftId && selectedAircraft && (
        <FilterChip
          label={t("audits.filters.chips.aircraft", { value: selectedAircraft.registration_number })}
          removeLabel={t("audits.filters.chips.removeAircraft")}
          onRemove={() => onFilterChange({ aircraftId: null })}
        />
      )}

      {filters.auditResult && (
        <FilterChip
          label={t("audits.filters.chips.result", { value: auditResult(filters.auditResult).label })}
          removeLabel={t("audits.filters.chips.removeResult")}
          onRemove={() => onFilterChange({ auditResult: null })}
        />
      )}

      {filters.auditFrequency && (
        <FilterChip
          label={t("audits.filters.chips.frequency", { value: auditFrequencyLabel(filters.auditFrequency) })}
          removeLabel={t("audits.filters.chips.removeFrequency")}
          onRemove={() => onFilterChange({ auditFrequency: null })}
        />
      )}

      {(filters.startDate || filters.endDate) && (
        <FilterChip
          label={
            filters.startDate && filters.endDate
              ? t("audits.filters.chips.range", {
                  from: formatDate(filters.startDate),
                  to: formatDate(filters.endDate),
                })
              : filters.startDate
                ? t("common:datePicker.from", { date: formatDate(filters.startDate) })
                : t("common:datePicker.until", { date: formatDate(filters.endDate) })
          }
          removeLabel={t("audits.filters.chips.removePeriod")}
          onRemove={() => onFilterChange({ startDate: null, endDate: null })}
        />
      )}

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          {t("common:actions.reset")}
        </Button>
      )}
    </div>
  )
}
