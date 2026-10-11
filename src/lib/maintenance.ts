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
    return `Le fichier « ${tooLarge.name} » dépasse la taille maximale de 1 Mo.`
  }

  const names = new Set<string>()
  for (const file of files) {
    if (names.has(file.name)) {
      return `Deux fichiers portent le nom « ${file.name} ». Renommez-en un avant de l'ajouter.`
    }
    names.add(file.name)
  }

  if (files.length > MAINTENANCE_UPLOAD_MAX_FILES) {
    return `Vous pouvez joindre au maximum ${MAINTENANCE_UPLOAD_MAX_FILES} fichiers (images et documents confondus).`
  }

  return null
}

// On update the API replaces the stored images (or documents) as soon as it
// receives some, so an upload variable is only set when files were picked.
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
