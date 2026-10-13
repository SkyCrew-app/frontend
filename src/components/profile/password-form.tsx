"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { UPDATE_PASSWORD } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { useLogout } from "@/components/hooks/useLogout"
import { cn } from "@/lib/utils"
import { FormField } from "./form-field"

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  error?: string
  hint?: string
  className?: string
}

function PasswordField({ id, label, value, onChange, autoComplete, error, hint, className }: PasswordFieldProps) {
  const { t } = useTranslation("profile")
  const [visible, setVisible] = useState(false)

  return (
    <FormField id={id} label={label} required error={error} hint={hint} className={className}>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn("pr-11", error && "border-destructive")}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={visible ? t("password.hide") : t("password.show")}
          title={visible ? t("password.hide") : t("password.show")}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FormField>
  )
}

export function PasswordForm() {
  const { t } = useTranslation("profile")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const { toast } = useToast()
  const [updatePassword] = useMutation(UPDATE_PASSWORD)
  const logout = useLogout()

  const validateForm = () => {
    let valid = true
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }

    if (!currentPassword) {
      valid = false
      newErrors.currentPassword = t("password.errors.currentRequired")
    }

    if (!newPassword) {
      valid = false
      newErrors.newPassword = t("password.errors.newRequired")
    } else if (newPassword.length < 8) {
      valid = false
      newErrors.newPassword = t("password.errors.newTooShort")
    }

    if (!confirmPassword) {
      valid = false
      newErrors.confirmPassword = t("password.errors.confirmRequired")
    } else if (newPassword !== confirmPassword) {
      valid = false
      newErrors.confirmPassword = t("password.errors.mismatch")
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsUpdating(true)
    try {
      const { data } = await updatePassword({
        variables: {
          currentPassword,
          newPassword,
        },
      })

      if (data?.updatePassword?.id) {
        toast({
          title: t("password.toast.changedTitle"),
          description: t("password.toast.changedDescription"),
        })

        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        // The API no longer accepts this session either.
        await logout()
      } else {
        toast({
          variant: "destructive",
          title: t("toast.error"),
          description: t("password.toast.failed"),
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("toast.error"),
        description: t("password.toast.failed"),
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }))
  }

  return (
    <Card>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <CardHeader>
          <CardTitle>{t("password.title")}</CardTitle>
          <CardDescription>{t("password.description")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            id="currentPassword"
            label={t("password.current")}
            value={currentPassword}
            onChange={(value) => {
              setCurrentPassword(value)
              clearError("currentPassword")
            }}
            autoComplete="current-password"
            error={errors.currentPassword}
            className="sm:col-span-2 sm:max-w-sm"
          />
          <PasswordField
            id="newPassword"
            label={t("password.new")}
            value={newPassword}
            onChange={(value) => {
              setNewPassword(value)
              clearError("newPassword")
            }}
            autoComplete="new-password"
            error={errors.newPassword}
            hint={t("password.hint")}
          />
          <PasswordField
            id="confirmPassword"
            label={t("password.confirm")}
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value)
              clearError("confirmPassword")
            }}
            autoComplete="new-password"
            error={errors.confirmPassword}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isUpdating ? t("password.submitting") : t("password.submit")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
