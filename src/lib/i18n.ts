import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import { enGB, fr as frLocale } from "date-fns/locale"

import frCommon from "@/locales/fr/common.json"
import frNav from "@/locales/fr/nav.json"
import frAuth from "@/locales/fr/auth.json"
import frDashboard from "@/locales/fr/dashboard.json"
import frNotifications from "@/locales/fr/notifications.json"
import frFleet from "@/locales/fr/fleet.json"
import frReservations from "@/locales/fr/reservations.json"
import frFlights from "@/locales/fr/flights.json"
import frInstruction from "@/locales/fr/instruction.json"
import frAdministration from "@/locales/fr/administration.json"
import frProfile from "@/locales/fr/profile.json"
import frChecklists from "@/locales/fr/checklists.json"
import frArticles from "@/locales/fr/articles.json"

import enCommon from "@/locales/en/common.json"
import enNav from "@/locales/en/nav.json"
import enAuth from "@/locales/en/auth.json"
import enDashboard from "@/locales/en/dashboard.json"
import enNotifications from "@/locales/en/notifications.json"
import enFleet from "@/locales/en/fleet.json"
import enReservations from "@/locales/en/reservations.json"
import enFlights from "@/locales/en/flights.json"
import enInstruction from "@/locales/en/instruction.json"
import enAdministration from "@/locales/en/administration.json"
import enProfile from "@/locales/en/profile.json"
import enChecklists from "@/locales/en/checklists.json"
import enArticles from "@/locales/en/articles.json"

export const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
] as const

export type Language = (typeof LANGUAGES)[number]["code"]

const STORAGE_KEY = "skycrew-language"

export const resources = {
  fr: {
    common: frCommon,
    nav: frNav,
    auth: frAuth,
    dashboard: frDashboard,
    notifications: frNotifications,
    fleet: frFleet,
    reservations: frReservations,
    flights: frFlights,
    instruction: frInstruction,
    administration: frAdministration,
    profile: frProfile,
    checklists: frChecklists,
    articles: frArticles,
  },
  en: {
    common: enCommon,
    nav: enNav,
    auth: enAuth,
    dashboard: enDashboard,
    notifications: enNotifications,
    fleet: enFleet,
    reservations: enReservations,
    flights: enFlights,
    instruction: enInstruction,
    administration: enAdministration,
    profile: enProfile,
    checklists: enChecklists,
    articles: enArticles,
  },
}

// Starts in French, the language the server renders; the browser's choice is
// applied once the page is mounted (see Providers).
i18n.use(initReactI18next).init({
  resources,
  lng: "fr",
  fallbackLng: "fr",
  defaultNS: "common",
  ns: Object.keys(resources.fr),
  interpolation: {
    escapeValue: false, // React already escapes
  },
  returnNull: false,
})

const isLanguage = (value: unknown): value is Language => LANGUAGES.some((language) => language.code === value)

// The language the member chose, otherwise the one of their browser:
// French for a French browser, English for everybody else.
export const preferredLanguage = (): Language => {
  if (typeof window === "undefined") return "fr"
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Storage can be blocked: fall back to the browser language.
  }
  return window.navigator.language?.toLowerCase().startsWith("fr") ? "fr" : "en"
}

export const applyLanguage = async (language: Language) => {
  if (typeof document !== "undefined") document.documentElement.lang = language
  if (i18n.language !== language) await i18n.changeLanguage(language)
}

// Label helpers outside components read the language directly, so the page
// is reloaded for every text to follow.
export const chooseLanguage = async (language: Language) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Without storage the choice only lasts for this page.
  }
  await applyLanguage(language)
  window.location.reload()
}

export const currentLanguage = (): Language => (isLanguage(i18n.language) ? i18n.language : "fr")

/** Locale for `Intl` and `toLocale…String`. */
export const currentLocale = () => (currentLanguage() === "en" ? "en-GB" : "fr-FR")

/** Locale for date-fns `format(date, pattern, { locale })`. */
export const dateFnsLocale = () => (currentLanguage() === "en" ? enGB : frLocale)

export default i18n
