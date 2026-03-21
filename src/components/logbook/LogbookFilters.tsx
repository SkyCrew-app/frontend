"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RotateCcw } from "lucide-react"
import type { LogbookFilter } from "@/interfaces/logbook"

interface Aircraft {
  id: number
  registration_number: string
  model: string
}

interface LogbookFiltersProps {
  filter: LogbookFilter
  onFilterChange: (filter: LogbookFilter) => void
  aircraftList: Aircraft[]
}

const FLIGHT_TYPES = [
  { value: "VFR", label: "VFR" },
  { value: "IFR", label: "IFR" },
  { value: "SVFR", label: "SVFR" },
]

export default function LogbookFilters({ filter, onFilterChange, aircraftList }: LogbookFiltersProps) {
  const handleReset = () => {
    onFilterChange({})
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Date de début</label>
        <Input
          type="date"
          value={filter.startDate ?? ""}
          onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value || undefined })}
          className="w-[160px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Date de fin</label>
        <Input
          type="date"
          value={filter.endDate ?? ""}
          onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value || undefined })}
          className="w-[160px]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Avion</label>
        <Select
          value={filter.aircraftId?.toString() ?? "all"}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              aircraftId: value === "all" ? undefined : parseInt(value),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tous les avions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les avions</SelectItem>
            {aircraftList.map((aircraft) => (
              <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                {aircraft.registration_number} - {aircraft.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground">Nature du vol</label>
        <Select
          value={filter.flightType ?? "all"}
          onValueChange={(value) =>
            onFilterChange({
              ...filter,
              flightType: value === "all" ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {FLIGHT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="icon" onClick={handleReset} title="Réinitialiser les filtres">
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  )
}
