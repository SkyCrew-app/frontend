"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReservationTemplate } from "@/interfaces/reservation-template"
import { Loader2 } from "lucide-react"
import { FLIGHT_CATEGORY_OPTIONS } from "@/components/reservation/flight-category"

interface Aircraft {
  id: number
  registration_number: string
  model: string
}

const DAYS = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
  { value: "0", label: "Dimanche" },
]

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ReservationTemplate | null
  aircraftList: Aircraft[]
  onSave: (data: any) => void
  loading?: boolean
}

export function TemplateDialog({ open, onOpenChange, template, aircraftList, onSave, loading }: TemplateDialogProps) {
  const [name, setName] = useState("")
  const [aircraftId, setAircraftId] = useState<string>("none")
  const [dayOfWeek, setDayOfWeek] = useState<string>("none")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [flightCategory, setFlightCategory] = useState("LOCAL")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    setSubmitted(false)
    if (template) {
      setName(template.name)
      setAircraftId(template.aircraft?.id?.toString() ?? "none")
      setDayOfWeek(template.day_of_week?.toString() ?? "none")
      setStartTime(template.preferred_start_time ?? "")
      setEndTime(template.preferred_end_time ?? "")
      setFlightCategory(template.flight_category)
      setPurpose(template.purpose ?? "")
      setNotes(template.notes ?? "")
      setEstimatedHours(template.estimated_flight_hours?.toString() ?? "")
    } else {
      setName("")
      setAircraftId("none")
      setDayOfWeek("none")
      setStartTime("")
      setEndTime("")
      setFlightCategory("LOCAL")
      setPurpose("")
      setNotes("")
      setEstimatedHours("")
    }
  }, [template, open])

  const nameError = submitted && !name.trim() ? "Donnez un nom au modèle." : undefined
  const timeError =
    submitted && startTime && endTime && endTime <= startTime
      ? "L'heure de fin doit être après l'heure de début."
      : undefined

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (!name.trim() || (startTime && endTime && endTime <= startTime)) return

    const data: any = {
      name: name.trim(),
      flight_category: flightCategory,
    }
    if (aircraftId !== "none") data.aircraft_id = parseInt(aircraftId)
    if (dayOfWeek !== "none") data.day_of_week = parseInt(dayOfWeek)
    if (startTime) data.preferred_start_time = startTime
    if (endTime) data.preferred_end_time = endTime
    if (purpose) data.purpose = purpose
    if (notes) data.notes = notes
    if (estimatedHours) data.estimated_flight_hours = parseFloat(estimatedHours)
    if (template) data.id = template.id

    onSave(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Modifier le modèle" : "Nouveau modèle"}</DialogTitle>
          <DialogDescription>
            Un modèle préremplit le formulaire de réservation pour vos vols habituels.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="template-name">
              Nom du modèle{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. : vol du samedi matin"
              aria-invalid={!!nameError}
              aria-required="true"
            />
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-aircraft">Avion</Label>
              <Select value={aircraftId} onValueChange={setAircraftId}>
                <SelectTrigger id="template-aircraft">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Au choix</SelectItem>
                  {aircraftList.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.registration_number} — {a.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-category">Catégorie de vol</Label>
              <Select value={flightCategory} onValueChange={setFlightCategory}>
                <SelectTrigger id="template-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLIGHT_CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 space-y-2 sm:col-span-1">
                <Label htmlFor="template-day">Jour habituel</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger id="template-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-start">Heure de début</Label>
                <Input
                  id="template-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-end">Heure de fin</Label>
                <Input
                  id="template-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  aria-invalid={!!timeError}
                />
              </div>
            </div>
            {timeError && <p className="text-sm text-destructive">{timeError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="template-purpose">But du vol</Label>
              <Input
                id="template-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Ex. : tours de piste"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-hours">Durée de vol (h)</Label>
              <Input
                id="template-hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                inputMode="decimal"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="1,5"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-notes">Notes</Label>
            <Textarea
              id="template-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Passagers, plein à prévoir, consignes particulières…"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {template ? "Enregistrer" : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
