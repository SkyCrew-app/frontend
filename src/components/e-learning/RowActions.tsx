"use client"

import { Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

interface RowActionsProps {
  // What the row is, for screen readers, already in the language of the user: "le cours Météorologie".
  name: string
  onEdit: () => void
  onDelete: () => void
}

// The two actions at the end of a management table row.
export function RowActions({ name, onEdit, onDelete }: RowActionsProps) {
  const { t } = useTranslation("instruction")
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={onEdit}
        aria-label={t("admin.shared.editRow", { name })}
        title={t("common:actions.edit")}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label={t("admin.shared.deleteRow", { name })}
        title={t("common:actions.delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
