"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
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
  maintenanceTechnicianName,
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
  const { t } = useTranslation("fleet")
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
    ...technicians.map((technician) => ({ value: String(technician.id), label: maintenanceTechnicianName(technician) })),
    ...(currentTechnician && !technicians.some((technician) => String(technician.id) === String(currentTechnician.id))
      ? [
          {
            value: String(currentTechnician.id),
            label: maintenanceTechnicianName(currentTechnician),
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
        title: t("maintenance.form.toast.removeFailed.title"),
        description: t("maintenance.form.toast.removeFailed.description", { name: maintenanceFileName(url) }),
      })
    } finally {
      setRemovingUrl(null)
    }
  }

  // Checks the whole form, or only the fields of one step when they are given.
  const validateForm = (fields?: string[]): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.aircraft_id) {
      newErrors.aircraft_id = t("maintenance.form.validation.aircraft")
    }
    if (!formData.maintenance_type) {
      newErrors.maintenance_type = t("maintenance.form.validation.type")
    }
    if (!formData.status) {
      newErrors.status = t("maintenance.form.validation.status")
    }
    if (!formData.start_date) {
      newErrors.start_date = t("maintenance.form.validation.startDate")
    }
    if (!formData.end_date) {
      newErrors.end_date = t("maintenance.form.validation.endDate")
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = t("maintenance.form.validation.endBeforeStart")
    }
    if (formData.maintenance_cost && !(Number(formData.maintenance_cost) >= 0)) {
      newErrors.maintenance_cost = t("maintenance.form.validation.cost")
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
      toast({ variant: "destructive", title: t("maintenance.form.files.refused"), description: problem })
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
        title: isEditing ? t("maintenance.form.toast.updated.title") : t("maintenance.form.toast.created.title"),
        description: isEditing ? t("shared.changesSaved") : t("maintenance.form.toast.created.description"),
      })
    } catch {
      toast({
        variant: "destructive",
        title: t("shared.saveFailed"),
        description: t("maintenance.form.toast.saveFailed.description"),
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
    // One whole sentence per kind of file: the article differs from one language to the other.
    const removeKey = kind === "image" ? "maintenance.form.files.removeImage" : "maintenance.form.files.removeDocument"
    const discardKey =
      kind === "image" ? "maintenance.form.files.discardImage" : "maintenance.form.files.discardDocument"
    if (existing.length === 0 && picked.length === 0) return null

    return (
      <ul className="space-y-2">
        {existing.map((url) => (
          <li key={url} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 break-all">{maintenanceFileName(url)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{t("maintenance.form.files.stored")}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={removingUrl === url}
              onClick={() => handleRemoveExisting(url)}
              aria-label={t(removeKey, { name: maintenanceFileName(url) })}
              title={t("maintenance.form.files.removeStored")}
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
            <span className="shrink-0 text-xs text-muted-foreground">{t("maintenance.form.files.toSend")}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onRemovePicked(index)}
              aria-label={t(discardKey, { name: file.name })}
              title={t("maintenance.form.files.doNotSend")}
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
          {t("shared.aircraft")}
          <Required />
        </Label>
        <Select value={formData.aircraft_id} onValueChange={(value) => handleChange("aircraft_id", value)}>
          <SelectTrigger
            id="aircraft_id"
            aria-required="true"
            aria-invalid={!!errors.aircraft_id}
            className={cn(errors.aircraft_id && "border-destructive")}
          >
            <SelectValue placeholder={t("maintenance.form.fields.aircraftPlaceholder")} />
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
          {t("common:labels.type")}
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
            <SelectValue placeholder={t("maintenance.form.fields.typePlaceholder")} />
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
          {t("common:labels.status")}
          <Required />
        </Label>
        <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
          <SelectTrigger
            id="status"
            aria-required="true"
            className={cn(errors.status && "border-destructive")}
          >
            <SelectValue placeholder={t("maintenance.form.fields.statusPlaceholder")} />
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
        <Label htmlFor="technician_id">{t("common:labels.technician")}</Label>
        <Select
          value={formData.technician_id || UNASSIGNED}
          onValueChange={(value) => handleChange("technician_id", value === UNASSIGNED ? "" : value)}
        >
          <SelectTrigger id="technician_id">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>{t("shared.unassigned")}</SelectItem>
            {technicianOptions.map((technician) => (
              <SelectItem key={technician.value} value={technician.value}>
                {technician.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {currentTechnician && !formData.technician_id && (
          <p className="text-xs text-muted-foreground">
            {t("maintenance.form.fields.technicianRemovedHint", {
              name: maintenanceTechnicianName(currentTechnician),
            })}
          </p>
        )}
      </div>
    </div>
  )

  const planningStep = (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2" role="group" aria-labelledby="start_date_label">
          <Label id="start_date_label">
            {t("maintenance.form.fields.startDate")}
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
            {t("maintenance.form.fields.endDate")}
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
        <Label htmlFor="description">{t("common:labels.description")}</Label>
        <Textarea
          id="description"
          placeholder={t("maintenance.form.fields.descriptionPlaceholder")}
          rows={4}
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div className="space-y-2 sm:max-w-[calc(50%-0.5rem)]">
        <Label htmlFor="maintenance_cost">{t("common:labels.cost")}</Label>
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
            {t("maintenance.form.fields.costHint")}
          </p>
        )}
      </div>
    </>
  )

  const attachmentsStep = (
    <>
      <p className="text-xs text-muted-foreground">
        {t("maintenance.form.files.limits")}
      </p>

      <div className="space-y-2">
        <Label htmlFor="image-upload">{t("maintenance.form.files.images")}</Label>
        {renderFiles("image", existingImages, imageFiles, removeImage)}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
            <ImageIcon className="h-4 w-4" aria-hidden="true" />
            {t("maintenance.form.files.addImages")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("maintenance.form.files.imageFormats")}</span>
        </div>
        <input
          ref={imageInputRef}
          id="image-upload"
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => addFiles(e, "images")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-upload">{t("maintenance.form.files.documents")}</Label>
        {renderFiles("document", existingDocuments, documentFiles, removeDocument)}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => documentInputRef.current?.click()}>
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            {t("maintenance.form.files.addDocuments")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("maintenance.form.files.documentFormats")}</span>
        </div>
        <input
          ref={documentInputRef}
          id="document-upload"
          type="file"
          className="sr-only"
          tabIndex={-1}
          accept=".pdf,.jpg,.jpeg,.png,.webp"
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
      title={isEditing ? t("maintenance.form.title.edit") : t("shared.newMaintenance")}
      description={
        isEditing
          ? t("maintenance.form.description.edit", {
              registration: maintenance.aircraft.registration_number,
              model: maintenance.aircraft.model,
            })
          : t("maintenance.form.description.create")
      }
      onSubmit={handleSubmit}
      submitLabel={isEditing ? t("common:actions.save") : t("maintenance.form.submit.create")}
      submitting={isSubmitting}
      steps={[
        { title: t("maintenance.form.steps.intervention"), content: interventionStep, validate: () => validateForm(INTERVENTION_FIELDS) },
        { title: t("maintenance.form.steps.planning"), content: planningStep, validate: () => validateForm(PLANNING_FIELDS) },
        { title: t("shared.attachments"), content: attachmentsStep },
      ]}
    />
  )
}
