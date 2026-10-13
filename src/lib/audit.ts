import i18n from "@/lib/i18n"

// Pure helpers turning the audit forms' state into what the GraphQL API accepts.

export interface AuditTemplateItemInput {
  category: string
  title: string
  description: string
  order_index: number
  criticality?: string
  inspection_method?: string
  expected_result?: string
  reference_documentation?: string
  requires_photo_evidence?: boolean
  is_mandatory?: boolean
}

const OPTIONAL_TEMPLATE_ITEM_FIELDS = [
  "criticality",
  "inspection_method",
  "expected_result",
  "reference_documentation",
  "requires_photo_evidence",
  "is_mandatory",
] as const

// Template items come from query results (id, __typename, ...) while
// CreateAuditTemplateItemInput only accepts the fields listed here.
export const toAuditTemplateItemInput = (item: Record<string, unknown>, index: number): AuditTemplateItemInput => {
  const input: Record<string, unknown> = {
    category: item.category,
    title: item.title,
    description: item.description ?? "",
    order_index: index,
  }

  for (const field of OPTIONAL_TEMPLATE_ITEM_FIELDS) {
    if (item[field] !== null && item[field] !== undefined) {
      input[field] = item[field]
    }
  }

  return input as unknown as AuditTemplateItemInput
}

export interface AuditItemUpdate {
  id: number
  input: {
    category?: string
    description?: string
    notes?: string
    requires_action?: boolean
    result?: string
  }
}

type AuditItemLike = { id: number } & Record<string, unknown>

const AUDIT_ITEM_FIELDS = ["category", "description", "notes", "result", "requires_action"] as const

const normalizeAuditItemField = (field: (typeof AUDIT_ITEM_FIELDS)[number], value: unknown) => {
  if (field === "notes") return value ?? ""
  if (field === "requires_action") return Boolean(value)
  return value
}

// One update per item the user actually modified, carrying only the modified
// fields (all of them defined by UpdateAuditItemInput).
export const getChangedAuditItems = (
  originalItems: AuditItemLike[] | null | undefined,
  currentItems: AuditItemLike[],
): AuditItemUpdate[] => {
  const originalsById = new Map((originalItems ?? []).map((item) => [item.id, item]))
  const updates: AuditItemUpdate[] = []

  for (const current of currentItems) {
    const original = originalsById.get(current.id)
    if (!original) continue

    const input: Record<string, unknown> = {}
    for (const field of AUDIT_ITEM_FIELDS) {
      const value = normalizeAuditItemField(field, current[field])
      if (value !== normalizeAuditItemField(field, original[field])) {
        input[field] = value
      }
    }

    if (Object.keys(input).length > 0) {
      updates.push({ id: current.id, input })
    }
  }

  return updates
}

export type AuditStatusTab = "all" | "open" | "closed" | "nonconform" | "overdue"

export interface AuditClientFilters {
  auditFrequency?: string | null
  overdueOnly?: boolean
  // The status tab of the list; "overdue" is the same as overdueOnly.
  tab?: AuditStatusTab | null
}

// An audit is overdue when it is still open and its next audit date has passed.
export const isAuditOverdue = (
  audit: { is_closed?: boolean | null; next_audit_date?: string | Date | null },
  now: Date = new Date(),
) => !audit.is_closed && Boolean(audit.next_audit_date) && new Date(audit.next_audit_date as string | Date) < now

const matchesAuditTab = (
  audit: { is_closed?: boolean | null; audit_result?: string | null; next_audit_date?: string | Date | null },
  tab: AuditStatusTab | null | undefined,
  now: Date,
) => {
  switch (tab) {
    case "open":
      return !audit.is_closed
    case "closed":
      return Boolean(audit.is_closed)
    case "nonconform":
      return audit.audit_result === "NON_CONFORME"
    case "overdue":
      return isAuditOverdue(audit, now)
    default:
      return true
  }
}

// AuditFilterInput has no frequency nor overdue criteria: both are applied here,
// as is the status tab, so that the counters of the other tabs stay available.
export const filterAudits = <
  T extends {
    audit_frequency?: string | null
    audit_result?: string | null
    is_closed?: boolean | null
    next_audit_date?: string | Date | null
  },
>(
  audits: T[],
  { auditFrequency, overdueOnly, tab }: AuditClientFilters,
  now: Date = new Date(),
): T[] =>
  audits.filter(
    (audit) =>
      (!auditFrequency || audit.audit_frequency === auditFrequency) &&
      (!overdueOnly || isAuditOverdue(audit, now)) &&
      matchesAuditTab(audit, tab, now),
  )

export interface AuditStatusCounts {
  total: number
  open: number
  closed: number
  nonconform: number
  overdue: number
}

export const countAuditsByStatus = (
  audits: { is_closed?: boolean | null; audit_result?: string | null; next_audit_date?: string | Date | null }[],
  now: Date = new Date(),
): AuditStatusCounts => ({
  total: audits.length,
  open: audits.filter((audit) => !audit.is_closed).length,
  closed: audits.filter((audit) => audit.is_closed).length,
  nonconform: audits.filter((audit) => audit.audit_result === "NON_CONFORME").length,
  overdue: audits.filter((audit) => isAuditOverdue(audit, now)).length,
})

// One wording and one colour per audit result, status, criticality, frequency
// and category, wherever they are shown.
export type AuditBadgeVariant = "success" | "warning" | "info" | "danger" | "neutral"

interface AuditBadge {
  label: string
  variant: AuditBadgeVariant
}

// Labels are read when they are shown, so that they follow the language.
const unknownLabel = () => i18n.t("administration:auditUnknown")

const badge = (family: string, variants: Record<string, AuditBadgeVariant>, code: string | null | undefined): AuditBadge =>
  code && Object.prototype.hasOwnProperty.call(variants, code)
    ? { label: i18n.t(`administration:${family}.${code}`), variant: variants[code] }
    : { label: unknownLabel(), variant: "neutral" }

const label = (family: string, codes: readonly string[], code: string | null | undefined): string =>
  code && codes.includes(code) ? i18n.t(`administration:${family}.${code}`) : unknownLabel()

const RESULTS: Record<string, AuditBadgeVariant> = {
  CONFORME: "success",
  NON_CONFORME: "danger",
  CONFORME_AVEC_REMARQUES: "warning",
  NON_APPLICABLE: "neutral",
}

export const auditResult = (result: string | null | undefined): AuditBadge => badge("auditResult", RESULTS, result)

export const auditStatus = (
  audit: { is_closed?: boolean | null; next_audit_date?: string | Date | null },
  now: Date = new Date(),
): AuditBadge => {
  if (audit.is_closed) return { label: i18n.t("administration:auditStatus.closed"), variant: "success" }
  if (isAuditOverdue(audit, now)) return { label: i18n.t("administration:auditStatus.overdue"), variant: "danger" }
  return { label: i18n.t("administration:auditStatus.inProgress"), variant: "info" }
}

const CRITICALITIES: Record<string, AuditBadgeVariant> = {
  CRITIQUE: "danger",
  MAJEUR: "warning",
  MINEUR: "info",
  INFO: "neutral",
}

export const auditCriticality = (level: string | null | undefined): AuditBadge =>
  badge("auditCriticality", CRITICALITIES, level)

const FREQUENCIES = [
  "QUOTIDIEN",
  "HEBDOMADAIRE",
  "MENSUEL",
  "TRIMESTRIEL",
  "SEMESTRIEL",
  "ANNUEL",
  "BIANNUEL",
  "HEURES_DE_VOL",
  "APRES_INCIDENT",
  "AUTRE",
]

export const auditFrequencyLabel = (frequency: string | null | undefined): string =>
  label("auditFrequency", FREQUENCIES, frequency)

const CATEGORIES = [
  "CELLULE",
  "MOTEUR",
  "AVIONIQUE",
  "TRAIN_ATTERRISSAGE",
  "SYSTEME_CARBURANT",
  "SYSTEME_ELECTRIQUE",
  "DOCUMENTATION",
  "EQUIPEMENT_SECURITE",
  "AUTRE",
]

export const auditCategoryLabel = (category: string | null | undefined): string =>
  label("auditCategory", CATEGORIES, category)
