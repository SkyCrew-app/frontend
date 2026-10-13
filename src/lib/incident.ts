// One wording and one colour per incident severity, priority, status and category, wherever
// an incident is shown. The API stores free strings (codes of the close-flight form, French
// words in older data): everything is brought back to the same few values here.

export interface IncidentPerson {
  id: number
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

export interface Incident {
  id: number
  incident_date: string
  description: string
  damage_report?: string | null
  corrective_actions?: string | null
  severity_level: string
  status: string
  priority: string
  category: string
  resolution_note?: string | null
  resolved_at?: string | null
  resolved_by?: IncidentPerson | null
  aircraft: { id: number; registration_number: string; model?: string | null }
  flight?: {
    id: number
    origin_icao?: string | null
    destination_icao?: string | null
    departure_time?: string | null
    flight_hours?: number | null
    flight_type?: string | null
    reservation?: { id: number; start_time?: string | null } | null
  } | null
  user: IncidentPerson
}

export type IncidentLevel = "low" | "medium" | "high"
export type IncidentStatusKey = "open" | "in_progress" | "resolved"
type Variant = "success" | "warning" | "info" | "danger" | "neutral"

// "Élevée", " elevee " and "ELEVEE" are the same value; so are "in_progress", "In progress" and "en-cours".
const normalise = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_")

const LEVEL_ALIASES: Record<IncidentLevel, string[]> = {
  low: ["low", "faible", "basse", "bas", "mineur", "mineure", "minor", "leger", "legere"],
  medium: ["medium", "moyen", "moyenne", "modere", "moderee", "moderate", "normal", "normale"],
  high: ["high", "eleve", "elevee", "haut", "haute", "grave", "critique", "critical", "majeur", "majeure", "major", "severe", "urgent", "urgente"],
}

const STATUS_ALIASES: Record<IncidentStatusKey, string[]> = {
  open: ["ouvert", "ouverte", "open", "opened", "nouveau", "new", "reopened", "rouvert"],
  in_progress: ["en_cours", "in_progress", "inprogress", "progress", "pending", "en_traitement", "pris_en_charge"],
  resolved: ["resolu", "resolue", "resolved", "closed", "clos", "close", "cloture", "cloturee", "ferme", "fermee", "done", "termine", "terminee"],
}

const lookup = <K extends string>(aliases: Record<K, string[]>, value: string | null | undefined): K | null => {
  const key = normalise(value)
  if (!key) return null
  return (Object.keys(aliases) as K[]).find((candidate) => aliases[candidate].includes(key)) ?? null
}

export const incidentLevel = (value: string | null | undefined): IncidentLevel | null => lookup(LEVEL_ALIASES, value)

const SEVERITIES: Record<IncidentLevel, { label: string; variant: Variant }> = {
  low: { label: "Faible", variant: "neutral" },
  medium: { label: "Moyenne", variant: "warning" },
  high: { label: "Élevée", variant: "danger" },
}

export const INCIDENT_LEVELS: IncidentLevel[] = ["low", "medium", "high"]

export const incidentSeverity = (
  value: string | null | undefined,
): { level: IncidentLevel | null; label: string; variant: Variant } => {
  const level = incidentLevel(value)
  return level ? { level, ...SEVERITIES[level] } : { level: null, label: "Non précisée", variant: "neutral" }
}

const PRIORITIES: Record<IncidentLevel, string> = { low: "Basse", medium: "Moyenne", high: "Haute" }

export const incidentPriorityLabel = (value: string | null | undefined): string => {
  const level = incidentLevel(value)
  return level ? PRIORITIES[level] : "Non précisée"
}

const STATUSES: Record<IncidentStatusKey, { label: string; variant: Variant }> = {
  open: { label: "Ouvert", variant: "warning" },
  in_progress: { label: "En cours", variant: "info" },
  resolved: { label: "Résolu", variant: "success" },
}

export const INCIDENT_STATUS_KEYS: IncidentStatusKey[] = ["open", "in_progress", "resolved"]

// The values the API stores and accepts in updateIncidentStatus.
export const INCIDENT_STATUS_VALUES: Record<IncidentStatusKey, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
}

export const incidentStatusKey = (value: string | null | undefined): IncidentStatusKey | null =>
  lookup(STATUS_ALIASES, value)

export const incidentStatus = (
  value: string | null | undefined,
): { key: IncidentStatusKey | null; label: string; variant: Variant } => {
  const key = incidentStatusKey(value)
  return key ? { key, ...STATUSES[key] } : { key: null, label: "Non précisé", variant: "neutral" }
}

const CATEGORIES: Record<string, string> = {
  mechanical: "Mécanique",
  electrical: "Électrique",
  weather: "Météorologique",
  human_error: "Erreur humaine",
  other: "Autre",
}

// Known codes get their label; anything else is text typed by someone and is shown as typed.
export const incidentCategoryLabel = (value: string | null | undefined): string => {
  const text = (value ?? "").trim()
  if (!text) return "—"
  return CATEGORIES[normalise(text)] ?? text
}

export const incidentPersonName = (person: IncidentPerson | null | undefined): string =>
  `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "—"

// Role names as the API returns them: the two roles allowed to call updateIncidentStatus.
const FOLLOW_UP_ROLES = ["Administrateur", "Technicien"]

export const canFollowUpIncidents = (user: { role?: { role_name?: string | null } | null } | null | undefined) =>
  FOLLOW_UP_ROLES.includes(user?.role?.role_name ?? "")
