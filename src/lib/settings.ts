import { format, parseISO } from "date-fns"
import * as z from "zod"
import i18n from "@/lib/i18n"

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

// The stored value stays French; this is what the user reads.
export const weekdayLabel = (day: string): string =>
  (WEEKDAYS as readonly string[]).includes(day) ? i18n.t(`administration:weekday.${day}`) : day

// Role names are stored in French by the API; custom roles are shown as typed.
const TRANSLATED_ROLES = ["Administrateur", "Pilote", "Instructeur", "Technicien"]

export const roleLabel = <T extends string | null | undefined>(name: T): T | string =>
  name && TRANSLATED_ROLES.includes(name) ? i18n.t(`administration:roleName.${name}`) : name

const TIME_SLOT_VALUES = [30, 60, 90, 120] as const

export const timeSlotOptions = () =>
  TIME_SLOT_VALUES.map((value) => ({ value, label: i18n.t(`administration:settings.timeSlot.${value}`) }))

export const PILOT_LICENSES = ["PPL", "LAPL", "CPL", "ATPL"] as const

export const FUEL_MANAGEMENT_VALUES = ["self-service", "staff-only", "external"] as const
export type FuelManagement = (typeof FUEL_MANAGEMENT_VALUES)[number]

export const fuelManagementOptions = (): { value: FuelManagement; label: string; hint: string }[] =>
  FUEL_MANAGEMENT_VALUES.map((value) => ({
    value,
    label: i18n.t(`administration:settings.fuelManagement.${value}.label`),
    hint: i18n.t(`administration:settings.fuelManagement.${value}.hint`),
  }))

const TAXONOMY_KEYS: (keyof Taxonomies)[] = ["aircraftCategories", "flightTypes", "licenseTypes", "maintenanceTypes"]

export const taxonomyLists = (): {
  key: keyof Taxonomies
  title: string
  addTitle: string
  deleteTitle: string
  emptyText: string
  example: string
}[] =>
  TAXONOMY_KEYS.map((key) => ({
    key,
    title: i18n.t(`administration:settings.lists.${key}.title`),
    addTitle: i18n.t(`administration:settings.lists.${key}.addTitle`),
    deleteTitle: i18n.t(`administration:settings.lists.${key}.deleteTitle`),
    emptyText: i18n.t(`administration:settings.lists.${key}.emptyText`),
    example: i18n.t(`administration:settings.lists.${key}.example`),
  }))

// Validation messages of the settings form.
const message = (key: string) => i18n.t(`administration:settings.validation.${key}`)

const amount = () =>
  z
    .number({ invalid_type_error: message("amount"), required_error: message("amount") })
    .min(0, { message: message("amountNegative") })

const itemList = z.array(z.string())

// Built when it is used, so that the messages follow the language.
export const buildSettingsFormSchema = () =>
  z
    .object({
      clubName: z.string().min(2, { message: message("clubName") }),
      contactEmail: z.string().email({ message: message("contactEmail") }),
      contactPhone: z.string().regex(/^\+?[0-9]{10,14}$/, { message: message("contactPhone") }),
      address: z.string().min(5, { message: message("address") }),
      closureDays: z.array(z.string()),
      timeSlotDuration: z
        .number({ invalid_type_error: message("timeSlotRequired"), required_error: message("timeSlotRequired") })
        .min(30, { message: message("timeSlotMin") })
        .max(120, { message: message("timeSlotMax") }),
      reservationStartTime: z.string(),
      reservationEndTime: z.string(),
      maintenanceDay: z.string(),
      maintenanceDuration: z
        .number({
          invalid_type_error: message("maintenanceDurationRequired"),
          required_error: message("maintenanceDurationRequired"),
        })
        .int({ message: message("maintenanceDurationInteger") })
        .min(1, { message: message("maintenanceDurationMin") })
        .max(24, { message: message("maintenanceDurationMax") }),
      pilotLicenses: z.array(z.string()),
      membershipFee: amount(),
      // Not editable on this page: sent back as loaded.
      flightHourRate: z.number().nullable(),
      clubRules: z.string(),
      allowGuestPilots: z.boolean(),
      guestPilotFee: amount(),
      fuelManagement: z.enum(FUEL_MANAGEMENT_VALUES),
      fuelPrice: z
        .number({ invalid_type_error: message("fuelPrice"), required_error: message("fuelPrice") })
        .min(0, { message: message("fuelPriceNegative") }),
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
      { path: ["reservationEndTime"], message: message("endAfterStart") },
    )

// Same schema under its former name: built at each validation.
export const settingsFormSchema = z.lazy(buildSettingsFormSchema)

export type SettingsFormValues = z.infer<ReturnType<typeof buildSettingsFormSchema>>

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
