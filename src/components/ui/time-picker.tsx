"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function TimePickerDemo({ date, setDate, className }: TimePickerProps) {
  const minuteRef = React.useRef<HTMLInputElement>(null)
  const hourRef = React.useRef<HTMLInputElement>(null)

  // Utiliser des refs pour stocker les valeurs actuelles sans déclencher de re-renders
  const hourRef2 = React.useRef<number>(date.getHours())
  const minuteRef2 = React.useRef<number>(date.getMinutes())

  // Initialiser les états locaux une seule fois
  const [hour, setHour] = React.useState<number>(date.getHours())
  const [minute, setMinute] = React.useState<number>(date.getMinutes())

  // Mettre à jour les refs quand la date externe change
  React.useEffect(() => {
    const newHour = date.getHours()
    const newMinute = date.getMinutes()

    // Ne mettre à jour les états que si les valeurs ont réellement changé
    // et ne proviennent pas de nos propres mises à jour
    if (newHour !== hourRef2.current) {
      setHour(newHour)
      hourRef2.current = newHour
    }

    if (newMinute !== minuteRef2.current) {
      setMinute(newMinute)
      minuteRef2.current = newMinute
    }
  }, [date])

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10)
    let newHour = 0

    if (!isNaN(value)) {
      newHour = Math.max(0, Math.min(23, value))
    }

    setHour(newHour)
    hourRef2.current = newHour

    // Créer une nouvelle date sans déclencher d'effet
    const newDate = new Date(date)
    newDate.setHours(newHour)
    newDate.setMinutes(minute)
    setDate(newDate)

    if (e.target.value.length >= 2) {
      minuteRef.current?.focus()
    }
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value, 10)
    let newMinute = 0

    if (!isNaN(value)) {
      newMinute = Math.max(0, Math.min(59, value))
    }

    setMinute(newMinute)
    minuteRef2.current = newMinute

    // Créer une nouvelle date sans déclencher d'effet
    const newDate = new Date(date)
    newDate.setHours(hour)
    newDate.setMinutes(newMinute)
    setDate(newDate)
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="grid gap-1 text-center">
        <div className="flex items-center border rounded-md focus-within:ring-1 focus-within:ring-ring">
          <div className="flex">
            <Input
              ref={hourRef}
              value={hour.toString().padStart(2, "0")}
              onChange={handleHourChange}
              className="w-[40px] border-0 p-0 text-center text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
              type="number"
              min={0}
              max={23}
            />
            <span className="flex items-center text-lg">:</span>
            <Input
              ref={minuteRef}
              value={minute.toString().padStart(2, "0")}
              onChange={handleMinuteChange}
              className="w-[40px] border-0 p-0 text-center text-lg focus-visible:ring-0 focus-visible:ring-offset-0"
              type="number"
              min={0}
              max={59}
            />
          </div>
          <div className="px-3 py-2 border-l">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  )
}
