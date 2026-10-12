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

const UNKNOWN: AuditBadge = { label: "Non renseigné", variant: "neutral" }

const RESULTS: Record<string, AuditBadge> = {
  CONFORME: { label: "Conforme", variant: "success" },
  NON_CONFORME: { label: "Non conforme", variant: "danger" },
  CONFORME_AVEC_REMARQUES: { label: "Conforme avec remarques", variant: "warning" },
  NON_APPLICABLE: { label: "Non applicable", variant: "neutral" },
}

export const auditResult = (result: string | null | undefined): AuditBadge => RESULTS[result ?? ""] ?? UNKNOWN

export const auditStatus = (
  audit: { is_closed?: boolean | null; next_audit_date?: string | Date | null },
  now: Date = new Date(),
): AuditBadge => {
  if (audit.is_closed) return { label: "Clôturé", variant: "success" }
  if (isAuditOverdue(audit, now)) return { label: "En retard", variant: "danger" }
  return { label: "En cours", variant: "info" }
}

const CRITICALITIES: Record<string, AuditBadge> = {
  CRITIQUE: { label: "Critique", variant: "danger" },
  MAJEUR: { label: "Majeur", variant: "warning" },
  MINEUR: { label: "Mineur", variant: "info" },
  INFO: { label: "Information", variant: "neutral" },
}

export const auditCriticality = (level: string | null | undefined): AuditBadge => CRITICALITIES[level ?? ""] ?? UNKNOWN

const FREQUENCIES: Record<string, string> = {
  QUOTIDIEN: "Quotidien",
  HEBDOMADAIRE: "Hebdomadaire",
  MENSUEL: "Mensuel",
  TRIMESTRIEL: "Trimestriel",
  SEMESTRIEL: "Semestriel",
  ANNUEL: "Annuel",
  BIANNUEL: "Tous les 2 ans",
  HEURES_DE_VOL: "Selon les heures de vol",
  APRES_INCIDENT: "Après incident",
  AUTRE: "Autre",
}

export const auditFrequencyLabel = (frequency: string | null | undefined): string =>
  FREQUENCIES[frequency ?? ""] ?? UNKNOWN.label

const CATEGORIES: Record<string, string> = {
  CELLULE: "Cellule",
  MOTEUR: "Moteur",
  AVIONIQUE: "Avionique",
  TRAIN_ATTERRISSAGE: "Train d'atterrissage",
  SYSTEME_CARBURANT: "Système carburant",
  SYSTEME_ELECTRIQUE: "Système électrique",
  DOCUMENTATION: "Documentation",
  EQUIPEMENT_SECURITE: "Équipement de sécurité",
  AUTRE: "Autre",
}

export const auditCategoryLabel = (category: string | null | undefined): string =>
  CATEGORIES[category ?? ""] ?? UNKNOWN.label
