"use client"

import * as React from "react"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface ListItem {
  key: string
  name: string
  /** Extra information next to the name, e.g. a badge. */
  meta?: React.ReactNode
}

interface ItemListProps {
  items: ListItem[]
  onEdit: (item: ListItem) => void
  onDelete: (item: ListItem) => void
}

/** The list of the roles and of every choice list: name on the left, edit and delete on the right. */
export function ItemList({ items, onEdit, onDelete }: ItemListProps) {
  return (
    <ul className="divide-y rounded-md border">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-3 py-1.5 pl-3 pr-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="break-words text-sm font-medium">{item.name}</span>
            {item.meta}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => onEdit(item)}
              aria-label={`Modifier ${item.name}`}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => onDelete(item)}
              aria-label={`Supprimer ${item.name}`}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}

interface NameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  label: string
  placeholder?: string
  initialValue?: string
  submitLabel: string
  /** Names already taken; the one being edited is ignored. */
  existingNames: string[]
  duplicateMessage: string
  isSubmitting?: boolean
  /** Shown above the footer, e.g. a warning about what the change affects. */
  notice?: React.ReactNode
  onSubmit: (name: string) => void
}

/** Dialog with a single name field, used to add or rename an item. */
export function NameDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  initialValue = "",
  submitLabel,
  existingNames,
  duplicateMessage,
  isSubmitting = false,
  notice,
  onSubmit,
}: NameDialogProps) {
  const id = React.useId()
  const [name, setName] = React.useState(initialValue)
  const [error, setError] = React.useState<string | null>(null)

  // Start from the current name each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      setName(initialValue)
      setError(null)
    }
  }, [open, initialValue])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Rendered inside the settings form: do not submit that one too.
    event.stopPropagation()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Indiquez un nom.")
      return
    }
    const taken = existingNames.some(
      (existing) =>
        existing.toLowerCase() === trimmed.toLowerCase() && existing.toLowerCase() !== initialValue.toLowerCase(),
    )
    if (taken) {
      setError(duplicateMessage)
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={id}>
              {label}
              <span className="text-destructive" aria-hidden="true">
                {" "}
                *
              </span>
            </Label>
            <Input
              id={id}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder={placeholder}
              aria-invalid={error ? true : undefined}
              aria-required="true"
              autoComplete="off"
              autoFocus
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          {notice}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  isDeleting?: boolean
  onConfirm: () => void
}

/** Confirmation before deleting an item; the description names it. */
export function DeleteItemDialog({
  open,
  onOpenChange,
  title,
  description,
  isDeleting = false,
  onConfirm,
}: DeleteItemDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !isDeleting && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={isDeleting}
            onClick={(event) => {
              // Stay open until the caller closes it, once the deletion is done.
              event.preventDefault()
              onConfirm()
            }}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
