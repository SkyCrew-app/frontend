"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ReservationTemplate } from "@/interfaces/reservation-template"
import { Loader2 } from "lucide-react"

interface Aircraft {
  id: number
  registration_number: string
  model: string
}

const FLIGHT_CATEGORIES = [
  { value: "LOCAL", label: "Local" },
  { value: "CROSS_COUNTRY", label: "Navigation" },
  { value: "INSTRUCTION", label: "Instruction" },
  { value: "TOURISM", label: "Tourisme" },
  { value: "TRAINING", label: "Entra\u00eenement" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "PRIVATE", label: "Priv\u00e9" },
  { value: "CORPORATE", label: "Entreprise" },
]

const DAYS = [
  { value: "0", label: "Dimanche" },
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
]

interface TemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ReservationTemplate | null
  aircraftList: Aircraft[]
  onSave: (data: any) => void
  loading?: boolean
}

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  aircraftList,
  onSave,
  loading,
}: TemplateDialogProps) {
  const [name, setName] = useState("")
  const [aircraftId, setAircraftId] = useState<string>("none")
  const [dayOfWeek, setDayOfWeek] = useState<string>("none")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [flightCategory, setFlightCategory] = useState("LOCAL")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("")

  useEffect(() => {
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

  const handleSubmit = () => {
    const data: any = {
      name,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{template ? "Modifier le mod\u00e8le" : "Nouveau mod\u00e8le"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nom du mod&egrave;le</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Vol du samedi matin" />
          </div>

          <div>
            <Label>Avion</Label>
            <Select value={aircraftId} onValueChange={setAircraftId}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {aircraftList.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.registration_number} - {a.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Heure de d&eacute;but</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Heure de fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jour pr&eacute;f&eacute;r&eacute;</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
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
            <div>
              <Label>Cat&eacute;gorie</Label>
              <Select value={flightCategory} onValueChange={setFlightCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLIGHT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Objet du vol</Label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Ex: Tour de piste" />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div>
            <Label>Heures de vol estim&eacute;es</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!name || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {template ? "Mettre \u00e0 jour" : "Cr\u00e9er"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
