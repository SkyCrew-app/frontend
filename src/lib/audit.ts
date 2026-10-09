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

export interface AuditClientFilters {
  auditFrequency?: string | null
  overdueOnly?: boolean
}

// An audit is overdue when it is still open and its next audit date has passed.
export const isAuditOverdue = (
  audit: { is_closed?: boolean | null; next_audit_date?: string | Date | null },
  now: Date = new Date(),
) => !audit.is_closed && Boolean(audit.next_audit_date) && new Date(audit.next_audit_date as string | Date) < now

// AuditFilterInput has no frequency nor overdue criteria: both are applied here.
export const filterAudits = <
  T extends { audit_frequency?: string | null; is_closed?: boolean | null; next_audit_date?: string | Date | null },
>(
  audits: T[],
  { auditFrequency, overdueOnly }: AuditClientFilters,
  now: Date = new Date(),
): T[] =>
  audits.filter(
    (audit) =>
      (!auditFrequency || audit.audit_frequency === auditFrequency) && (!overdueOnly || isAuditOverdue(audit, now)),
  )
