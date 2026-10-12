"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { FlightCategoryError } from "@/components/reservation/flight-category-error"
import { FLIGHT_CATEGORY_OPTIONS } from "@/components/reservation/flight-category"

export interface ReservationSlotSummary {
  aircraft: string
  /** Long date, e.g. "mercredi 23 octobre 2024". */
  date: string
  start: string
  end: string
}

interface ReservationFormProps {
  isEdit?: boolean
  /** The slot being booked or edited, shown read-only above the fields. */
  summary?: ReservationSlotSummary
  purpose: string
  setPurpose: (value: string) => void
  notes: string
  setNotes: (value: string) => void
  flightCategory: string
  setFlightCategory: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
}

export function ReservationForm({
  isEdit = false,
  summary,
  purpose,
  setPurpose,
  notes,
  setNotes,
  flightCategory,
  setFlightCategory,
  onSubmit,
  onCancel,
  isSubmitting,
}: ReservationFormProps) {
  const [categoryError, setCategoryError] = useState(false)

  // The category is a required enum of the API.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!flightCategory) {
      setCategoryError(true)
      return
    }
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {summary && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Avion</dt>
            <dd className="font-medium">{summary.aircraft}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Date</dt>
            <dd className="font-medium">{summary.date}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Début</dt>
            <dd className="font-medium tabular-nums">{summary.start}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Fin</dt>
            <dd className="font-medium tabular-nums">{summary.end}</dd>
          </div>
        </dl>
      )}

      <div className="space-y-2">
        <Label htmlFor="purpose">But de la réservation</Label>
        <Input
          id="purpose"
          placeholder="Ex. : tours de piste, navigation vers Deauville"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">
          Catégorie de vol{" "}
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        </Label>
        <Select
          value={flightCategory || undefined}
          onValueChange={(value) => {
            setFlightCategory(value)
            setCategoryError(false)
          }}
        >
          <SelectTrigger
            id="category"
            aria-invalid={categoryError}
            aria-required="true"
            className={categoryError ? "border-destructive" : ""}
          >
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {FLIGHT_CATEGORY_OPTIONS.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FlightCategoryError visible={categoryError} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Passagers, plein à prévoir, consignes particulières…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer la réservation"}
        </Button>
      </div>
    </form>
  )
}
