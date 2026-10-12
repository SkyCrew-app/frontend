import {
  CATEGORY_ORDER,
  ChecklistCategory,
  ChecklistSubmissionStatus,
  type ChecklistItem,
  type ChecklistSubmission,
} from "@/interfaces/checklist"
import { toIntId } from "@/lib/graphql-inputs"

export interface ChecklistItemDraft {
  item_name: string
  description: string
  category: string
  is_required: boolean
}

export interface ChecklistCategoryGroup {
  category: string
  items: ChecklistItem[]
}

export const emptyChecklistItemDraft = (): ChecklistItemDraft => ({
  item_name: "",
  description: "",
  category: ChecklistCategory.EXTERIOR,
  is_required: true,
})

export const toChecklistItemDraft = (item: ChecklistItem): ChecklistItemDraft => ({
  item_name: item.item_name,
  description: item.description || "",
  category: String(item.category).toUpperCase(),
  is_required: item.is_required,
})

const bySortOrder = (a: ChecklistItem, b: ChecklistItem) =>
  a.sort_order - b.sort_order || Number(a.id) - Number(b.id)

// Categories come in display order, each with its items sorted. Empty
// categories are left out.
export function groupItemsByCategory(items: ChecklistItem[]): ChecklistCategoryGroup[] {
  const known = new Set<string>(CATEGORY_ORDER)
  const categories: string[] = [
    ...CATEGORY_ORDER,
    ...Array.from(new Set(items.map((item) => String(item.category)))).filter((category) => !known.has(category)),
  ]

  return categories
    .map((category) => ({
      category,
      items: items.filter((item) => item.category === category).sort(bySortOrder),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * Moves an item inside its category and returns the ids of every item of the
 * template in their new order, as expected by `reorderChecklistItems` (the
 * position in the list becomes the `sort_order`). Returns `null` when nothing
 * moves or when an id cannot be sent as an integer.
 */
export function reorderItemIds(
  items: ChecklistItem[],
  category: string,
  fromIndex: number,
  toIndex: number,
): number[] | null {
  if (fromIndex === toIndex) return null

  const groups = groupItemsByCategory(items)
  const group = groups.find((candidate) => candidate.category === category)
  if (!group) return null
  if (fromIndex < 0 || fromIndex >= group.items.length) return null
  if (toIndex < 0 || toIndex >= group.items.length) return null

  const reordered = [...group.items]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)

  const ids = groups
    .flatMap((candidate) => (candidate === group ? reordered : candidate.items))
    .map((item) => toIntId(item.id))

  return ids.every((id): id is number => id !== null) ? ids : null
}

// A new item goes after every existing one.
export function nextSortOrder(items: ChecklistItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.sort_order + 1), 0)
}

export interface CreateChecklistItemInputPayload {
  templateId: number
  item_name: string
  description: string
  category: string
  is_required: boolean
  sort_order: number
}

export function buildCreateChecklistItemInput(
  templateId: unknown,
  draft: ChecklistItemDraft,
  items: ChecklistItem[],
): CreateChecklistItemInputPayload | null {
  const id = toIntId(templateId)
  const item_name = draft.item_name.trim()
  if (id === null || !item_name) return null

  return {
    templateId: id,
    item_name,
    description: draft.description.trim(),
    category: draft.category.toUpperCase(),
    is_required: draft.is_required,
    sort_order: nextSortOrder(items),
  }
}

export interface UpdateChecklistItemInputPayload {
  id: number
  item_name: string
  description: string
  category: string
  is_required: boolean
  sort_order?: number
}

/**
 * Builds the input of `updateChecklistItem`. An item moved to another
 * category is placed at the end of it.
 */
export function buildUpdateChecklistItemInput(
  item: ChecklistItem,
  draft: ChecklistItemDraft,
  items: ChecklistItem[],
): UpdateChecklistItemInputPayload | null {
  const id = toIntId(item.id)
  const item_name = draft.item_name.trim()
  if (id === null || !item_name) return null

  const category = draft.category.toUpperCase()

  return {
    id,
    item_name,
    description: draft.description.trim(),
    category,
    is_required: draft.is_required,
    ...(category !== String(item.category).toUpperCase() && { sort_order: nextSortOrder(items) }),
  }
}

type StatusVariant = "success" | "info" | "danger" | "neutral"

const SUBMISSION_STATUSES: Record<string, { label: string; variant: StatusVariant }> = {
  [ChecklistSubmissionStatus.IN_PROGRESS]: { label: "En cours", variant: "info" },
  [ChecklistSubmissionStatus.COMPLETED]: { label: "Terminée", variant: "success" },
  [ChecklistSubmissionStatus.CANCELLED]: { label: "Annulée", variant: "danger" },
}

// One wording and one colour per checklist status, wherever it is shown.
export const checklistStatus = (status: string | null | undefined) =>
  SUBMISSION_STATUSES[(status ?? "").toUpperCase()] ?? { label: "Statut inconnu", variant: "neutral" as StatusVariant }

// How far a checklist is: only answers to items still in the template count.
export function submissionProgress(submission: Pick<ChecklistSubmission, "responses" | "template">) {
  const itemIds = new Set((submission.template?.items ?? []).map((item) => String(item.id)))
  const checked = (submission.responses ?? []).filter(
    (response) => response.checked && itemIds.has(String(response.itemId)),
  ).length
  const total = itemIds.size
  return { checked, total, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 }
}
