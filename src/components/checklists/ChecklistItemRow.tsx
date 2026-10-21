"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface ChecklistItemRowProps {
  itemId: number | string
  label: string
  description?: string
  isRequired: boolean
  checked: boolean
  note: string
  onChange: (checked: boolean) => void
  onNoteChange: (note: string) => void
  disabled?: boolean
}

export function ChecklistItemRow({
  itemId,
  label,
  description,
  isRequired,
  checked,
  note,
  onChange,
  onNoteChange,
  disabled = false,
}: ChecklistItemRowProps) {
  const { t } = useTranslation("checklists")
  const [showNote, setShowNote] = useState(!!note)
  // A read-only checklist only shows the notes that were written.
  const noteVisible = disabled ? !!note : showNote

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        checked ? "border-success/30 bg-success/10" : "bg-card",
      )}
    >
      <div className="flex items-stretch">
        {/* The whole label is the tap target: easy to hit with a thumb on the apron. */}
        <label
          htmlFor={`item-${itemId}`}
          className={cn(
            "flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-3",
            disabled ? "cursor-default" : "cursor-pointer",
          )}
        >
          <Checkbox
            id={`item-${itemId}`}
            checked={checked}
            onCheckedChange={(val) => onChange(val === true)}
            disabled={disabled}
            className="h-6 w-6 rounded-md [&_svg]:h-5 [&_svg]:w-5"
          />
          <span className="min-w-0 flex-1">
            <span className={cn("block text-sm font-medium", checked && "text-muted-foreground")}>{label}</span>
            {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
            {isRequired && !checked && <span className="mt-0.5 block text-xs text-muted-foreground">{t("common:labels.required")}</span>}
          </span>
        </label>
        {(!disabled || !!note) && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowNote(!showNote)}
            disabled={disabled}
            className={cn("m-2 h-10 w-10 shrink-0", note ? "text-primary" : "text-muted-foreground")}
            aria-label={note ? t("item.viewNoteLabel", { label }) : t("item.addNoteLabel", { label })}
            aria-expanded={noteVisible}
            title={note ? t("item.note") : t("item.addNote")}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        )}
      </div>
      {noteVisible && (
        <div className="px-3 pb-3">
          <Textarea
            aria-label={t("item.noteLabel", { label })}
            placeholder={t("item.notePlaceholder")}
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="min-h-[72px] bg-background text-sm"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
