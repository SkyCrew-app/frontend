// One wording and one colour per incident severity, priority, status and category, wherever
// an incident is shown. The API stores free strings (codes of the close-flight form, French
// words in older data): everything is brought back to the same few values here.

import i18n from "@/lib/i18n"

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
  aircraft: { id: number; registration_number: string; model?: string | null; availability_status?: string | null }
  /** True when a flight is attached, even one the reader may not see (`flight` is then null). */
  hasFlight?: boolean | null
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

// Labels are read when they are shown, so that they follow the language.
const SEVERITY_VARIANTS: Record<IncidentLevel, Variant> = { low: "neutral", medium: "warning", high: "danger" }

export const INCIDENT_LEVELS: IncidentLevel[] = ["low", "medium", "high"]

export const incidentSeverity = (
  value: string | null | undefined,
): { level: IncidentLevel | null; label: string; variant: Variant } => {
  const level = incidentLevel(value)
  return level
    ? { level, label: i18n.t(`administration:incidentSeverity.${level}`), variant: SEVERITY_VARIANTS[level] }
    : { level: null, label: i18n.t("administration:incidentSeverity.unknown"), variant: "neutral" }
}

export const incidentPriorityLabel = (value: string | null | undefined): string =>
  i18n.t(`administration:incidentPriority.${incidentLevel(value) ?? "unknown"}`)

const STATUS_VARIANTS: Record<IncidentStatusKey, Variant> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
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
  return key
    ? { key, label: i18n.t(`administration:incidentStatus.${key}`), variant: STATUS_VARIANTS[key] }
    : { key: null, label: i18n.t("administration:incidentStatus.unknown"), variant: "neutral" }
}

const CATEGORIES = ["mechanical", "electrical", "weather", "human_error", "other"]

// Known codes get their label; anything else is text typed by someone and is shown as typed.
export const incidentCategoryLabel = (value: string | null | undefined): string => {
  const text = (value ?? "").trim()
  if (!text) return "—"
  const code = normalise(text)
  return CATEGORIES.includes(code) ? i18n.t(`administration:incidentCategory.${code}`) : text
}

export const incidentPersonName = (person: IncidentPerson | null | undefined): string =>
  `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "—"

// Role names as the API returns them: the two roles allowed to call updateIncidentStatus.
const FOLLOW_UP_ROLES = ["Administrateur", "Technicien"]

export const canFollowUpIncidents = (user: { role?: { role_name?: string | null } | null } | null | undefined) =>
  FOLLOW_UP_ROLES.includes(user?.role?.role_name ?? "")

// As the API (incidents.service.ts, deleteIncident and isUntouched): the author of a report
// withdraws it while it is open and nobody of the staff has acted on it (no resolution, no note).
export const canWithdrawIncident = (
  incident: Pick<Incident, "status" | "resolved_at" | "resolved_by" | "resolution_note" | "user">,
  viewerId: number | string | null | undefined,
) =>
  viewerId != null &&
  incident.user?.id != null &&
  Number(incident.user.id) === Number(viewerId) &&
  incident.status === INCIDENT_STATUS_VALUES.open &&
  !incident.resolved_by &&
  !incident.resolved_at &&
  !incident.resolution_note
