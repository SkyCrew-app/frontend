"use client"

import { format, parseISO } from "date-fns"
import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { LogbookFilter } from "@/interfaces/logbook"
import { flightTypeLabel } from "@/components/flight/flight-type"

interface Aircraft {
  id: number
  registration_number: string
  model: string
}

interface LogbookFiltersProps {
  filter: LogbookFilter
  onFilterChange: (filter: LogbookFilter) => void
  aircraftList: Aircraft[]
  /** Flight types the pilot can filter on. */
  flightTypes: string[]
}

const toDate = (value: string | undefined) => (value ? parseISO(value) : undefined)
const toFilterDate = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : undefined)

/** One-row toolbar of the logbook: period, aircraft, flight type. */
export default function LogbookFilters({ filter, onFilterChange, aircraftList, flightTypes }: LogbookFiltersProps) {
  const { t } = useTranslation("flights")
  const hasActiveFilters = Boolean(filter.startDate || filter.endDate || filter.aircraftId || filter.flightType)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="sm:w-[200px]" role="group" aria-label={t("logbook.filters.startDateAria")}>
        <DatePicker
          date={toDate(filter.startDate)}
          onSelect={(date) => onFilterChange({ ...filter, startDate: toFilterDate(date) })}
          placeholder={t("logbook.filters.from")}
          toDate={toDate(filter.endDate)}
          clearable
        />
      </div>

      <div className="sm:w-[200px]" role="group" aria-label={t("logbook.filters.endDateAria")}>
        <DatePicker
          date={toDate(filter.endDate)}
          onSelect={(date) => onFilterChange({ ...filter, endDate: toFilterDate(date) })}
          placeholder={t("logbook.filters.to")}
          fromDate={toDate(filter.startDate)}
          clearable
        />
      </div>

      <Select
        value={filter.aircraftId?.toString() ?? "all"}
        onValueChange={(value) =>
          onFilterChange({
            ...filter,
            aircraftId: value === "all" ? undefined : parseInt(value),
          })
        }
      >
        <SelectTrigger aria-label={t("logbook.filters.aircraftAria")} className="sm:w-[210px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("logbook.filters.allAircraft")}</SelectItem>
          {aircraftList.map((aircraft) => (
            <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
              {aircraft.registration_number} — {aircraft.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.flightType ?? "all"}
        onValueChange={(value) =>
          onFilterChange({
            ...filter,
            flightType: value === "all" ? undefined : value,
          })
        }
      >
        <SelectTrigger aria-label={t("logbook.filters.flightTypeAria")} className="sm:w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("logbook.filters.allFlightTypes")}</SelectItem>
          {flightTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {flightTypeLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFilterChange({})}
          className="self-start text-muted-foreground sm:self-auto"
        >
          <X className="h-4 w-4" />
          {t("common:actions.reset")}
        </Button>
      )}
    </div>
  )
}
