export enum ChecklistCategory {
  EXTERIOR = "EXTERIOR",
  COCKPIT = "COCKPIT",
  ENGINE = "ENGINE",
  EMERGENCY = "EMERGENCY",
  DOCUMENTS = "DOCUMENTS",
}

export enum ChecklistSubmissionStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface ChecklistItem {
  id: number | string
  item_name: string
  description?: string
  category: ChecklistCategory | string
  is_required: boolean
  sort_order: number
}

export interface ChecklistTemplate {
  id: number | string
  name: string
  description?: string
  aircraft_model: string
  is_active: boolean
  created_at?: string
  updated_at?: string
  items: ChecklistItem[]
}

export interface ChecklistResponse {
  itemId: number | string
  checked: boolean
  note?: string
}

export interface ChecklistSubmission {
  id: number | string
  status: ChecklistSubmissionStatus | string
  responses: ChecklistResponse[]
  started_at: string
  completed_at?: string
  template: ChecklistTemplate
  reservation?: {
    id: number | string
  }
}

export const CATEGORY_LABELS: Record<string, string> = {
  [ChecklistCategory.EXTERIOR]: "Extérieur",
  [ChecklistCategory.COCKPIT]: "Cockpit",
  [ChecklistCategory.ENGINE]: "Moteur",
  [ChecklistCategory.EMERGENCY]: "Urgences",
  [ChecklistCategory.DOCUMENTS]: "Documents",
}

export const CATEGORY_ORDER: ChecklistCategory[] = [
  ChecklistCategory.EXTERIOR,
  ChecklistCategory.COCKPIT,
  ChecklistCategory.ENGINE,
  ChecklistCategory.EMERGENCY,
  ChecklistCategory.DOCUMENTS,
]
