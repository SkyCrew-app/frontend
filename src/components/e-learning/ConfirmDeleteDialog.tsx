"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface ConfirmDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  // Names what is deleted and what goes with it.
  description: ReactNode
  onConfirm: () => void
  loading?: boolean
  /** Wording of the two buttons when the action is not a deletion (e.g. cancelling a course). */
  confirmLabel?: ReactNode
  dismissLabel?: ReactNode
}

// The confirmation asked before every deletion of the learning area.
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  confirmLabel,
  dismissLabel,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{dismissLabel ?? t("common:actions.cancel")}</AlertDialogCancel>
          {/* A plain button: the dialog closes once the deletion has succeeded. */}
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel ?? t("common:actions.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
