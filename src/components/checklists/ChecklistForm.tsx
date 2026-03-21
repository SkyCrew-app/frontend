"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import {
  ChecklistItem,
  ChecklistResponse,
  ChecklistSubmission,
  ChecklistSubmissionStatus,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/interfaces/checklist"
import { ChecklistCategorySection } from "./ChecklistCategorySection"
import { ChecklistItemRow } from "./ChecklistItemRow"
import { ChecklistProgress } from "./ChecklistProgress"

interface ChecklistFormProps {
  submission: ChecklistSubmission
  items: ChecklistItem[]
  onUpdate: (responses: ChecklistResponse[]) => void
  onComplete: () => void
}

export function ChecklistForm({ submission, items, onUpdate, onComplete }: ChecklistFormProps) {
  const [responses, setResponses] = useState<Record<string, { checked: boolean; note: string }>>({})
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const isCompleted = submission.status === ChecklistSubmissionStatus.COMPLETED

  // Initialize responses from submission
  useEffect(() => {
    const initial: Record<string, { checked: boolean; note: string }> = {}
    items.forEach((item) => {
      const existing = submission.responses?.find(
        (r) => String(r.itemId) === String(item.id),
      )
      initial[String(item.id)] = {
        checked: existing?.checked ?? false,
        note: existing?.note ?? "",
      }
    })
    setResponses(initial)
  }, [submission.responses, items])

  const buildResponseArray = useCallback(
    (current: Record<string, { checked: boolean; note: string }>): ChecklistResponse[] => {
      return Object.entries(current).map(([itemId, val]) => ({
        itemId: Number(itemId),
        checked: val.checked,
        note: val.note || undefined,
      }))
    },
    [],
  )

  const scheduleAutoSave = useCallback(
    (updated: Record<string, { checked: boolean; note: string }>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onUpdate(buildResponseArray(updated))
      }, 2000)
    },
    [onUpdate, buildResponseArray],
  )

  const handleCheck = (itemId: string, checked: boolean) => {
    if (isCompleted) return
    setResponses((prev) => {
      const updated = { ...prev, [itemId]: { ...prev[itemId], checked } }
      scheduleAutoSave(updated)
      return updated
    })
  }

  const handleNoteChange = (itemId: string, note: string) => {
    if (isCompleted) return
    setResponses((prev) => {
      const updated = { ...prev, [itemId]: { ...prev[itemId], note } }
      scheduleAutoSave(updated)
      return updated
    })
  }

  // Group items by category
  const groupedItems = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      const catItems = items
        .filter((item) => item.category === cat)
        .sort((a, b) => a.sort_order - b.sort_order)
      if (catItems.length > 0) acc[cat] = catItems
      return acc
    },
    {} as Record<string, ChecklistItem[]>,
  )

  // Stats
  const totalItems = items.length
  const checkedItems = Object.values(responses).filter((r) => r.checked).length
  const requiredItems = items.filter((i) => i.is_required)
  const checkedRequired = requiredItems.filter(
    (i) => responses[String(i.id)]?.checked,
  ).length
  const allRequiredChecked = checkedRequired === requiredItems.length

  const handleComplete = () => {
    // Flush pending auto-save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    onUpdate(buildResponseArray(responses))
    onComplete()
  }

  return (
    <div className="space-y-6">
      <ChecklistProgress
        checked={checkedItems}
        total={totalItems}
        required={requiredItems.length}
        checkedRequired={checkedRequired}
      />

      <div className="space-y-4">
        {Object.entries(groupedItems).map(([category, catItems]) => {
          const catChecked = catItems.filter(
            (i) => responses[String(i.id)]?.checked,
          ).length

          return (
            <ChecklistCategorySection
              key={category}
              category={CATEGORY_LABELS[category] || category}
              checkedCount={catChecked}
              totalCount={catItems.length}
            >
              {catItems.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  itemId={item.id}
                  label={item.item_name}
                  description={item.description}
                  isRequired={item.is_required}
                  checked={responses[String(item.id)]?.checked ?? false}
                  note={responses[String(item.id)]?.note ?? ""}
                  onChange={(checked) => handleCheck(String(item.id), checked)}
                  onNoteChange={(note) => handleNoteChange(String(item.id), note)}
                  disabled={isCompleted}
                />
              ))}
            </ChecklistCategorySection>
          )
        })}
      </div>

      {!isCompleted && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleComplete}
            disabled={!allRequiredChecked}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Terminer la checklist
          </Button>
        </div>
      )}
    </div>
  )
}
