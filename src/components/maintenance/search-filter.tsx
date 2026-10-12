"use client"

import type { DateRange } from "react-day-picker"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  MAINTENANCE_STATUS_VALUES,
  MAINTENANCE_TYPE_VALUES,
  maintenanceStatus,
  maintenanceTypeLabel,
} from "@/lib/maintenance"

export interface TechnicianOption {
  value: string
  label: string
}

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: string
  onFilterTypeChange: (value: string) => void
  filterStatus: string
  onFilterStatusChange: (value: string) => void
  filterTechnician: string
  onFilterTechnicianChange: (value: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  technicians: TechnicianOption[]
  hasFilters: boolean
  onReset: () => void
}

/** Toolbar of the maintenance list: search first, then one select per filter. */
export function SearchFilter({
  searchTerm,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  filterTechnician,
  onFilterTechnicianChange,
  dateRange,
  onDateRangeChange,
  technicians,
  hasFilters,
  onReset,
}: SearchFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          placeholder="Aéronef ou description"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-8"
          aria-label="Rechercher des maintenances"
        />
      </div>

      <Select value={filterStatus} onValueChange={onFilterStatusChange}>
        <SelectTrigger className="w-full sm:w-[170px]" aria-label="Filtrer par statut">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {MAINTENANCE_STATUS_VALUES.map((status) => (
            <SelectItem key={status} value={status}>
              {maintenanceStatus(status).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filterType} onValueChange={onFilterTypeChange}>
        <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filtrer par type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les types</SelectItem>
          {MAINTENANCE_TYPE_VALUES.map((type) => (
            <SelectItem key={type} value={type}>
              {maintenanceTypeLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {technicians.length > 0 && (
        <Select value={filterTechnician} onValueChange={onFilterTechnicianChange}>
          <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filtrer par technicien">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les techniciens</SelectItem>
            {technicians.map((technician) => (
              <SelectItem key={technician.value} value={technician.value}>
                {technician.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <DateRangePicker
        dateRange={dateRange}
        onSelect={onDateRangeChange}
        placeholder="Toutes les dates"
        className="sm:w-[250px]"
      />

      {hasFilters && (
        <Button variant="ghost" onClick={onReset}>
          <X className="h-4 w-4" aria-hidden="true" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
