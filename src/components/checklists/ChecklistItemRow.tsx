"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [showNote, setShowNote] = useState(!!note)

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        checked ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" : "bg-background",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`item-${itemId}`}
          checked={checked}
          onCheckedChange={(val) => onChange(val === true)}
          disabled={disabled}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <Label
            htmlFor={`item-${itemId}`}
            className={cn(
              "text-sm font-medium cursor-pointer",
              checked && "line-through text-muted-foreground",
            )}
          >
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowNote(!showNote)}
          className={cn(
            "p-1.5 rounded-md hover:bg-muted transition-colors",
            showNote || note ? "text-primary" : "text-muted-foreground",
          )}
          title="Ajouter une note"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
      {showNote && (
        <div className="mt-2 ml-7">
          <Textarea
            placeholder="Ajouter une note..."
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            className="text-sm min-h-[60px]"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}
