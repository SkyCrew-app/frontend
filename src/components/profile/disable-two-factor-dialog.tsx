"use client"

import React, { useState } from "react"
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
      setError("Saisissez votre mot de passe actuel.")
      return
    }
    try {
      await disable2FA({ variables: { password } })
      setPassword("")
      setError("")
      onOpenChange(false)
      toast({
        title: "Double authentification désactivée",
        description: "Seul votre mot de passe sera demandé à la connexion.",
      })
      onDisabled?.()
    } catch {
      setError("Mot de passe incorrect, ou trop de tentatives. Vérifiez-le puis réessayez.")
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver la double authentification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre compte ne sera plus protégé que par son mot de passe. Pour confirmer, saisissez votre mot de passe
              actuel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="disable-2fa-password">Mot de passe actuel</Label>
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
              Annuler
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Désactiver le 2FA
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
