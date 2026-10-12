import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RowActionsProps {
  // What the row is, for screen readers: "le cours Météorologie".
  name: string
  onEdit: () => void
  onDelete: () => void
}

// The two actions at the end of a management table row.
export function RowActions({ name, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label={`Modifier ${name}`} title="Modifier">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-destructive hover:text-destructive"
        onClick={onDelete}
        aria-label={`Supprimer ${name}`}
        title="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
