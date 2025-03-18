"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Loader2 } from "lucide-react"

interface Aircraft {
  id: number
  registration_number: string
}

interface ReservationFormProps {
  isEdit?: boolean
  selectedAircraft?: number | null
  aircraftData?: any
  selectedTimeRange?: { start: string | null; end: string | null }
  currentDate?: Date
  purpose: string
  setPurpose: (value: string) => void
  notes: string
  setNotes: (value: string) => void
  flightCategory: string
  setFlightCategory: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  startTime?: string
  endTime?: string
}

const flightCategoryMapping = {
  LOCAL: "Local",
  CROSS_COUNTRY: "Vol longue distance",
  INSTRUCTION: "Instruction",
  TOURISM: "Tourisme",
  TRAINING: "Entraînement",
  MAINTENANCE: "Maintenance",
  PRIVATE: "Privé",
  CORPORATE: "Affaires",
}

const flightCategoryReverseMapping = Object.fromEntries(
  Object.entries(flightCategoryMapping).map(([key, value]) => [value, key]),
)

export function ReservationForm({
  isEdit = false,
  selectedAircraft,
  aircraftData,
  selectedTimeRange,
  currentDate,
  purpose,
  setPurpose,
  notes,
  setNotes,
  flightCategory,
  setFlightCategory,
  onSubmit,
  isSubmitting,
  startTime,
  endTime,
}: ReservationFormProps) {
  const [selectedCategoryFr, setSelectedCategoryFr] = useState<string | undefined>(
    flightCategory ? flightCategoryMapping[flightCategory as keyof typeof flightCategoryMapping] : undefined,
  )

  useEffect(() => {
    if (flightCategory) {
      setSelectedCategoryFr(flightCategoryMapping[flightCategory as keyof typeof flightCategoryMapping])
    }
  }, [flightCategory])

  const getAircraftName = () => {
    if (!selectedAircraft || !aircraftData) return ""
    const aircraft = aircraftData.getAircrafts.find((a: Aircraft) => a.id === selectedAircraft)
    return aircraft ? aircraft.registration_number : ""
  }

  const formattedDate = currentDate ? format(currentDate, "EEEE d MMMM yyyy", { locale: fr }) : ""

  return (
    <div className="space-y-4">
      {!isEdit && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Avion</Label>
              <p className="font-medium">{getAircraftName()}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{formattedDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Heure de début</Label>
              <p className="font-medium">{selectedTimeRange?.start || startTime}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Heure de fin</Label>
              <p className="font-medium">{selectedTimeRange?.end || endTime}</p>
            </div>
          </div>

          <Separator />
        </>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="purpose">But de la réservation</Label>
          <Input
            id="purpose"
            placeholder="Ex: Vol d'entraînement, Instruction..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="category">Catégorie de vol</Label>
          <Select
            value={selectedCategoryFr}
            onValueChange={(value) => {
              setSelectedCategoryFr(value)
              setFlightCategory(flightCategoryReverseMapping[value])
            }}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(flightCategoryMapping).map((categoryFr) => (
                <SelectItem key={categoryFr} value={categoryFr}>
                  {categoryFr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="notes">Notes supplémentaires</Label>
          <Textarea
            id="notes"
            placeholder="Informations complémentaires..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? "Mettre à jour" : "Créer la réservation"}
        </Button>
      </div>
    </div>
  )
}

function Separator() {
  return <div className="h-px bg-border my-4" />
}
