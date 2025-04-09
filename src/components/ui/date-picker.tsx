"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DatePickerProps {
  date: Date | undefined
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  popoverAlign?: "center" | "start" | "end"
  clearable?: boolean
  fromDate?: Date
  toDate?: Date
  size?: "default" | "sm"
  variant?: "default" | "outline" | "secondary"
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Sélectionner une date",
  disabled = false,
  className,
  popoverAlign = "start",
  clearable = false,
  fromDate,
  toDate,
  size = "default",
  variant = "outline",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (selectedDate: Date | undefined) => {
    onSelect(selectedDate)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(undefined)
  }

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
              !date && "text-muted-foreground",
              size === "sm" && "h-8 text-xs",
              className,
            )}
          >
            <CalendarIcon className={cn("mr-2 opacity-70", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
            {date ? (
              <span className="flex-1">{format(date, "dd MMMM yyyy", { locale: fr })}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 shadow-md" align={popoverAlign} sideOffset={5}>
          <div className="p-3 border-b border-border/10 bg-muted/30">
            <div className="text-xs font-medium text-center text-muted-foreground">
              {date ? format(date, "EEEE d MMMM yyyy", { locale: fr }) : "Sélectionnez une date"}
            </div>
          </div>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            disabled={(date) => {
              if (fromDate && date < fromDate) return true
              if (toDate && date > toDate) return true
              return false
            }}
            classNames={{
              caption: "text-xs font-medium py-1",
              table: "text-xs",
              head_cell: "text-2xs font-medium text-muted-foreground px-1",
              cell: "text-xs p-0",
              day: "h-8 w-8 text-xs rounded-md aria-selected:bg-blue-600 aria-selected:text-white hover:bg-accent focus:bg-accent focus:outline-none",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
              nav_button_previous: "absolute left-2",
              nav_button_next: "absolute right-2",
              dropdown: "focus:outline-none focus:ring-0 focus:ring-offset-0 text-xs",
              dropdown_month: "py-1.5 px-3",
              dropdown_year: "py-1.5 px-3",
            }}
          />
          <div className="p-2 border-t border-border/10 bg-muted/30 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelect(new Date())}
              className="w-full text-xs justify-center font-normal"
            >
              Aujourd'hui
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {clearable && date && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "absolute right-1 top-1/2 -translate-y-1/2 p-0 h-5 w-5 rounded-full hover:bg-muted",
            size === "sm" ? "h-4 w-4" : "h-5 w-5",
          )}
          onClick={handleClear}
        >
          <span className="sr-only">Effacer la date</span>
          <X className={cn("text-muted-foreground", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        </Button>
      )}
    </div>
  )
}
