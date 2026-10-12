"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "@apollo/client"
import { FileText, ImageIcon, Paperclip, Plane, X } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CREATE_AIRCRAFT, GET_AIRCRAFTS, UPDATE_AIRCRAFT } from "@/graphql/planes"
import {
  type Aircraft,
  AvailabilityStatus,
  type CreateAircraftResponse,
  type UpdateAircraftResponse,
} from "@/interfaces/aircraft"
import { toast } from "@/components/hooks/use-toast"
import {
  AIRCRAFT_AVAILABILITY_VALUES,
  AIRCRAFT_MAINTENANCE_STATE_VALUES,
  aircraftAvailability,
  aircraftFileName,
  aircraftFileUrl,
  aircraftMaintenanceState,
  buildAircraftInput,
  manufactureYearBounds,
} from "@/lib/aircraft"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { cn } from "@/lib/utils"

interface AircraftFormDialogProps {
  /** Aircraft to edit; without it the form creates one. */
  aircraft?: Aircraft | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Optional figures of an aircraft, in the order of the form.
const OPTIONAL_NUMBERS = [
  "maxAltitude",
  "cruiseSpeed",
  "consumption",
  "fuel_capacity",
  "empty_weight",
  "max_takeoff_weight",
] as const

type OptionalNumber = (typeof OPTIONAL_NUMBERS)[number]

// Required fields, all on the first step of the form.
const IDENTIFICATION_FIELDS = ["registration_number", "model", "year_of_manufacture", "hourly_cost"] as const

// The form holds what is typed; numbers are read when it is sent.
type FormState = Record<
  | "registration_number"
  | "model"
  | "year_of_manufacture"
  | "hourly_cost"
  | "availability_status"
  | "maintenance_status"
  | "fuel_type"
  | OptionalNumber,
  string
>

const text = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value))

// Older spellings of a known maintenance state ("OPERATIONAL") are brought back to the value the form writes.
const formMaintenanceState = (status: string | null | undefined) => {
  if (!status) return AIRCRAFT_MAINTENANCE_STATE_VALUES[0]
  const { label, variant } = aircraftMaintenanceState(status)
  if (variant === "neutral") return status
  return AIRCRAFT_MAINTENANCE_STATE_VALUES.find((value) => aircraftMaintenanceState(value).label === label) ?? status
}

const initialState = (aircraft?: Aircraft | null): FormState => ({
  registration_number: aircraft?.registration_number ?? "",
  model: aircraft?.model ?? "",
  year_of_manufacture: text(aircraft?.year_of_manufacture),
  hourly_cost: text(aircraft?.hourly_cost),
  availability_status: aircraft?.availability_status ?? AvailabilityStatus.AVAILABLE,
  maintenance_status: formMaintenanceState(aircraft?.maintenance_status),
  fuel_type: aircraft?.fuel_type ?? "",
  maxAltitude: text(aircraft?.maxAltitude),
  cruiseSpeed: text(aircraft?.cruiseSpeed),
  consumption: text(aircraft?.consumption),
  fuel_capacity: text(aircraft?.fuel_capacity),
  empty_weight: text(aircraft?.empty_weight),
  max_takeoff_weight: text(aircraft?.max_takeoff_weight),
})

interface FieldProps {
  id: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

function Field({ id, label, required, error, children }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// A number input with its unit shown inside the field, on the right.
function UnitInput({ unit, className, ...props }: React.ComponentProps<typeof Input> & { unit: string }) {
  return (
    <div className="relative">
      <Input type="number" inputMode="decimal" min="0" className={cn("pr-12 tabular-nums", className)} {...props} />
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
        aria-hidden="true"
      >
        {unit}
      </span>
    </div>
  )
}

export function AircraftFormDialog({ aircraft, isOpen, onClose, onSuccess }: AircraftFormDialogProps) {
  const isEditing = !!aircraft
  const [form, setForm] = useState<FormState>(() => initialState(aircraft))
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Each opening starts from the aircraft as it is stored (or from an empty form).
  useEffect(() => {
    if (!isOpen) return
    setForm(initialState(aircraft))
    setErrors({})
    setImageFile(null)
    setDocumentFile(null)
    setImagePreview(null)
  }, [aircraft, isOpen])

  const [createAircraft, { loading: creating }] = useMutation<CreateAircraftResponse>(CREATE_AIRCRAFT, {
    refetchQueries: [{ query: GET_AIRCRAFTS }],
    awaitRefetchQueries: true,
    onCompleted: (result) => {
      toast({
        title: "Aéronef ajouté",
        description: `${result.createAircraft.registration_number} fait maintenant partie de la flotte.`,
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: "Création impossible",
        description: "L'aéronef n'a pas pu être créé. Vérifiez que l'immatriculation n'est pas déjà utilisée.",
        variant: "destructive",
      })
    },
  })

  const [updateAircraft, { loading: updating }] = useMutation<UpdateAircraftResponse>(UPDATE_AIRCRAFT, {
    refetchQueries: [{ query: GET_AIRCRAFTS }],
    awaitRefetchQueries: true,
    onCompleted: () => {
      toast({
        title: "Aéronef mis à jour",
        description: "Les modifications ont été enregistrées.",
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: "Enregistrement impossible",
        description:
          "Les modifications n'ont pas pu être enregistrées. Vérifiez que l'immatriculation n'est pas déjà utilisée.",
        variant: "destructive",
      })
    },
  })

  const loading = creating || updating
  const yearBounds = manufactureYearBounds()

  const setField = (field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }))
    }
  }

  const inputProps = (field: keyof FormState) => ({
    id: field,
    name: field,
    value: form[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setField(field, event.target.value),
    "aria-invalid": !!errors[field],
    className: cn(errors[field] && "border-destructive"),
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Lets the same file be picked again after it was removed.
    e.target.value = ""
    if (!file) return

    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) setDocumentFile(file)
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  // Checks the whole form, or only the fields of one step when they are given.
  const validate = (fields?: readonly (keyof FormState)[]) => {
    const next: Partial<Record<keyof FormState, string>> = {}

    if (!form.registration_number.trim()) next.registration_number = "Indiquez l'immatriculation."
    if (!form.model.trim()) next.model = "Indiquez le modèle."

    const year = Number(form.year_of_manufacture)
    if (!form.year_of_manufacture || !Number.isInteger(year) || year < yearBounds.min || year > yearBounds.max) {
      next.year_of_manufacture = `Indiquez une année entre ${yearBounds.min} et ${yearBounds.max}.`
    }

    if (form.hourly_cost === "" || !(Number(form.hourly_cost) >= 0)) {
      next.hourly_cost = "Indiquez le coût d'une heure de vol, en euros."
    }

    for (const field of OPTIONAL_NUMBERS) {
      if (form[field] !== "" && !(Number(form[field]) >= 0)) {
        next[field] = "Indiquez un nombre positif."
      }
    }

    if (!fields) {
      setErrors(next)
      return Object.keys(next).length === 0
    }

    setErrors((previous) => {
      const merged = { ...previous }
      for (const field of fields) merged[field] = next[field]
      return merged
    })
    return fields.every((field) => !next[field])
  }

  const handleSubmit = () => {
    if (!validate()) return

    const input: Record<string, unknown> = {
      registration_number: form.registration_number.trim(),
      model: form.model.trim(),
      year_of_manufacture: Number(form.year_of_manufacture),
      availability_status: form.availability_status,
      maintenance_status: form.maintenance_status,
      hourly_cost: Number(form.hourly_cost),
    }

    // An optional figure is sent when it is filled in, or emptied (then
    // `buildAircraftInput` turns the unreadable number into `null`).
    for (const field of OPTIONAL_NUMBERS) {
      const hadValue = aircraft?.[field] !== null && aircraft?.[field] !== undefined
      if (form[field] !== "") input[field] = Number(form[field])
      else if (hadValue) input[field] = Number.NaN
    }

    const fuelType = form.fuel_type.trim()
    if (fuelType || aircraft?.fuel_type) input.fuel_type = fuelType

    // The stored documents are not sent back: the API keeps them unless a new file replaces them.
    if (aircraft) {
      updateAircraft({
        variables: {
          aircraftId: aircraft.id,
          updateAircraftInput: buildAircraftInput(input),
          file: documentFile,
          image: imageFile,
        },
      })
    } else {
      createAircraft({
        variables: {
          createAircraftInput: buildAircraftInput(input),
          file: documentFile,
          image: imageFile,
        },
      })
    }
  }

  const maintenanceStates = AIRCRAFT_MAINTENANCE_STATE_VALUES.includes(form.maintenance_status)
    ? AIRCRAFT_MAINTENANCE_STATE_VALUES
    : [...AIRCRAFT_MAINTENANCE_STATE_VALUES, form.maintenance_status]

  const shownImage = imagePreview ?? (aircraft?.image_url ? aircraftFileUrl(getBackendBaseUrl(), aircraft.image_url) : null)
  const existingDocuments = aircraft?.documents_url ?? []

  const identificationStep = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="registration_number" label="Immatriculation" required error={errors.registration_number}>
          <Input {...inputProps("registration_number")} placeholder="F-GABC" autoComplete="off" required />
        </Field>
        <Field id="model" label="Modèle" required error={errors.model}>
          <Input {...inputProps("model")} placeholder="Robin DR400-120" autoComplete="off" required />
        </Field>
        <Field id="year_of_manufacture" label="Année de fabrication" required error={errors.year_of_manufacture}>
          <Input
            {...inputProps("year_of_manufacture")}
            type="number"
            inputMode="numeric"
            step="1"
            {...yearBounds}
            placeholder="1998"
            required
            className={cn("tabular-nums", errors.year_of_manufacture && "border-destructive")}
          />
        </Field>
        <Field id="hourly_cost" label="Coût horaire" required error={errors.hourly_cost}>
          <UnitInput {...inputProps("hourly_cost")} unit="€/h" step="0.01" placeholder="150" required />
        </Field>
      </div>
      <section className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold">État</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="availability_status" label="Disponibilité" required>
            <Select
              value={form.availability_status}
              onValueChange={(value) => setField("availability_status", value)}
            >
              <SelectTrigger id="availability_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AIRCRAFT_AVAILABILITY_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {aircraftAvailability(status).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="maintenance_status" label="État de maintenance" required>
            <Select value={form.maintenance_status} onValueChange={(value) => setField("maintenance_status", value)}>
              <SelectTrigger id="maintenance_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {maintenanceStates.map((status) => (
                  <SelectItem key={status} value={status}>
                    {aircraftMaintenanceState(status).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>
    </>
  )

  const characteristicsStep = (
    <>
      <section className="space-y-4">
        <h3 className="text-sm font-semibold">Performances</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="maxAltitude" label="Altitude maximale" error={errors.maxAltitude}>
            <UnitInput {...inputProps("maxAltitude")} unit="ft" step="1" placeholder="12000" />
          </Field>
          <Field id="cruiseSpeed" label="Vitesse de croisière" error={errors.cruiseSpeed}>
            <UnitInput {...inputProps("cruiseSpeed")} unit="kt" step="1" placeholder="110" />
          </Field>
          <Field id="consumption" label="Consommation" error={errors.consumption}>
            <UnitInput {...inputProps("consumption")} unit="L/h" step="1" placeholder="25" />
          </Field>
        </div>
      </section>
      <section className="space-y-4 pt-2">
        <h3 className="text-sm font-semibold">Carburant et masses</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fuel_type" label="Type de carburant">
            <Input {...inputProps("fuel_type")} placeholder="100LL" autoComplete="off" />
          </Field>
          <Field id="fuel_capacity" label="Capacité du réservoir" error={errors.fuel_capacity}>
            <UnitInput {...inputProps("fuel_capacity")} unit="L" step="0.1" placeholder="110" />
          </Field>
          <Field id="empty_weight" label="Masse à vide" error={errors.empty_weight}>
            <UnitInput {...inputProps("empty_weight")} unit="kg" step="0.1" placeholder="580" />
          </Field>
          <Field id="max_takeoff_weight" label="Masse maximale au décollage" error={errors.max_takeoff_weight}>
            <UnitInput {...inputProps("max_takeoff_weight")} unit="kg" step="0.1" placeholder="900" />
          </Field>
        </div>
      </section>
    </>
  )

  const filesStep = (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="image">Photo</Label>
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
            {shownImage ? (
              // A picked file is previewed from memory; a stored photo comes from the API.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownImage} alt="Aperçu de la photo" className="h-full w-full object-cover" />
            ) : (
              <Plane className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              {shownImage ? "Remplacer" : "Choisir une photo"}
            </Button>
            {imageFile && (
              <Button type="button" variant="ghost" size="sm" onClick={clearImage}>
                <X className="h-4 w-4" aria-hidden="true" />
                Retirer
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">PNG ou JPG.</p>
        <input
          ref={imageInputRef}
          id="image"
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          onChange={handleImageChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">Document</Label>
        {existingDocuments.length > 0 && (
          <ul className="space-y-1">
            {existingDocuments.map((url) => (
              <li key={url} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className={cn("min-w-0 break-all", documentFile && "text-muted-foreground line-through")}>
                  {aircraftFileName(url)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {documentFile && (
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-all">{documentFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setDocumentFile(null)}
              aria-label={`Retirer le document ${documentFile.name}`}
              title="Ne pas envoyer ce document"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => documentInputRef.current?.click()}>
          <Paperclip className="h-4 w-4" aria-hidden="true" />
          {documentFile ? "Choisir un autre document" : "Choisir un document"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Manuel de vol, certificat… PDF, DOC ou DOCX.
          {existingDocuments.length > 0 && " Le nouveau document remplacera ceux déjà enregistrés."}
        </p>
        <input
          ref={documentInputRef}
          id="document"
          type="file"
          accept=".pdf,.doc,.docx"
          className="sr-only"
          tabIndex={-1}
          onChange={handleDocumentChange}
        />
      </div>
    </div>
  )

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !open && !loading && onClose()}
      title={isEditing ? `Modifier ${aircraft.registration_number}` : "Ajouter un aéronef"}
      description={
        isEditing
          ? "Mettez à jour les informations de l'aéronef."
          : "Seules les informations marquées d'un astérisque sont obligatoires."
      }
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Enregistrer" : "Ajouter l'aéronef"}
      submitting={loading}
      steps={[
        { title: "Identification", content: identificationStep, validate: () => validate(IDENTIFICATION_FIELDS) },
        { title: "Caractéristiques", content: characteristicsStep, validate: () => validate(OPTIONAL_NUMBERS) },
        { title: "Photo et document", content: filesStep },
      ]}
    />
  )
}
