"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, SortAsc, SortDesc, X } from "lucide-react"

interface FlightPlanFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  flightTypeFilter: string
  setFlightTypeFilter: (value: string) => void
  sortOrder: "newest" | "oldest"
  setSortOrder: (value: "newest" | "oldest") => void
  flightTypeTranslations: Record<string, string>
  resetFilters: () => void
  hasActiveFilters: boolean
}

export function FlightPlanFilters({
  searchTerm,
  setSearchTerm,
  flightTypeFilter,
  setFlightTypeFilter,
  sortOrder,
  setSortOrder,
  flightTypeTranslations,
  resetFilters,
  hasActiveFilters,
}: FlightPlanFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Recherche
            </Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="OACI de départ ou d'arrivée"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8"
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                  aria-label="Effacer la recherche"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flightType" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Type de vol
            </Label>
            <Select value={flightTypeFilter} onValueChange={setFlightTypeFilter}>
              <SelectTrigger id="flightType">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les types</SelectItem>
                {Object.entries(flightTypeTranslations).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              {sortOrder === "newest" ? <SortDesc className="h-4 w-4" /> : <SortAsc className="h-4 w-4" />}
              Tri
            </Label>
            <div className="flex gap-2">
              <Button
                variant={sortOrder === "newest" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSortOrder("newest")}
              >
                Plus récent
              </Button>
              <Button
                variant={sortOrder === "oldest" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSortOrder("oldest")}
              >
                Plus ancien
              </Button>
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
