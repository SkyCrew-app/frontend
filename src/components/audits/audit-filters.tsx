"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { Filter, X } from "lucide-react"
import { GET_AIRCRAFT_FOR_AUDIT } from "@/graphql/audit"
import { AuditResultType, AuditFrequencyType } from "@/interfaces/audit"
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
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { useMediaQuery } from "@/hooks/use-media-query"

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

export function AuditFilters({ filters, onFilterChange, onClearFilters, enumsData, loading }: AuditFiltersProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  const { data: aircraftData } = useQuery(GET_AIRCRAFT_FOR_AUDIT)

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.aircraftId) count++
    if (filters.auditResult) count++
    if (filters.auditFrequency) count++
    if (filters.startDate) count++
    if (filters.endDate) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  const handleApplyFilters = () => {
    setIsSheetOpen(false)
  }

  const handleClearFilters = () => {
    onClearFilters()
    setIsSheetOpen(false)
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-7 sm:h-8 px-2 sm:px-3 text-2xs sm:text-xs"
            aria-label="Filtrer les audits"
          >
            <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Filtres
            {activeFiltersCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-0.5 px-1 py-0 h-4 min-w-4 flex items-center justify-center text-[10px]"
              >
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-4 sm:p-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base sm:text-lg">Filtres</SheetTitle>
            <SheetDescription className="text-2xs sm:text-xs">
              Filtrez les audits selon différents critères
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="aircraft-filter" className="text-xs sm:text-sm">
                Aéronef
              </Label>
              <Select
                value={filters.aircraftId?.toString() || "all"}
                onValueChange={(value) =>
                  onFilterChange({ aircraftId: value !== "all" ? Number.parseInt(value) : null })
                }
              >
                <SelectTrigger id="aircraft-filter" className="h-8 sm:h-9 text-2xs sm:text-xs">
                  <SelectValue placeholder="Tous les aéronefs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-2xs sm:text-xs">
                    Tous les aéronefs
                  </SelectItem>
                  {(aircraftData?.getAircrafts ?? []).map((aircraft: any) => (
                    <SelectItem key={aircraft.id} value={aircraft.id.toString()} className="text-2xs sm:text-xs">
                      {aircraft.registration_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="result-filter" className="text-xs sm:text-sm">
                Résultat d'audit
              </Label>
              <Select
                value={filters.auditResult || "all"}
                onValueChange={(value) => onFilterChange({ auditResult: value !== "all" ? value : null })}
              >
                <SelectTrigger id="result-filter" className="h-8 sm:h-9 text-2xs sm:text-xs">
                  <SelectValue placeholder="Tous les résultats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-2xs sm:text-xs">
                    Tous les résultats
                  </SelectItem>
                  {enumsData?.auditResultTypes?.map((result: string) => (
                    <SelectItem key={result} value={result} className="text-2xs sm:text-xs">
                      {result === AuditResultType.CONFORME && "Conforme"}
                      {result === AuditResultType.NON_CONFORME && "Non conforme"}
                      {result === AuditResultType.CONFORME_AVEC_REMARQUES && "Conforme avec remarques"}
                      {result === AuditResultType.NON_APPLICABLE && "Non applicable"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="frequency-filter" className="text-xs sm:text-sm">
                Fréquence d'audit
              </Label>
              <Select
                value={filters.auditFrequency || "all"}
                onValueChange={(value) => onFilterChange({ auditFrequency: value !== "all" ? value : null })}
              >
                <SelectTrigger id="frequency-filter" className="h-8 sm:h-9 text-2xs sm:text-xs">
                  <SelectValue placeholder="Toutes les fréquences" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-2xs sm:text-xs">
                    Toutes les fréquences
                  </SelectItem>
                  {enumsData?.auditFrequencyTypes?.map((frequency: string) => (
                    <SelectItem key={frequency} value={frequency} className="text-2xs sm:text-xs">
                      {frequency === AuditFrequencyType.QUOTIDIEN && "Quotidien"}
                      {frequency === AuditFrequencyType.HEBDOMADAIRE && "Hebdomadaire"}
                      {frequency === AuditFrequencyType.MENSUEL && "Mensuel"}
                      {frequency === AuditFrequencyType.TRIMESTRIEL && "Trimestriel"}
                      {frequency === AuditFrequencyType.SEMESTRIEL && "Semestriel"}
                      {frequency === AuditFrequencyType.ANNUEL && "Annuel"}
                      {frequency === AuditFrequencyType.BIANNUEL && "Biannuel"}
                      {frequency === AuditFrequencyType.HEURES_DE_VOL && "Heures de vol"}
                      {frequency === AuditFrequencyType.APRES_INCIDENT && "Après incident"}
                      {frequency === AuditFrequencyType.AUTRE && "Autre"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Période d'audit</Label>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker
                  date={filters.startDate || undefined}
                  onSelect={(date) => onFilterChange({ startDate: date })}
                  placeholder="Date de début"
                  size="sm"
                  clearable
                  popoverAlign={isMobile ? "center" : "start"}
                />
                <DatePicker
                  date={filters.endDate || undefined}
                  onSelect={(date) => onFilterChange({ endDate: date })}
                  placeholder="Date de fin"
                  size="sm"
                  clearable
                  popoverAlign={isMobile ? "center" : "end"}
                />
              </div>
            </div>
          </div>

          <SheetFooter className="mt-6 flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleClearFilters} className="h-8 sm:h-9 text-2xs sm:text-xs">
              Réinitialiser
            </Button>
            <Button onClick={handleApplyFilters} className="h-8 sm:h-9 text-2xs sm:text-xs">
              Appliquer
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {activeFiltersCount > 0 && !isMobile && (
        <div className="hidden md:flex flex-wrap items-center gap-1.5">
          {filters.aircraftId && aircraftData?.getAircrafts && (
            <Badge variant="secondary" className="flex items-center gap-1 h-6 px-2 text-2xs">
              <span>
                Aéronef: {aircraftData.getAircrafts.find((a: any) => a.id === filters.aircraftId)?.registration_number}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-3.5 w-3.5 p-0 ml-0.5"
                onClick={() => onFilterChange({ aircraftId: null })}
                aria-label="Supprimer le filtre d'aéronef"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          )}

          {filters.auditResult && (
            <Badge variant="secondary" className="flex items-center gap-1 h-6 px-2 text-2xs">
              <span>
                Résultat:{" "}
                {filters.auditResult === AuditResultType.CONFORME
                  ? "Conforme"
                  : filters.auditResult === AuditResultType.NON_CONFORME
                    ? "Non conforme"
                    : filters.auditResult === AuditResultType.CONFORME_AVEC_REMARQUES
                      ? "Avec remarques"
                      : "Non applicable"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-3.5 w-3.5 p-0 ml-0.5"
                onClick={() => onFilterChange({ auditResult: null })}
                aria-label="Supprimer le filtre de résultat"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          )}

          {filters.auditFrequency && (
            <Badge variant="secondary" className="flex items-center gap-1 h-6 px-2 text-2xs">
              <span>
                Fréquence:{" "}
                {filters.auditFrequency === AuditFrequencyType.QUOTIDIEN
                  ? "Quotidien"
                  : filters.auditFrequency === AuditFrequencyType.HEBDOMADAIRE
                    ? "Hebdo"
                    : filters.auditFrequency === AuditFrequencyType.MENSUEL
                      ? "Mensuel"
                      : filters.auditFrequency === AuditFrequencyType.TRIMESTRIEL
                        ? "Trim."
                        : filters.auditFrequency === AuditFrequencyType.SEMESTRIEL
                          ? "Sem."
                          : filters.auditFrequency === AuditFrequencyType.ANNUEL
                            ? "Annuel"
                            : filters.auditFrequency === AuditFrequencyType.BIANNUEL
                              ? "Biannuel"
                              : "Autre"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-3.5 w-3.5 p-0 ml-0.5"
                onClick={() => onFilterChange({ auditFrequency: null })}
                aria-label="Supprimer le filtre de fréquence"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          )}

          {(filters.startDate || filters.endDate) && (
            <Badge variant="secondary" className="flex items-center gap-1 h-6 px-2 text-2xs">
              <span>
                Période: {filters.startDate ? format(filters.startDate, "dd/MM/yyyy", { locale: fr }) : "..."} -{" "}
                {filters.endDate ? format(filters.endDate, "dd/MM/yyyy", { locale: fr }) : "..."}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-3.5 w-3.5 p-0 ml-0.5"
                onClick={() => onFilterChange({ startDate: null, endDate: null })}
                aria-label="Supprimer le filtre de période"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-2xs"
            onClick={onClearFilters}
            aria-label="Réinitialiser tous les filtres"
          >
            Réinitialiser
          </Button>
        </div>
      )}
    </div>
  )
}
