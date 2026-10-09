import * as z from "zod"

/**
 * Champs que `CreateIncidentInput` déclare `String!` : ils deviennent obligatoires
 * dès que « un incident est survenu » est coché.
 */
const REQUIRED_INCIDENT_FIELDS = [
  { path: "severity_level", message: "La gravité de l'incident est requise" },
  { path: "incident_description", message: "La description de l'incident est requise" },
  { path: "incident_priority", message: "La priorité de l'incident est requise" },
  { path: "incident_category", message: "La catégorie de l'incident est requise" },
] as const

export const flightRecapSchema = z
  .object({
    flight_hours: z.number().min(0, "Les heures de vol ne peuvent pas être négatives"),
    flight_type: z.string().min(1, "Le type de vol est requis"),
    origin_icao: z.string().length(4, "Le code ICAO doit avoir 4 caractères"),
    destination_icao: z.string().length(4, "Le code ICAO doit avoir 4 caractères"),
    weather_conditions: z.string().optional(),
    number_of_passengers: z.number().int().min(0).optional(),
    encoded_polyline: z.string().optional(),
    distance_km: z.number().min(0, "La distance ne peut pas être négative"),
    estimated_flight_time: z.number().nullable(),
    // Affiché en lecture seule sur la page de clôture, jamais renvoyé à l'API.
    waypoints: z.string().optional(),
    incidentOccurred: z.boolean().default(false),
    // Le sous-formulaire d'incident vide ce champ quand l'interrupteur est désactivé.
    incident_date: z.date().nullable().optional(),
    severity_level: z.enum(["low", "medium", "high"]).optional(),
    incident_description: z.string().optional(),
    damage_report: z.string().optional(),
    corrective_actions: z.string().optional(),
    incident_status: z.string().optional(),
    incident_priority: z.enum(["low", "medium", "high"]).optional(),
    incident_category: z.enum(["mechanical", "electrical", "weather", "human_error", "other"]).optional(),
    flightNotes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.incidentOccurred) return

    for (const { path, message } of REQUIRED_INCIDENT_FIELDS) {
      const value = values[path]
      if (typeof value !== "string" || value.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
      }
    }
  })

export type FlightRecapFormValues = z.infer<typeof flightRecapSchema>
