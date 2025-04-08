"use client"
import { useFormContext } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { Calendar, Clock, PenToolIcon as Tool } from "lucide-react"

export function OperationsTab() {
  const { register, setValue, getValues } = useFormContext()

  const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Opérations</CardTitle>
          <CardDescription>Configurez les paramètres opérationnels de l'aéroclub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-500" />
              Jours de fermeture
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {weekdays.map((day) => (
                <div key={day} className="flex items-center space-x-2">
                  <Checkbox
                    id={`closure-${day}`}
                    {...register("closureDays")}
                    value={day}
                    defaultChecked={getValues("closureDays")?.includes(day)}
                    onCheckedChange={(checked) => {
                      const currentDays = getValues("closureDays") || []
                      const updatedDays = checked ? [...currentDays, day] : currentDays.filter((d: string) => d !== day)
                      setValue("closureDays", updatedDays)
                    }}
                  />
                  <Label htmlFor={`closure-${day}`}>{day}</Label>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              Horaires de réservation
            </h3>
            <div className="space-y-2">
              <Label htmlFor="timeslot-duration">Durée du créneau (en minutes)</Label>
              <Select
                onValueChange={(value) => setValue("timeSlotDuration", Number.parseInt(value))}
                defaultValue={getValues("timeSlotDuration")?.toString() || "30"}
              >
                <SelectTrigger id="timeslot-duration">
                  <SelectValue placeholder="Sélectionner la durée" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1 heure 30</SelectItem>
                  <SelectItem value="120">2 heures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reservation-start-time">Heure de début des réservations</Label>
                <Input id="reservation-start-time" type="time" {...register("reservationStartTime")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservation-end-time">Heure de fin des réservations</Label>
                <Input id="reservation-end-time" type="time" {...register("reservationEndTime")} />
              </div>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Tool className="h-5 w-5 text-blue-500" />
              Maintenance hebdomadaire
            </h3>
            <div className="space-y-2">
              <Label htmlFor="maintenance-day">Jour de maintenance hebdomadaire</Label>
              <Select
                onValueChange={(value) => setValue("maintenanceDay", value)}
                defaultValue={getValues("maintenanceDay")}
              >
                <SelectTrigger id="maintenance-day">
                  <SelectValue placeholder="Sélectionner le jour" />
                </SelectTrigger>
                <SelectContent>
                  {weekdays.map((day) => (
                    <SelectItem key={day} value={day}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-duration">Durée de la maintenance (en heures)</Label>
              <Input
                id="maintenance-duration"
                type="number"
                {...register("maintenanceDuration", { valueAsNumber: true })}
                min="1"
                max="24"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
