"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { FilterIcon, SearchIcon, CalendarIcon } from "lucide-react"

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
  maintenanceTypes: Record<string, string>
  maintenanceStatuses: Record<string, string>
  technicians: Array<{ email: string }>
}

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
  maintenanceTypes,
  maintenanceStatuses,
  technicians,
}: SearchFilterProps) {
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value)
  }

  const resetFilters = () => {
    onFilterTypeChange("all")
    onFilterStatusChange("all")
    onFilterTechnicianChange("all")
    onDateRangeChange({ from: undefined, to: undefined })
  }

  return (
    <div className="flex w-full gap-2 flex-col sm:flex-row">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-8 w-full"
          aria-label="Rechercher des maintenances"
        />
      </div>
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" aria-label="Ouvrir les filtres avancés">
            <FilterIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            Filtres
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Filtres avancés</DialogTitle>
          <DialogDescription>Affinez votre recherche de maintenances avec les filtres ci-dessous.</DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label htmlFor="maintenance-type" className="font-medium text-sm">
                  Type de maintenance
                </label>
                <Select value={filterType} onValueChange={onFilterTypeChange} name="maintenance-type">
                  <SelectTrigger id="maintenance-type">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {Object.entries(maintenanceTypes).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="maintenance-status" className="font-medium text-sm">
                  Statut
                </label>
                <Select value={filterStatus} onValueChange={onFilterStatusChange} name="maintenance-status">
                  <SelectTrigger id="maintenance-status">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.entries(maintenanceStatuses).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="maintenance-technician" className="font-medium text-sm">
                  Technicien
                </label>
                <Select value={filterTechnician} onValueChange={onFilterTechnicianChange} name="maintenance-technician">
                  <SelectTrigger id="maintenance-technician">
                    <SelectValue placeholder="Tous les techniciens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les techniciens</SelectItem>
                    {Array.from(new Set(technicians.map((t) => t.email || "non_assigned")))
                      .filter((email) => email && email !== "")
                      .map((email) => (
                        <SelectItem key={email} value={email}>
                          {email === "non_assigned" ? "Non assigné" : email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span id="date-range-label" className="font-medium text-sm">
                  Période
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      aria-labelledby="date-range-label"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {dateRange && dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd MMM yyyy", { locale: fr })} -{" "}
                            {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                          </>
                        ) : (
                          format(dateRange.from, "dd MMM yyyy", { locale: fr })
                        )
                      ) : (
                        <span>Sélectionnez une période</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        if (range?.from || range?.to) {
                          onDateRangeChange({ from: range?.from || undefined, to: range?.to || undefined })
                        }
                      }}
                      numberOfMonths={2}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={resetFilters} aria-label="Réinitialiser tous les filtres">
              Réinitialiser
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)}>Appliquer les filtres</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
