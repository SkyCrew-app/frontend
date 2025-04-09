"use client"

import * as React from "react"
import { format, isValid, addMonths, startOfMonth, endOfMonth } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DateRangePickerProps {
  dateRange: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: "center" | "start" | "end"
  clearable?: boolean
  size?: "default" | "sm"
  variant?: "default" | "outline" | "secondary"
}

export function DateRangePicker({
  dateRange,
  onSelect,
  placeholder = "Sélectionner une période",
  disabled = false,
  className,
  align = "start",
  clearable = true,
  size = "default",
  variant = "outline",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (range: DateRange | undefined) => {
    onSelect(range)
    if (range?.from && range?.to) {
      setOpen(false)
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(undefined)
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range) return ""

    const { from, to } = range

    if (from && to) {
      if (size === "sm") {
        return `${format(from, "dd/MM/yy", { locale: fr })} - ${format(to, "dd/MM/yy", { locale: fr })}`
      }
      return `${format(from, "dd MMM yyyy", { locale: fr })} - ${format(to, "dd MMM yyyy", { locale: fr })}`
    }

    if (from) {
      if (size === "sm") {
        return `À partir du ${format(from, "dd/MM/yy", { locale: fr })}`
      }
      return `À partir du ${format(from, "dd MMM yyyy", { locale: fr })}`
    }

    if (to) {
      if (size === "sm") {
        return `Jusqu'au ${format(to, "dd/MM/yy", { locale: fr })}`
      }
      return `Jusqu'au ${format(to, "dd MMM yyyy", { locale: fr })}`
    }

    return ""
  }

  const hasValidRange =
    dateRange &&
    (dateRange.from || dateRange.to) &&
    (dateRange.from ? isValid(dateRange.from) : true) &&
    (dateRange.to ? isValid(dateRange.to) : true)

  // Préréglages de périodes
  const presets = [
    {
      label: "Ce mois",
      getRange: () => {
        const today = new Date()
        return {
          from: startOfMonth(today),
          to: endOfMonth(today),
        }
      },
    },
    {
      label: "Mois précédent",
      getRange: () => {
        const today = new Date()
        const lastMonth = addMonths(today, -1)
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        }
      },
    },
    {
      label: "30 derniers jours",
      getRange: () => {
        const today = new Date()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(today.getDate() - 30)
        return {
          from: thirtyDaysAgo,
          to: today,
        }
      },
    },
  ]

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal transition-all",
              !hasValidRange && "text-muted-foreground",
              size === "sm" && "h-8 text-xs",
              className,
            )}
          >
            <CalendarIcon className={cn("mr-2 opacity-70", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
            {hasValidRange ? <span className="flex-1">{formatDateRange(dateRange)}</span> : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-md" align={align} sideOffset={5}>
          <div className="p-3 border-b border-border/10 bg-muted/30">
            <div className="text-xs font-medium text-center text-muted-foreground">
              {hasValidRange ? (
                <span>
                  {dateRange?.from && format(dateRange.from, "d MMM yyyy", { locale: fr })}
                  {dateRange?.from && dateRange?.to && " - "}
                  {dateRange?.to && format(dateRange.to, "d MMM yyyy", { locale: fr })}
                </span>
              ) : (
                "Sélectionnez une période"
              )}
            </div>
          </div>
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleSelect}
            numberOfMonths={2}
            initialFocus
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-2",
              caption: "flex justify-center pt-1 relative items-center text-xs font-medium px-8",
              caption_label: "text-sm font-medium text-center flex-1",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 border-0 hover:bg-accent/50",
              nav_button_previous: "absolute left-2",
              nav_button_next: "absolute right-2",
              table: "w-full border-collapse space-y-1 text-xs",
              head_row: "flex justify-between",
              head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] px-1",
              row: "flex w-full mt-2 justify-between",
              cell: "text-center text-xs p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 rounded-md aria-selected:bg-blue-600 aria-selected:text-white hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors",
              day_selected:
                "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
              day_today: "bg-accent/70 text-accent-foreground font-medium",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
          <div className="p-3 border-t border-border/10 bg-muted/30 grid grid-cols-3 gap-2">
            {presets.map((preset, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => {
                  const range = preset.getRange()
                  onSelect(range)
                  setOpen(false)
                }}
                className="text-xs font-normal h-8"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {clearable && hasValidRange && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 p-0 rounded-full hover:bg-muted",
            size === "sm" ? "h-4 w-4" : "h-5 w-5",
          )}
          onClick={handleClear}
        >
          <X className={cn("text-muted-foreground", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
          <span className="sr-only">Effacer la période</span>
        </Button>
      )}
    </div>
  )
}
