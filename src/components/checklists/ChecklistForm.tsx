"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react"
import {
  ChecklistItem,
  ChecklistResponse,
  ChecklistSubmission,
  ChecklistSubmissionStatus,
} from "@/interfaces/checklist"
import { EmptyState } from "@/components/layout/EmptyState"
import { checklistCategoryLabel, groupItemsByCategory } from "@/lib/checklist-items"
import { ChecklistCategorySection } from "./ChecklistCategorySection"
import { ChecklistItemRow } from "./ChecklistItemRow"
import { ChecklistProgress } from "./ChecklistProgress"
import { useTranslation } from "react-i18next"

interface ChecklistFormProps {
  submission: ChecklistSubmission
  items: ChecklistItem[]
  /** Saves the answers. Resolving to `false` means the save failed. */
  onUpdate: (responses: ChecklistResponse[]) => void | boolean | Promise<void | boolean>
  onComplete: () => void | Promise<void>
}

type Answer = { checked: boolean; note: string }
type SaveState = "idle" | "pending" | "saving" | "saved" | "error"

const AUTO_SAVE_DELAY_MS = 1000

export function ChecklistForm({ submission, items, onUpdate, onComplete }: ChecklistFormProps) {
  const { t } = useTranslation("checklists")
  // Only what the pilot changed on this screen; the rest comes from the submission.
  // Answers typed while a save is in flight are therefore never overwritten by its result.
  const [edits, setEdits] = useState<Record<string, Answer>>({})
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [completing, setCompleting] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const saveCountRef = useRef(0)
  const readOnly = submission.status !== ChecklistSubmissionStatus.IN_PROGRESS

  const answerOf = useCallback(
    (itemId: number | string, current: Record<string, Answer>): Answer => {
      const local = current[String(itemId)]
      if (local) return local
      const saved = submission.responses?.find((r) => String(r.itemId) === String(itemId))
      return { checked: saved?.checked ?? false, note: saved?.note ?? "" }
    },
    [submission.responses],
  )

  const buildResponseArray = useCallback(
    (current: Record<string, Answer>): ChecklistResponse[] =>
      items.map((item) => {
        const answer = answerOf(item.id, current)
        return { itemId: Number(item.id), checked: answer.checked, note: answer.note || undefined }
      }),
    [items, answerOf],
  )

  const save = useCallback(
    async (current: Record<string, Answer>): Promise<boolean> => {
      const saveNumber = ++saveCountRef.current
      setSaveState("saving")
      const result = await onUpdate(buildResponseArray(current))
      const succeeded = result !== false
      // A newer change is already waiting: its own save will report the state.
      if (saveNumber === saveCountRef.current && !debounceRef.current) {
        setSaveState(succeeded ? "saved" : "error")
      }
      return succeeded
    },
    [onUpdate, buildResponseArray],
  )

  // Kept in a ref so that leaving the page can still save the last answers.
  const pendingRef = useRef<(() => void) | null>(null)

  const scheduleAutoSave = (updated: Record<string, Answer>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveState("pending")
    const run = () => {
      debounceRef.current = null
      pendingRef.current = null
      void save(updated)
    }
    pendingRef.current = run
    debounceRef.current = setTimeout(run, AUTO_SAVE_DELAY_MS)
  }

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        pendingRef.current?.()
      }
    },
    [],
  )

  const change = (itemId: number | string, patch: Partial<Answer>) => {
    if (readOnly) return
    const updated = { ...edits, [String(itemId)]: { ...answerOf(itemId, edits), ...patch } }
    setEdits(updated)
    scheduleAutoSave(updated)
  }

  const groups = groupItemsByCategory(items)

  const totalItems = items.length
  const checkedItems = items.filter((item) => answerOf(item.id, edits).checked).length
  const requiredItems = items.filter((item) => item.is_required)
  const checkedRequired = requiredItems.filter((item) => answerOf(item.id, edits).checked).length
  const missingRequired = requiredItems.length - checkedRequired
  const allRequiredChecked = missingRequired === 0

  const handleComplete = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
      pendingRef.current = null
    }
    setCompleting(true)
    try {
      // The last answers are saved before the checklist is completed.
      const saved = await save(edits)
      if (!saved) return
      await onComplete()
    } finally {
      setCompleting(false)
    }
  }

  if (totalItems === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("form.empty.title")}
        description={t("form.empty.description")}
      />
    )
  }

  return (
    <div className="space-y-4">
      <ChecklistProgress
        checked={checkedItems}
        total={totalItems}
        required={readOnly ? 0 : requiredItems.length}
        checkedRequired={checkedRequired}
      />

      <div className="space-y-4">
        {groups.map(({ category, items: catItems }) => {
          const catChecked = catItems.filter((item) => answerOf(item.id, edits).checked).length

          return (
            <ChecklistCategorySection
              key={category}
              category={checklistCategoryLabel(category)}
              checkedCount={catChecked}
              totalCount={catItems.length}
            >
              {catItems.map((item) => {
                const answer = answerOf(item.id, edits)
                return (
                  <ChecklistItemRow
                    key={item.id}
                    itemId={item.id}
                    label={item.item_name}
                    description={item.description}
                    isRequired={item.is_required}
                    checked={answer.checked}
                    note={answer.note}
                    onChange={(checked) => change(item.id, { checked })}
                    onNoteChange={(note) => change(item.id, { note })}
                    disabled={readOnly}
                  />
                )
              })}
            </ChecklistCategorySection>
          )
        })}
      </div>

      {!readOnly && (
        // Stays within thumb reach while the list scrolls.
        <div className="sticky bottom-2 z-10 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm" aria-live="polite">
            <SaveIndicator state={saveState} onRetry={() => void save(edits)} />
            {!allRequiredChecked && (
              <p className="text-xs text-muted-foreground">
                {t("form.requiredMissing", { count: missingRequired })}
              </p>
            )}
          </div>
          <Button
            onClick={handleComplete}
            disabled={!allRequiredChecked || completing}
            size="lg"
            className="w-full shrink-0 sm:w-auto"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {t("form.complete")}
          </Button>
        </div>
      )}
    </div>
  )
}

function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const { t } = useTranslation("checklists")
  if (state === "error") {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t("form.save.error")}
        <button type="button" onClick={onRetry} className="font-medium underline underline-offset-2">
          {t("common:actions.retry")}
        </button>
      </p>
    )
  }
  if (state === "pending" || state === "saving") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        {t("common:states.saving")}
      </p>
    )
  }
  if (state === "saved") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        {t("form.save.saved")}
      </p>
    )
  }
  return <p className="text-sm text-muted-foreground">{t("form.save.auto")}</p>
}
