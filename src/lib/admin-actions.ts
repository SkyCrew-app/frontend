import i18n from "@/lib/i18n"
import { formatDateTime, formatMoney } from "@/lib/format"

// One line of the administrators' action log, as the API returns it.
export interface AdminAction {
  id: number
  created_at: string
  actor_id?: number | null
  actor_label?: string | null
  action: string
  target_type: string
  target_id?: string | null
  target_label?: string | null
  summary?: Record<string, unknown> | null
}

// "member.role_changed" → its wording; an action this version does not know keeps its code.
export const adminActionLabel = (action: string) =>
  i18n.t(`administration:actionLog.actions.${action}`, { defaultValue: action })

export const adminTargetLabel = (entry: Pick<AdminAction, "target_type" | "target_id" | "target_label">) => {
  const type = i18n.t(`administration:actionLog.targets.${entry.target_type}`, { defaultValue: entry.target_type })
  // The club has one set of settings: its number says nothing.
  if (entry.target_type === "settings") return type
  if (entry.target_label) {
    return i18n.t("administration:actionLog.targetNamed", { type, name: entry.target_label })
  }
  return entry.target_id ? i18n.t("administration:actionLog.targetNumbered", { type, id: entry.target_id }) : type
}

const MONEY_FIELDS = ["amount", "refundedAmount", "refundedInTotal", "refundedToStudents"]
// Moments, stored as ISO text.
const DATE_FIELDS = ["start", "end"]

const fieldLabel = (field: string) => i18n.t(`administration:actionLog.fields.${field}`, { defaultValue: field })

const plainValue = (field: string, value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "boolean") return i18n.t(value ? "administration:actionLog.yes" : "administration:actionLog.no")
  if (MONEY_FIELDS.includes(field) && typeof value === "number") return formatMoney(value)
  if (DATE_FIELDS.includes(field) && typeof value === "string") return formatDateTime(value)
  if (Array.isArray(value)) return value.length > 0 ? value.map((item) => plainValue(field, item)).join(", ") : "—"
  if (typeof value === "object") {
    // A small nested value (the lists of the club): "name (items)" for each of its parts.
    const parts = Object.entries(value).map(([key, item]) => `${fieldLabel(key)} (${plainValue(key, item)})`)
    return parts.length > 0 ? parts.join(" ; ") : "—"
  }
  const text = String(value)
  return i18n.t(`administration:actionLog.values.${text}`, { defaultValue: text })
}

const detail = (field: string, value: string) =>
  i18n.t("administration:actionLog.detail", { label: fieldLabel(field), value })

const isChange = (value: unknown): value is { from: unknown; to: unknown } =>
  typeof value === "object" && value !== null && "from" in value && "to" in value

/**
 * The facts recorded with an action, as short sentences: "Rôle : Pilote → Instructeur".
 * A summary that only holds { from, to } is the change itself.
 */
export const adminActionDetails = (summary: AdminAction["summary"]): string[] => {
  if (!summary) return []
  const { from, to, changes, ...rest } = summary as Record<string, unknown>
  const lines: string[] = []
  if (from !== undefined || to !== undefined) lines.push(`${plainValue("from", from)} → ${plainValue("to", to)}`)
  if (changes && typeof changes === "object") {
    for (const [field, change] of Object.entries(changes as Record<string, unknown>)) {
      lines.push(
        detail(
          field,
          isChange(change)
            ? `${plainValue(field, change.from)} → ${plainValue(field, change.to)}`
            : plainValue(field, change),
        ),
      )
    }
  }
  for (const [field, value] of Object.entries(rest)) {
    // Record numbers mean nothing to a reader; the bookings kept are counted.
    if (field.endsWith("Id")) continue
    const shown = field === "keptReservationIds" && Array.isArray(value) ? value.length : value
    // Nothing happened on that side (no refund, no booking cancelled): not worth a line.
    if (shown === 0 || shown === null || shown === undefined || shown === "" || (Array.isArray(shown) && shown.length === 0))
      continue
    lines.push(detail(field, plainValue(field, shown)))
  }
  return lines
}
