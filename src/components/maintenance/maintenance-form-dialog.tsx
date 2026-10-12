"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useMutation } from "@apollo/client"
import { startOfDay } from "date-fns"
import { FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import type { Maintenance } from "@/interfaces/maintenance"
import { useToast } from "@/components/hooks/use-toast"
import {
  MAINTENANCE_STATUS_VALUES,
  MAINTENANCE_TYPE_VALUES,
  maintenanceFileName,
  maintenanceStatus,
  maintenanceTypeLabel,
  validateMaintenanceAttachments,
} from "@/lib/maintenance"
import { REMOVE_MAINTENANCE_ATTACHMENT } from "@/graphql/maintenance"
import { cn } from "@/lib/utils"

interface Aircraft {
  id: string | number
  registration_number: string
  model: string
}

interface Technician {
  id: string | number
  email: string
  first_name?: string
  last_name?: string
  role?: {
    id: string
    role_name: string
  }
}

interface MaintenanceFormDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  maintenance?: Maintenance | null
  aircrafts: Aircraft[]
  technicians: Technician[]
  onSubmit: (formData: MaintenanceFormData) => Promise<void>
}

interface MaintenanceFormData {
  id?: string
  aircraft_id: string
  maintenance_type: string
  status: string
  start_date: Date
  end_date: Date
  description: string
  maintenance_cost: string
  technician_id: string
  images?: File[]
  documents?: File[]
}

// Fields checked when leaving each step of the form.
const INTERVENTION_FIELDS = ["aircraft_id", "maintenance_type", "status"]
const PLANNING_FIELDS = ["start_date", "end_date", "maintenance_cost"]

// Value of the "nobody" entry of the technician list (a select item cannot be empty).
const UNASSIGNED = "unassigned"

const emptyForm = (): MaintenanceFormData => ({
  aircraft_id: "",
  maintenance_type: "INSPECTION",
  status: "PLANNED",
  start_date: new Date(),
  end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
  description: "",
  maintenance_cost: "",
  technician_id: "",
  images: [],
  documents: [],
})

const technicianName = (technician: Technician) =>
  [technician.first_name, technician.last_name].filter(Boolean).join(" ") || technician.email

function Required() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" "}
      *
    </span>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null
}

export function MaintenanceFormDialog({
  isOpen,
  onOpenChange,
  maintenance,
  aircrafts,
  technicians,
  onSubmit,
}: MaintenanceFormDialogProps) {
  const isEditing = !!maintenance
  const { toast } = useToast()
  const [removeAttachment] = useMutation(REMOVE_MAINTENANCE_ATTACHMENT, { refetchQueries: "active" })
  const [removedUrls, setRemovedUrls] = useState<string[]>([])
  const [removingUrl, setRemovingUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<MaintenanceFormData>(emptyForm)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRemovedUrls([])
    if (maintenance) {
      setFormData({
        id: maintenance.id.toString(),
        aircraft_id: maintenance.aircraft.id.toString(),
        maintenance_type: maintenance.maintenance_type,
        status: maintenance.status,
        start_date: new Date(maintenance.start_date),
        end_date: new Date(maintenance.end_date),
        description: maintenance.description || "",
        maintenance_cost: maintenance.maintenance_cost?.toString() || "",
        technician_id: maintenance.technician?.id?.toString() || "",
        images: [],
        documents: [],
      })
    } else {
      setFormData(emptyForm())
    }
    setImageFiles([])
    setDocumentFiles([])
    setErrors({})
  }, [maintenance, isOpen])

  // Files already stored, minus the ones removed since the dialog opened.
  const existingImages = (maintenance?.images_url || []).filter((url) => !removedUrls.includes(url))
  const existingDocuments = (maintenance?.documents_url || []).filter((url) => !removedUrls.includes(url))

  // The technician of the maintenance stays selectable even when he is no longer in the list.
  const currentTechnician = maintenance?.technician
  const technicianOptions = [
    ...technicians.map((technician) => ({ value: String(technician.id), label: technicianName(technician) })),
    ...(currentTechnician && !technicians.some((technician) => String(technician.id) === String(currentTechnician.id))
      ? [
          {
            value: String(currentTechnician.id),
            label: currentTechnician.first_name || currentTechnician.email,
          },
        ]
      : []),
  ]

  const handleRemoveExisting = async (url: string) => {
    if (!maintenance) return
    setRemovingUrl(url)
    try {
      await removeAttachment({ variables: { maintenanceId: Number(maintenance.id), url } })
      setRemovedUrls((previous) => [...previous, url])
    } catch {
      toast({
        variant: "destructive",
        title: "Retrait impossible",
        description: `Le fichier « ${maintenanceFileName(url)} » n'a pas pu être retiré. Réessayez.`,
      })
    } finally {
      setRemovingUrl(null)
    }
  }

  // Checks the whole form, or only the fields of one step when they are given.
  const validateForm = (fields?: string[]): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.aircraft_id) {
      newErrors.aircraft_id = "Sélectionnez un aéronef."
    }
    if (!formData.maintenance_type) {
      newErrors.maintenance_type = "Sélectionnez un type de maintenance."
    }
    if (!formData.status) {
      newErrors.status = "Sélectionnez un statut."
    }
    if (!formData.start_date) {
      newErrors.start_date = "Sélectionnez une date de début."
    }
    if (!formData.end_date) {
      newErrors.end_date = "Sélectionnez une date de fin."
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = "La date de fin doit être postérieure à la date de début."
    }
    if (formData.maintenance_cost && !(Number(formData.maintenance_cost) >= 0)) {
      newErrors.maintenance_cost = "Le coût doit être un nombre positif, par exemple 450 ou 450.50."
    }

    if (!fields) {
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    setErrors((previous) => {
      const merged = { ...previous }
      for (const field of fields) {
        if (newErrors[field]) merged[field] = newErrors[field]
        else delete merged[field]
      }
      return merged
    })
    return fields.every((field) => !newErrors[field])
  }

  const handleChange = <K extends keyof MaintenanceFormData>(field: K, value: MaintenanceFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // A start date after the end date moves the end date along.
  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return
    handleChange("start_date", date)
    if (formData.end_date && date > formData.end_date) {
      handleChange("end_date", date)
    }
  }

  // Adds the picked files unless the API would refuse the resulting selection.
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>, kind: "images" | "documents") => {
    const picked = Array.from(e.target.files || [])
    // Lets the same file be picked again after it was removed.
    e.target.value = ""
    if (picked.length === 0) return

    const images = kind === "images" ? [...imageFiles, ...picked] : imageFiles
    const documents = kind === "documents" ? [...documentFiles, ...picked] : documentFiles
    const problem = validateMaintenanceAttachments({ images, documents })

    if (problem) {
      toast({ variant: "destructive", title: "Fichier refusé", description: problem })
      return
    }

    setImageFiles(images)
    setDocumentFiles(documents)
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeDocument = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const submitData = {
        ...formData,
        images: imageFiles,
        documents: documentFiles,
      }
      await onSubmit(submitData)
      onOpenChange(false)
      toast({
        title: isEditing ? "Maintenance mise à jour" : "Maintenance créée",
        description: isEditing
          ? "Les modifications ont été enregistrées."
          : "La nouvelle maintenance a été ajoutée à la liste.",
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "La maintenance n'a pas pu être enregistrée. Vérifiez les informations puis réessayez.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFiles = (
    kind: "image" | "document",
    existing: string[],
    picked: File[],
    onRemovePicked: (index: number) => void,
  ) => {
    const Icon = kind === "image" ? ImageIcon : FileText
    const article = kind === "image" ? "l'image" : "le document"
    if (existing.length === 0 && picked.length === 0) return null

    return (
      <ul className="space-y-2">
        {existing.map((url) => (
          <li key={url} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-all">{maintenanceFileName(url)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">Enregistré</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={removingUrl === url}
              onClick={() => handleRemoveExisting(url)}
              aria-label={`Retirer ${article} ${maintenanceFileName(url)}`}
              title="Retirer ce fichier de la maintenance"
            >
              {removingUrl === url ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </li>
        ))}
        {picked.map((file, index) => (
          <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            {/* No preview: a picked file is only named until it is uploaded. */}
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-all">{file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">À envoyer</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onRemovePicked(index)}
              aria-label={`Supprimer ${article} ${file.name}`}
              title="Ne pas envoyer ce fichier"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    )
  }

  const interventionStep = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="aircraft_id">
          Aéronef
          <Required />
        </Label>
        <Select value={formData.aircraft_id} onValueChange={(value) => handleChange("aircraft_id", value)}>
          <SelectTrigger
            id="aircraft_id"
            aria-required="true"
            aria-invalid={!!errors.aircraft_id}
            className={cn(errors.aircraft_id && "border-destructive")}
          >
            <SelectValue placeholder="Sélectionner un aéronef" />
          </SelectTrigger>
          <SelectContent>
            {aircrafts.map((aircraft) => (
              <SelectItem key={aircraft.id} value={String(aircraft.id)}>
                {aircraft.registration_number} · {aircraft.model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.aircraft_id} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="maintenance_type">
          Type
          <Required />
        </Label>
        <Select
          value={formData.maintenance_type}
          onValueChange={(value) => handleChange("maintenance_type", value)}
        >
          <SelectTrigger
            id="maintenance_type"
            aria-required="true"
            className={cn(errors.maintenance_type && "border-destructive")}
          >
            <SelectValue placeholder="Sélectionner un type" />
          </SelectTrigger>
          <SelectContent>
            {MAINTENANCE_TYPE_VALUES.map((type) => (
              <SelectItem key={type} value={type}>
                {maintenanceTypeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.maintenance_type} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">
          Statut
          <Required />
        </Label>
        <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
          <SelectTrigger
            id="status"
            aria-required="true"
            className={cn(errors.status && "border-destructive")}
          >
            <SelectValue placeholder="Sélectionner un statut" />
          </SelectTrigger>
          <SelectContent>
            {MAINTENANCE_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {maintenanceStatus(status).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={errors.status} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="technician_id">Technicien</Label>
        <Select
          value={formData.technician_id || UNASSIGNED}
          onValueChange={(value) => handleChange("technician_id", value === UNASSIGNED ? "" : value)}
        >
          <SelectTrigger id="technician_id">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Non assigné</SelectItem>
            {technicianOptions.map((technician) => (
              <SelectItem key={technician.value} value={technician.value}>
                {technician.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const planningStep = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2" role="group" aria-labelledby="start_date_label">
          <Label id="start_date_label">
            Date de début
            <Required />
          </Label>
          <DatePicker
            date={formData.start_date}
            onSelect={handleStartDateChange}
            className={cn(errors.start_date && "border-destructive")}
          />
          <FieldError message={errors.start_date} />
        </div>

        <div className="space-y-2" role="group" aria-labelledby="end_date_label">
          <Label id="end_date_label">
            Date de fin
            <Required />
          </Label>
          <DatePicker
            date={formData.end_date}
            onSelect={(date) => date && handleChange("end_date", date)}
            fromDate={formData.start_date ? startOfDay(formData.start_date) : undefined}
            className={cn(errors.end_date && "border-destructive")}
          />
          <FieldError message={errors.end_date} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Ex. : visite des 50 heures, remplacement des bougies"
          rows={4}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="space-y-2 sm:max-w-[calc(50%-0.5rem)]">
        <Label htmlFor="maintenance_cost">Coût</Label>
        <div className="relative">
          <Input
            id="maintenance_cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="450"
            value={formData.maintenance_cost}
            onChange={(e) => handleChange("maintenance_cost", e.target.value)}
            aria-invalid={!!errors.maintenance_cost}
            aria-describedby="maintenance_cost_hint"
            className={cn("pr-8 tabular-nums", errors.maintenance_cost && "border-destructive")}
          />
          <span
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            €
          </span>
        </div>
        {errors.maintenance_cost ? (
          <FieldError message={errors.maintenance_cost} />
        ) : (
          <p id="maintenance_cost_hint" className="text-xs text-muted-foreground">
            En euros. Laissez vide si le coût n&apos;est pas encore connu.
          </p>
        )}
      </div>
    </>
  )

  const attachmentsStep = (
    <>
      <p className="text-xs text-muted-foreground">
        1 Mo maximum par fichier, 10 fichiers par envoi (images et documents confondus).
      </p>

      <div className="space-y-2">
        <Label htmlFor="image-upload">Images</Label>
        {renderFiles("image", existingImages, imageFiles, removeImage)}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            Ajouter des images
          </Button>
          <span className="text-xs text-muted-foreground">PNG ou JPG</span>
        </div>
        <input
          ref={imageInputRef}
          id="image-upload"
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept="image/png, image/jpeg, image/jpg"
          multiple
          onChange={(e) => addFiles(e, "images")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-upload">Documents</Label>
        {renderFiles("document", existingDocuments, documentFiles, removeDocument)}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => documentInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            Ajouter des documents
          </Button>
          <span className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS ou XLSX</span>
        </div>
        <input
          ref={documentInputRef}
          id="document-upload"
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept=".pdf,.doc,.docx,.xls,.xlsx"
          multiple
          onChange={(e) => addFiles(e, "documents")}
        />
      </div>
    </>
  )

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !isSubmitting && onOpenChange(open)}
      title={isEditing ? "Modifier la maintenance" : "Nouvelle maintenance"}
      description={
        isEditing
          ? `Intervention sur ${maintenance.aircraft.registration_number} (${maintenance.aircraft.model}).`
          : "Planifiez une intervention sur un aéronef de la flotte."
      }
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Enregistrer" : "Créer la maintenance"}
      submitting={isSubmitting}
      steps={[
        { title: "Intervention", content: interventionStep, validate: () => validateForm(INTERVENTION_FIELDS) },
        { title: "Planification", content: planningStep, validate: () => validateForm(PLANNING_FIELDS) },
        { title: "Pièces jointes", content: attachmentsStep },
      ]}
    />
  )
}
