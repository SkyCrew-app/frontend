import i18n from "@/lib/i18n"

export interface MaintenanceFormValues {
  id?: string
  aircraft_id: string
  maintenance_type: string
  status: string
  start_date: Date
  end_date: Date
  description: string
  maintenance_cost: string
  technician_id: string
}

// The API expects integer ids and a numeric cost, while the form holds strings.
export const toMaintenanceInput = (formData: MaintenanceFormValues) => ({
  aircraft_id: Number.parseInt(formData.aircraft_id, 10),
  maintenance_type: formData.maintenance_type,
  status: formData.status,
  start_date: formData.start_date,
  end_date: formData.end_date,
  description: formData.description,
  maintenance_cost: Number.parseFloat(formData.maintenance_cost) || 0,
  // null is meaningful: it removes the technician currently assigned.
  technician_id: formData.technician_id ? Number.parseInt(formData.technician_id, 10) : null,
})

export interface MaintenanceAttachments {
  images?: File[]
  documents?: File[]
}

// Limits applied by the API to every upload request: size of one file (in
// bytes) and number of files, images and documents together.
export const MAINTENANCE_UPLOAD_MAX_FILE_SIZE = 1_000_000
export const MAINTENANCE_UPLOAD_MAX_FILES = 10

/**
 * Checks the files picked for a maintenance against what the API accepts and
 * returns the message to show, or `null` when they can be sent. The API stores
 * the files of a maintenance side by side under their own name, so two files
 * cannot share one.
 */
export function validateMaintenanceAttachments({ images = [], documents = [] }: MaintenanceAttachments): string | null {
  const files = [...images, ...documents]

  const tooLarge = files.find((file) => file.size > MAINTENANCE_UPLOAD_MAX_FILE_SIZE)
  if (tooLarge) {
    return i18n.t("fleet:maintenance.form.files.tooLarge", { name: tooLarge.name })
  }

  const names = new Set<string>()
  for (const file of files) {
    if (names.has(file.name)) {
      return i18n.t("fleet:maintenance.form.files.duplicateName", { name: file.name })
    }
    names.add(file.name)
  }

  if (files.length > MAINTENANCE_UPLOAD_MAX_FILES) {
    return i18n.t("fleet:maintenance.form.files.tooMany", { max: MAINTENANCE_UPLOAD_MAX_FILES })
  }

  return null
}

// On update the API adds the files it receives to the stored ones; an upload
// variable is only set when files were picked.
const toMaintenanceUploads = ({ images, documents }: MaintenanceAttachments) => ({
  ...(images && images.length > 0 && { images }),
  ...(documents && documents.length > 0 && { files: documents }),
})

export const buildCreateMaintenanceVariables = (formData: MaintenanceFormValues & MaintenanceAttachments) => ({
  createMaintenanceInput: toMaintenanceInput(formData),
  ...toMaintenanceUploads(formData),
})

/** Returns `null` when the maintenance to update has no valid identifier. */
export const buildUpdateMaintenanceVariables = (formData: MaintenanceFormValues & MaintenanceAttachments) => {
  const id = Number.parseInt(formData.id ?? "", 10)
  if (!Number.isInteger(id)) return null

  return {
    updateMaintenanceInput: { id, ...toMaintenanceInput(formData) },
    ...toMaintenanceUploads(formData),
  }
}

export const maintenanceFileName = (path: string) => {
  const name = path.split("/").pop() || path
  try {
    return decodeURIComponent(name)
  } catch {
    return name
  }
}

// The API returns the path of a file as it is stored; each segment is encoded
// so that names with spaces, accents, `#` or `?` still resolve.
export const maintenanceFileUrl = (baseUrl: string, path: string) =>
  `${baseUrl}${path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`

type StatusVariant = "success" | "warning" | "info" | "danger" | "neutral"

// One wording per maintenance type (fleet:maintenanceType.<code>), wherever it is shown.
export const MAINTENANCE_TYPE_VALUES: string[] = [
  "INSPECTION",
  "REPAIR",
  "OVERHAUL",
  "SOFTWARE_UPDATE",
  "CLEANING",
  "OTHER",
]

// An unknown code is never shown raw: it reads as "other".
export const maintenanceTypeLabel = (type: string | null | undefined): string => {
  if (!type) return "—"
  const code = type.toUpperCase()
  return i18n.t(`fleet:maintenanceType.${MAINTENANCE_TYPE_VALUES.includes(code) ? code : "OTHER"}`)
}

// One wording (fleet:maintenanceStatus.<code>) and one colour per maintenance status, wherever it is shown.
const MAINTENANCE_STATUS_VARIANTS: Record<string, StatusVariant> = {
  PLANNED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
}

export const MAINTENANCE_STATUS_VALUES = Object.keys(MAINTENANCE_STATUS_VARIANTS)

export const maintenanceStatus = (status: string | null | undefined): { label: string; variant: StatusVariant } => {
  const code = (status ?? "").toUpperCase()
  const variant = MAINTENANCE_STATUS_VARIANTS[code]
  return variant
    ? { label: i18n.t(`fleet:maintenanceStatus.${code}`), variant }
    : { label: status || "—", variant: "neutral" }
}

// "John Doe", or the e-mail address when no name is known.
export const maintenanceTechnicianName = (technician: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}) => [technician.first_name, technician.last_name].filter(Boolean).join(" ") || technician.email || "—"

// "John Doe · john@example.com"
export const maintenanceTechnicianLabel = (technician: {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}) =>
  [[technician.first_name, technician.last_name].filter(Boolean).join(" "), technician.email]
    .filter(Boolean)
    .join(" · ") || "—"
