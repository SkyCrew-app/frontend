"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
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
            Filtres
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="px-1.5 tabular-nums">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filtrer les audits</SheetTitle>
            <SheetDescription>Les filtres s'appliquent dès que vous les choisissez.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aircraft-filter">Aéronef</Label>
              <Select
                value={filters.aircraftId?.toString() || "all"}
                onValueChange={(value) =>
                  onFilterChange({ aircraftId: value !== "all" ? Number.parseInt(value) : null })
                }
              >
                <SelectTrigger id="aircraft-filter">
                  <SelectValue placeholder="Tous les aéronefs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les aéronefs</SelectItem>
                  {(aircraftData?.getAircrafts ?? []).map((aircraft: any) => (
                    <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                      {aircraft.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-filter">Résultat</Label>
              <Select
                value={filters.auditResult || "all"}
                onValueChange={(value) => onFilterChange({ auditResult: value !== "all" ? value : null })}
              >
                <SelectTrigger id="result-filter">
                  <SelectValue placeholder="Tous les résultats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les résultats</SelectItem>
                  {enumsData?.auditResultTypes?.map((result: string) => (
                    <SelectItem key={result} value={result}>
                      {auditResult(result).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency-filter">Fréquence</Label>
              <Select
                value={filters.auditFrequency || "all"}
                onValueChange={(value) => onFilterChange({ auditFrequency: value !== "all" ? value : null })}
              >
                <SelectTrigger id="frequency-filter">
                  <SelectValue placeholder="Toutes les fréquences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les fréquences</SelectItem>
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
                <Label id="start-date-filter-label">Audités à partir du</Label>
                <DatePicker
                  date={filters.startDate || undefined}
                  onSelect={(date) => onFilterChange({ startDate: date ?? null })}
                  placeholder="Date de début"
                  toDate={filters.endDate || undefined}
                  clearable
                />
              </div>
              <div className="space-y-2" role="group" aria-labelledby="end-date-filter-label">
                <Label id="end-date-filter-label">Jusqu'au</Label>
                <DatePicker
                  date={filters.endDate || undefined}
                  onSelect={(date) => onFilterChange({ endDate: date ?? null })}
                  placeholder="Date de fin"
                  fromDate={filters.startDate || undefined}
                  popoverAlign="end"
                  clearable
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row justify-end gap-2 sm:space-x-0">
            <Button variant="outline" onClick={handleClearFilters} disabled={activeFiltersCount === 0}>
              Réinitialiser
            </Button>
            <Button onClick={() => setIsSheetOpen(false)}>Voir les audits</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {filters.aircraftId && selectedAircraft && (
        <FilterChip
          label={`Aéronef : ${selectedAircraft.registration_number}`}
          removeLabel="Retirer le filtre d'aéronef"
          onRemove={() => onFilterChange({ aircraftId: null })}
        />
      )}

      {filters.auditResult && (
        <FilterChip
          label={`Résultat : ${auditResult(filters.auditResult).label}`}
          removeLabel="Retirer le filtre de résultat"
          onRemove={() => onFilterChange({ auditResult: null })}
        />
      )}

      {filters.auditFrequency && (
        <FilterChip
          label={`Fréquence : ${auditFrequencyLabel(filters.auditFrequency)}`}
          removeLabel="Retirer le filtre de fréquence"
          onRemove={() => onFilterChange({ auditFrequency: null })}
        />
      )}

      {(filters.startDate || filters.endDate) && (
        <FilterChip
          label={
            filters.startDate && filters.endDate
              ? `Du ${formatDate(filters.startDate)} au ${formatDate(filters.endDate)}`
              : filters.startDate
                ? `À partir du ${formatDate(filters.startDate)}`
                : `Jusqu'au ${formatDate(filters.endDate)}`
          }
          removeLabel="Retirer le filtre de période"
          onRemove={() => onFilterChange({ startDate: null, endDate: null })}
        />
      )}

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
