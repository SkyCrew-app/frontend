import * as z from "zod"
import i18n from "@/lib/i18n"

/**
 * Fields `CreateIncidentInput` declares as `String!`: they become required
 * as soon as "an incident occurred" is switched on.
 */
const REQUIRED_INCIDENT_FIELDS = [
  { path: "severity_level", messageKey: "flights:recapValidation.severityRequired" },
  { path: "incident_description", messageKey: "flights:recapValidation.descriptionRequired" },
  { path: "incident_priority", messageKey: "flights:recapValidation.priorityRequired" },
  { path: "incident_category", messageKey: "flights:recapValidation.categoryRequired" },
] as const

// Built on demand so the messages follow the current language.
export const buildFlightRecapSchema = () =>
  z
    .object({
      flight_hours: z.number().min(0, i18n.t("flights:recapValidation.flightHoursNegative")),
      flight_type: z.string().min(1, i18n.t("flights:recapValidation.flightTypeRequired")),
      origin_icao: z.string().length(4, i18n.t("flights:recapValidation.icaoLength")),
      destination_icao: z.string().length(4, i18n.t("flights:recapValidation.icaoLength")),
      weather_conditions: z.string().optional(),
      number_of_passengers: z.number().int().min(0).optional(),
      encoded_polyline: z.string().optional(),
      distance_km: z.number().min(0, i18n.t("flights:recapValidation.distanceNegative")),
      estimated_flight_time: z.number().nullable(),
      // Shown read-only on the closing page, never sent back to the API.
      waypoints: z.string().optional(),
      incidentOccurred: z.boolean().default(false),
      // The incident sub-form empties this field when the switch is turned off.
      incident_date: z.date().nullable().optional(),
      severity_level: z.enum(["low", "medium", "high"]).optional(),
      incident_description: z.string().optional(),
      // Written by the pilot when closing the flight; kept as the logbook remarks.
      flightNotes: z.string().max(2000, i18n.t("flights:recapValidation.notesTooLong")).optional(),
      damage_report: z.string().optional(),
      corrective_actions: z.string().optional(),
      incident_status: z.string().optional(),
      incident_priority: z.enum(["low", "medium", "high"]).optional(),
      incident_category: z.enum(["mechanical", "electrical", "weather", "human_error", "other"]).optional(),
    })
    .superRefine((values, ctx) => {
      if (!values.incidentOccurred) return

      for (const { path, messageKey } of REQUIRED_INCIDENT_FIELDS) {
        const value = values[path]
        if (typeof value !== "string" || value.trim() === "") {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: i18n.t(messageKey) })
        }
      }
    })

export const flightRecapSchema = buildFlightRecapSchema()

export type FlightRecapFormValues = z.infer<typeof flightRecapSchema>
