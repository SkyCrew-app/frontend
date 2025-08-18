"use client"

import { format, addDays, subDays, addWeeks, subWeeks } from "date-fns"
import { fr } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { useTranslations } from "next-intl"

interface ReservationHeaderProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  disabledDays: string[]
  isDayClosed: boolean
}

export function ReservationHeader({ currentDate, setCurrentDate, disabledDays, isDayClosed }: ReservationHeaderProps) {
  const handlePreviousDay = () => setCurrentDate(subDays(currentDate, 1))
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1))
  const handlePreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1))
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
  const t = useTranslations("reservation")

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('calendarReservation')}</h1>
          <p className="text-muted-foreground mt-1">{t('calendarReservationDescription')}</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-[240px] justify-start text-left font-normal",
                !currentDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {currentDate ? format(currentDate, "EEEE d MMMM yyyy", { locale: fr }) : <span>{t('chooseDate')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              locale={fr}
              selected={currentDate}
              onSelect={(date) => date && setCurrentDate(date)}
              initialFocus
              disabled={(date) => {
                const dayName = format(date, "EEEE", { locale: fr })
                return disabledDays.includes(dayName)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isDayClosed && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardContent className="p-4 text-yellow-800 dark:text-yellow-300 flex items-center justify-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            <span>{t('closeAiport')} ({format(currentDate, "EEEE", { locale: fr })})</span>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousDay} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('previousDay')}</span>
            <span className="sm:hidden">{t('previous')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay} className="flex items-center">
            <span className="hidden sm:inline">{t('nextDay')}</span>
            <span className="sm:hidden">{t('next')}</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('previousWeek')}</span>
            <span className="sm:hidden">{t('previousWeekAb')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextWeek} className="flex items-center">
            <span className="hidden sm:inline">{t('nextWeek')}</span>
            <span className="sm:hidden">{t('nextWeekAb')}</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
