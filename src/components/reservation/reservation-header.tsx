"use client"

import { useState } from "react"
import { format, addDays, subDays, isSameDay } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DateNavigatorProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  /** Tells whether the club is closed on that day (greyed out in the picker). */
  isClosedDay: (date: Date) => boolean
}

/** The single date control of the calendar: previous day, today, next day and a date picker. */
export function DateNavigator({ currentDate, setCurrentDate, isClosedDay }: DateNavigatorProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const isToday = isSameDay(currentDate, new Date())

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(subDays(currentDate, 1))}
          aria-label="Jour précédent"
          title="Jour précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={() => setCurrentDate(new Date())} disabled={isToday}>
          Aujourd&apos;hui
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate(addDays(currentDate, 1))}
          aria-label="Jour suivant"
          title="Jour suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-0 flex-1 justify-start font-normal sm:flex-none">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{format(currentDate, "EEEE d MMMM yyyy", { locale: fr })}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            locale={fr}
            selected={currentDate}
            defaultMonth={currentDate}
            onSelect={(date) => {
              if (!date) return
              setCurrentDate(date)
              setPickerOpen(false)
            }}
            initialFocus
            disabled={isClosedDay}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
