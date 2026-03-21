import { z } from "zod"

// ---- Auth ----

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis"),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse e-mail est requise")
    .email("Adresse e-mail invalide"),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une majuscule")
      .regex(/[a-z]/, "Le mot de passe doit contenir au moins une minuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre"),
    confirmPassword: z.string().min(1, "La confirmation est requise"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  })

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// ---- Reservation ----

export const reservationSchema = z.object({
  aircraftId: z.number().positive("Sélectionnez un avion"),
  startDate: z.date({ required_error: "Date de début requise" }),
  endDate: z.date({ required_error: "Date de fin requise" }),
  purpose: z.string().optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: "La date de fin doit être après la date de début",
  path: ["endDate"],
})

export type ReservationFormData = z.infer<typeof reservationSchema>

// ---- Flight ----

export const flightCloseSchema = z.object({
  flight_hours: z.number().min(0, "Les heures de vol doivent être positives"),
  flight_type: z.string().min(1, "Le type de vol est requis"),
  origin_icao: z.string().length(4, "Le code OACI doit contenir 4 caractères"),
  destination_icao: z.string().length(4, "Le code OACI doit contenir 4 caractères"),
  weather_conditions: z.string().optional(),
})

export type FlightCloseFormData = z.infer<typeof flightCloseSchema>

// ---- Profile ----

export const profileSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis").max(50, "50 caractères maximum"),
  last_name: z.string().min(1, "Le nom est requis").max(50, "50 caractères maximum"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+33|0)[1-9](\d{2}){4}$/.test(val.replace(/\s/g, "")),
      "Numéro de téléphone invalide"
    ),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// ---- Aircraft ----

export const aircraftSchema = z.object({
  registration: z
    .string()
    .min(1, "L'immatriculation est requise")
    .regex(/^[A-Z]-[A-Z]{4}$/, "Format attendu : F-XXXX"),
  model: z.string().min(1, "Le modèle est requis"),
  total_flight_hours: z.number().min(0, "Les heures de vol doivent être positives"),
  hourly_cost: z.number().min(0, "Le coût horaire doit être positif"),
})

export type AircraftFormData = z.infer<typeof aircraftSchema>
