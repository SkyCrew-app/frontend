import { format, parseISO } from "date-fns"
import * as z from "zod"

export type Taxonomies = {
  aircraftCategories: string[]
  flightTypes: string[]
  licenseTypes: string[]
  maintenanceTypes: string[]
}

type LoadedTaxonomies = Partial<Record<keyof Taxonomies, string[] | null>> | null

/**
 * Listes de taxonomie du formulaire des paramètres, à partir de
 * l'enregistrement chargé. Seules les quatre listes sont reprises (pas de
 * `__typename`), car l'objet est renvoyé tel quel dans `TaxonomiesInput`.
 */
export function taxonomiesFromRecord(record: { taxonomies?: LoadedTaxonomies } | null | undefined): Taxonomies {
  const taxonomies = record?.taxonomies
  return {
    aircraftCategories: [...(taxonomies?.aircraftCategories ?? [])],
    flightTypes: [...(taxonomies?.flightTypes ?? [])],
    licenseTypes: [...(taxonomies?.licenseTypes ?? [])],
    maintenanceTypes: [...(taxonomies?.maintenanceTypes ?? [])],
  }
}

// Day names are stored in French by the API (closure days, maintenance day).
export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const

export const TIME_SLOT_OPTIONS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 heure" },
  { value: 90, label: "1 heure 30" },
  { value: 120, label: "2 heures" },
] as const

export const PILOT_LICENSES = ["PPL", "LAPL", "CPL", "ATPL"] as const

export const FUEL_MANAGEMENT_VALUES = ["self-service", "staff-only", "external"] as const
export type FuelManagement = (typeof FUEL_MANAGEMENT_VALUES)[number]

export const FUEL_MANAGEMENT_OPTIONS: { value: FuelManagement; label: string; hint: string }[] = [
  { value: "self-service", label: "Libre-service", hint: "Les pilotes font le plein eux-mêmes." },
  { value: "staff-only", label: "Personnel uniquement", hint: "Le plein est fait par le personnel du club." },
  { value: "external", label: "Fournisseur externe", hint: "Le plein est assuré par un prestataire." },
]

export const TAXONOMY_LISTS: {
  key: keyof Taxonomies
  title: string
  addTitle: string
  deleteTitle: string
  emptyText: string
  example: string
}[] = [
  {
    key: "aircraftCategories",
    title: "Catégories d'aéronefs",
    addTitle: "Ajouter une catégorie d'aéronef",
    deleteTitle: "Supprimer cette catégorie d'aéronef ?",
    emptyText: "Aucune catégorie d'aéronef pour le moment.",
    example: "Monomoteur",
  },
  {
    key: "flightTypes",
    title: "Types de vols",
    addTitle: "Ajouter un type de vol",
    deleteTitle: "Supprimer ce type de vol ?",
    emptyText: "Aucun type de vol pour le moment.",
    example: "Vol local",
  },
  {
    key: "licenseTypes",
    title: "Types de licences",
    addTitle: "Ajouter un type de licence",
    deleteTitle: "Supprimer ce type de licence ?",
    emptyText: "Aucun type de licence pour le moment.",
    example: "PPL",
  },
  {
    key: "maintenanceTypes",
    title: "Types de maintenance",
    addTitle: "Ajouter un type de maintenance",
    deleteTitle: "Supprimer ce type de maintenance ?",
    emptyText: "Aucun type de maintenance pour le moment.",
    example: "Visite 50 heures",
  },
]

const amount = () =>
  z
    .number({ invalid_type_error: "Indiquez un montant", required_error: "Indiquez un montant" })
    .min(0, { message: "Le montant ne peut pas être négatif" })

const itemList = z.array(z.string())

export const settingsFormSchema = z
  .object({
    clubName: z.string().min(2, { message: "Le nom de l'aéroclub doit contenir au moins 2 caractères" }),
    contactEmail: z.string().email({ message: "Indiquez une adresse e-mail valide" }),
    contactPhone: z
      .string()
      .regex(/^\+?[0-9]{10,14}$/, { message: "Indiquez 10 à 14 chiffres, sans espaces (ex. 0478123456)" }),
    address: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères" }),
    closureDays: z.array(z.string()),
    timeSlotDuration: z
      .number({ invalid_type_error: "Choisissez une durée de créneau", required_error: "Choisissez une durée de créneau" })
      .min(30, { message: "Le créneau dure au moins 30 minutes" })
      .max(120, { message: "Le créneau dure au plus 2 heures" }),
    reservationStartTime: z.string(),
    reservationEndTime: z.string(),
    maintenanceDay: z.string(),
    maintenanceDuration: z
      .number({ invalid_type_error: "Indiquez une durée en heures", required_error: "Indiquez une durée en heures" })
      .int({ message: "La durée de la maintenance doit être un nombre entier d'heures" })
      .min(1, { message: "La maintenance dure au moins 1 heure" })
      .max(24, { message: "La maintenance dure au plus 24 heures" }),
    pilotLicenses: z.array(z.string()),
    membershipFee: amount(),
    // Not editable on this page: sent back as loaded.
    flightHourRate: z.number().nullable(),
    clubRules: z.string(),
    allowGuestPilots: z.boolean(),
    guestPilotFee: amount(),
    fuelManagement: z.enum(FUEL_MANAGEMENT_VALUES),
    fuelPrice: z
      .number({ invalid_type_error: "Indiquez un prix", required_error: "Indiquez un prix" })
      .min(0, { message: "Le prix du carburant ne peut pas être négatif" }),
    taxonomies: z.object({
      aircraftCategories: itemList,
      flightTypes: itemList,
      licenseTypes: itemList,
      maintenanceTypes: itemList,
    }),
    isMaintenanceActive: z.boolean(),
    maintenanceMessage: z.string(),
    // Value of a datetime-local input, empty when no end is planned.
    maintenanceTime: z.string(),
  })
  .refine(
    (values) =>
      !values.reservationStartTime ||
      !values.reservationEndTime ||
      values.reservationEndTime > values.reservationStartTime,
    { path: ["reservationEndTime"], message: "L'heure de fin doit être après l'heure de début" },
  )

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

/** The administration record as `GET_ADMINISTRATION` returns it. */
export type AdministrationRecord = {
  id: number
  clubName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  address?: string | null
  closureDays?: string[] | null
  timeSlotDuration?: number | null
  reservationStartTime?: string | null
  reservationEndTime?: string | null
  maintenanceDay?: string | null
  maintenanceDuration?: number | null
  pilotLicenses?: string[] | null
  membershipFee?: number | null
  flightHourRate?: number | null
  clubRules?: string | null
  allowGuestPilots?: boolean | null
  guestPilotFee?: number | null
  fuelManagement?: string | null
  fuelPrice?: number | null
  isMaintenanceActive?: boolean | null
  maintenanceMessage?: string | null
  maintenanceTime?: string | null
  taxonomies?: LoadedTaxonomies
}

const isFuelManagement = (value: unknown): value is FuelManagement =>
  FUEL_MANAGEMENT_VALUES.includes(value as FuelManagement)

/** Values of the settings form for a loaded record. */
export function settingsFormValuesFromRecord(record: AdministrationRecord): SettingsFormValues {
  return {
    clubName: record.clubName ?? "",
    contactEmail: record.contactEmail ?? "",
    contactPhone: record.contactPhone ?? "",
    address: record.address ?? "",
    closureDays: [...(record.closureDays ?? [])],
    timeSlotDuration: record.timeSlotDuration as number,
    reservationStartTime: record.reservationStartTime ?? "",
    reservationEndTime: record.reservationEndTime ?? "",
    maintenanceDay: record.maintenanceDay ?? "",
    // A missing duration or fee stays empty: the form asks for it instead of inventing a value.
    maintenanceDuration: record.maintenanceDuration as number,
    pilotLicenses: [...(record.pilotLicenses ?? [])],
    membershipFee: record.membershipFee as number,
    flightHourRate: record.flightHourRate ?? null,
    clubRules: record.clubRules || "",
    allowGuestPilots: record.allowGuestPilots || false,
    guestPilotFee: record.guestPilotFee || 0,
    fuelManagement: isFuelManagement(record.fuelManagement) ? record.fuelManagement : "self-service",
    fuelPrice: record.fuelPrice || 0,
    taxonomies: taxonomiesFromRecord(record),
    isMaintenanceActive: record.isMaintenanceActive || false,
    maintenanceMessage: record.maintenanceMessage || "",
    maintenanceTime: record.maintenanceTime ? format(parseISO(record.maintenanceTime), "yyyy-MM-dd'T'HH:mm") : "",
  }
}

/** `UpdateAdministrationInput` for the validated form values. */
export function administrationInputFromValues(id: number, values: SettingsFormValues) {
  return {
    id,
    clubName: values.clubName,
    contactEmail: values.contactEmail,
    contactPhone: values.contactPhone,
    address: values.address,
    closureDays: values.closureDays,
    timeSlotDuration: values.timeSlotDuration,
    reservationStartTime: values.reservationStartTime,
    reservationEndTime: values.reservationEndTime,
    maintenanceDay: values.maintenanceDay,
    maintenanceDuration: values.maintenanceDuration,
    pilotLicenses: values.pilotLicenses,
    membershipFee: values.membershipFee,
    flightHourRate: values.flightHourRate,
    clubRules: values.clubRules,
    allowGuestPilots: values.allowGuestPilots,
    guestPilotFee: values.guestPilotFee,
    fuelManagement: values.fuelManagement,
    fuelPrice: values.fuelPrice,
    taxonomies: values.taxonomies,
    isMaintenanceActive: values.isMaintenanceActive,
    maintenanceMessage: values.maintenanceMessage,
    maintenanceTime: values.maintenanceTime ? new Date(values.maintenanceTime).toISOString() : null,
  }
}

export type SettingsFormTab = "general" | "reservations" | "aircraft" | "members" | "lists"

/** Which tab shows each field, to lead the user to a validation error. */
export const SETTINGS_TAB_FIELDS: Record<SettingsFormTab, (keyof SettingsFormValues)[]> = {
  general: [
    "clubName",
    "contactEmail",
    "contactPhone",
    "address",
    "isMaintenanceActive",
    "maintenanceMessage",
    "maintenanceTime",
  ],
  reservations: [
    "closureDays",
    "timeSlotDuration",
    "reservationStartTime",
    "reservationEndTime",
    "maintenanceDay",
    "maintenanceDuration",
  ],
  aircraft: ["fuelManagement", "fuelPrice"],
  members: ["pilotLicenses", "membershipFee", "allowGuestPilots", "guestPilotFee", "clubRules"],
  lists: ["taxonomies"],
}

/** Tabs holding at least one of the given invalid fields, in display order. */
export function tabsWithErrors(invalidFields: string[]): SettingsFormTab[] {
  return (Object.keys(SETTINGS_TAB_FIELDS) as SettingsFormTab[]).filter((tab) =>
    SETTINGS_TAB_FIELDS[tab].some((field) => invalidFields.includes(field)),
  )
}
