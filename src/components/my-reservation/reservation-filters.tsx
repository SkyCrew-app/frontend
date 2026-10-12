"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { reservationStatus } from "@/lib/reservation-status"
import { FLIGHT_CATEGORY_OPTIONS } from "@/components/reservation/flight-category"

export type ReservationSortOrder = "newest" | "oldest"

interface ReservationFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  sortOrder: ReservationSortOrder
  setSortOrder: (value: ReservationSortOrder) => void
  resetFilters: () => void
  hasActiveFilters: boolean
}

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"]

/** One-row toolbar of "Mes réservations": search, status, category, sort. */
export function ReservationFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  sortOrder,
  setSortOrder,
  resetFilters,
  hasActiveFilters,
}: ReservationFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative sm:w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label="Rechercher une réservation"
          placeholder="But ou immatriculation"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger aria-label="Filtrer par statut" className="sm:w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tous les statuts</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {reservationStatus(status).label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
        <SelectTrigger aria-label="Filtrer par catégorie de vol" className="sm:w-[190px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Toutes les catégories</SelectItem>
          {FLIGHT_CATEGORY_OPTIONS.map((category) => (
            <SelectItem key={category.value} value={category.value}>
              {category.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as ReservationSortOrder)}>
        <SelectTrigger aria-label="Trier les réservations" className="sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Plus récentes d&apos;abord</SelectItem>
          <SelectItem value="oldest">Plus anciennes d&apos;abord</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters} className="self-start text-muted-foreground sm:self-auto">
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  )
}
