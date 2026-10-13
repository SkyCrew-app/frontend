"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation } from "@apollo/client"
import { Loader2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/hooks/use-toast"
import { DISABLE_2FA_MUTATION, GET_TWO_FACTOR_STATUS } from "@/graphql/user"

interface DisableTwoFactorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDisabled?: () => void
}

// Turning two-factor off weakens the account: the current password is asked again.
export function DisableTwoFactorDialog({ open, onOpenChange, onDisabled }: DisableTwoFactorDialogProps) {
  const { t } = useTranslation("profile")
  const { toast } = useToast()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [disable2FA, { loading }] = useMutation(DISABLE_2FA_MUTATION, {
    refetchQueries: [{ query: GET_TWO_FACTOR_STATUS }],
    awaitRefetchQueries: true,
  })

  const close = (next: boolean) => {
    if (loading) return
    if (!next) {
      setPassword("")
      setError("")
    }
    onOpenChange(next)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!password) {
      setError(t("twoFactor.disableDialog.passwordRequired"))
      return
    }
    try {
      await disable2FA({ variables: { password } })
      setPassword("")
      setError("")
      onOpenChange(false)
      toast({
        title: t("twoFactor.disableDialog.toastTitle"),
        description: t("twoFactor.disableDialog.toastDescription"),
      })
      onDisabled?.()
    } catch {
      setError(t("twoFactor.disableDialog.passwordRejected"))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("twoFactor.disableDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("twoFactor.disableDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">{t("twoFactor.disableDialog.passwordLabel")}</Label>
            <Input
              id="disable-2fa-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "disable-2fa-password-error" : undefined}
            />
            {error && (
              <p id="disable-2fa-password-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={loading}>
              {t("common:actions.cancel")}
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("twoFactor.disable")}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
