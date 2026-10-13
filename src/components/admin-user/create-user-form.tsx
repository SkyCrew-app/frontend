"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidePanel } from "@/components/layout/SidePanel"
import { UserPlus } from "lucide-react"

interface CreateUserFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  onSubmit: (userData: { first_name: string; last_name: string; email: string; date_of_birth: string }) => void
}

type Field = "first_name" | "last_name" | "email" | "date_of_birth"
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>

const EMPTY: Values = { first_name: "", last_name: "", email: "", date_of_birth: "" }

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null

export function CreateUserForm({ isOpen, onOpenChange, saving = false, onSubmit }: CreateUserFormProps) {
  const { t } = useTranslation("administration")
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})

  // Start from a clean form each time the panel opens.
  useEffect(() => {
    if (!isOpen) return
    setValues(EMPTY)
    setErrors({})
  }, [isOpen])

  const setField = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const today = new Date().toISOString().split("T")[0]

  const handleSubmit = () => {
    const first_name = values.first_name.trim()
    const last_name = values.last_name.trim()
    const email = values.email.trim()

    const nextErrors: Errors = {}
    if (!first_name) nextErrors.first_name = t("users.form.errors.firstName")
    if (!last_name) nextErrors.last_name = t("users.form.errors.lastName")
    if (!email) nextErrors.email = t("users.form.errors.email")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = t("users.form.errors.emailInvalid")
    if (!values.date_of_birth) nextErrors.date_of_birth = t("users.form.errors.dateOfBirth")
    else if (values.date_of_birth > today) nextErrors.date_of_birth = t("users.form.errors.dateOfBirthFuture")
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({ first_name, last_name, email, date_of_birth: values.date_of_birth })
  }

  return (
    <>
      <Button onClick={() => onOpenChange(true)}>
        <UserPlus className="h-4 w-4" />
        {t("users.create.title")}
      </Button>
      <SidePanel
        open={isOpen}
        onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
        title={t("users.create.title")}
        description={t("users.create.description")}
        onSubmit={handleSubmit}
        submitLabel={t("users.create.submit")}
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                {t("users.fields.firstName")}
                <Required />
              </Label>
              <Input
                id="first_name"
                name="first_name"
                value={values.first_name}
                onChange={(e) => setField("first_name", e.target.value)}
                aria-required="true"
                aria-invalid={errors.first_name ? true : undefined}
                autoComplete="off"
                placeholder={t("users.create.firstNamePlaceholder")}
              />
              <FieldError message={errors.first_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                {t("users.fields.lastName")}
                <Required />
              </Label>
              <Input
                id="last_name"
                name="last_name"
                value={values.last_name}
                onChange={(e) => setField("last_name", e.target.value)}
                aria-required="true"
                aria-invalid={errors.last_name ? true : undefined}
                autoComplete="off"
                placeholder={t("users.create.lastNamePlaceholder")}
              />
              <FieldError message={errors.last_name} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              {t("common:labels.email")}
              <Required />
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
              aria-required="true"
              aria-invalid={errors.email ? true : undefined}
              autoComplete="off"
              placeholder={t("users.create.emailPlaceholder")}
            />
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">
              {t("users.fields.dateOfBirth")}
              <Required />
            </Label>
            <Input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              value={values.date_of_birth}
              onChange={(e) => setField("date_of_birth", e.target.value)}
              aria-required="true"
              aria-invalid={errors.date_of_birth ? true : undefined}
              max={today}
              className="sm:w-1/2"
            />
            <FieldError message={errors.date_of_birth} />
          </div>
        </div>
      </SidePanel>
    </>
  )
}
