import { z } from "zod"
import i18n from "@/lib/i18n"
import { isValidPhone } from "@/lib/phone"
import { PASSWORD_MIN_LENGTH } from "@/lib/password"

// The schemas are built once at module load, before the language is known:
// every message is therefore resolved when a value is validated.
// `min` is the one value a message may quote: the shortest password accepted.
const text = (key: string) => ({ message: i18n.t(`profile:validation.${key}`, { min: PASSWORD_MIN_LENGTH }) })

// One message per kind of issue raised by the checks of a field.
const messages =
  (keys: Partial<Record<z.ZodIssueCode, string>>): z.ZodErrorMap =>
  (issue, ctx) => {
    const key = keys[issue.code]
    return key ? text(key) : { message: ctx.defaultError }
  }

// Same rule as zod's `required_error`: only a missing value gets the message.
const required =
  (key: string): z.ZodErrorMap =>
  (_issue, ctx) =>
    typeof ctx.data === "undefined" ? text(key) : { message: ctx.defaultError }

// ---- Auth ----

export const loginSchema = z.object({
  email: z
    .string({ errorMap: messages({ too_small: "emailRequired", invalid_string: "emailInvalid" }) })
    .min(1)
    .email(),
  password: z
    .string({ errorMap: messages({ too_small: "passwordRequired" }) })
    .min(1),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string({ errorMap: messages({ too_small: "emailRequired", invalid_string: "emailInvalid" }) })
    .min(1)
    .email(),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    // Three pattern checks with their own message: an error map cannot tell
    // them apart, so they are refinements, still all reported, in this order.
    password: z
      .string({ errorMap: messages({ too_small: "passwordTooShort" }) })
      .min(PASSWORD_MIN_LENGTH)
      .refine((value) => /[A-Z]/.test(value), () => text("passwordUppercase"))
      .refine((value) => /[a-z]/.test(value), () => text("passwordLowercase"))
      .refine((value) => /[0-9]/.test(value), () => text("passwordDigit")),
    confirmPassword: z.string({ errorMap: messages({ too_small: "confirmationRequired" }) }).min(1),
  })
  .refine((data) => data.password === data.confirmPassword, () => ({
    ...text("passwordMismatch"),
    path: ["confirmPassword"],
  }))

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// ---- Reservation ----

export const reservationSchema = z.object({
  aircraftId: z.number({ errorMap: messages({ too_small: "aircraftRequired" }) }).positive(),
  startDate: z.date({ errorMap: required("startDateRequired") }),
  endDate: z.date({ errorMap: required("endDateRequired") }),
  purpose: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, () => ({
  ...text("endDateBeforeStart"),
  path: ["endDate"],
}))

export type ReservationFormData = z.infer<typeof reservationSchema>

// ---- Flight ----

export const flightCloseSchema = z.object({
  flight_hours: z.number({ errorMap: messages({ too_small: "flightHoursNegative" }) }).min(0),
  flight_type: z.string({ errorMap: messages({ too_small: "flightTypeRequired" }) }).min(1),
  origin_icao: z.string({ errorMap: messages({ too_small: "icaoLength", too_big: "icaoLength" }) }).length(4),
  destination_icao: z.string({ errorMap: messages({ too_small: "icaoLength", too_big: "icaoLength" }) }).length(4),
  weather_conditions: z.string().optional(),
})

export type FlightCloseFormData = z.infer<typeof flightCloseSchema>

// ---- Profile ----

export const profileSchema = z.object({
  first_name: z
    .string({ errorMap: messages({ too_small: "firstNameRequired", too_big: "nameTooLong" }) })
    .min(1)
    .max(50),
  last_name: z
    .string({ errorMap: messages({ too_small: "lastNameRequired", too_big: "nameTooLong" }) })
    .min(1)
    .max(50),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || isValidPhone(val),
      () => text("phoneInvalid")
    ),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// ---- Aircraft ----

export const aircraftSchema = z.object({
  registration: z
    .string({ errorMap: messages({ too_small: "registrationRequired", invalid_string: "registrationFormat" }) })
    .min(1)
    .regex(/^[A-Z]-[A-Z]{4}$/),
  model: z.string({ errorMap: messages({ too_small: "modelRequired" }) }).min(1),
  total_flight_hours: z.number({ errorMap: messages({ too_small: "flightHoursNegative" }) }).min(0),
  hourly_cost: z.number({ errorMap: messages({ too_small: "hourlyCostNegative" }) }).min(0),
})

export type AircraftFormData = z.infer<typeof aircraftSchema>
