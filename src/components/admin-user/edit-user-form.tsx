"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidePanel } from "@/components/layout/SidePanel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { roleLabel } from "@/lib/settings"
import type { User, Role } from "@/interfaces/user"

interface EditUserFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  roles: Role[]
  selectedRole: string | null
  onRoleChange: (role: string) => void
  saving?: boolean
  onSubmit: (userData: {
    first_name: string
    last_name: string
    email: string
    date_of_birth: string
    phone_number: string
  }) => void
}

type Field = "first_name" | "last_name" | "phone_number" | "date_of_birth"
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>

// The value of a date input, or nothing when the member has no valid birth date.
const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0]
}

const valuesOf = (user: User | null): Values => ({
  first_name: user?.first_name ?? "",
  last_name: user?.last_name ?? "",
  phone_number: user?.phone_number ?? "",
  date_of_birth: toDateInputValue(user?.date_of_birth),
})

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null

export function EditUserForm({
  isOpen,
  onOpenChange,
  user,
  roles,
  onRoleChange,
  saving = false,
  onSubmit,
}: EditUserFormProps) {
  const { t } = useTranslation("administration")
  const [values, setValues] = useState<Values>(() => valuesOf(user))
  const [errors, setErrors] = useState<Errors>({})

  // Start from the member's current values each time the panel opens.
  useEffect(() => {
    if (!isOpen) return
    setValues(valuesOf(user))
    setErrors({})
  }, [isOpen, user])

  if (!user) return null

  const setField = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = () => {
    const nextErrors: Errors = {}
    if (!values.first_name.trim()) nextErrors.first_name = t("users.form.errors.firstName")
    if (!values.last_name.trim()) nextErrors.last_name = t("users.form.errors.lastName")
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      first_name: values.first_name,
      last_name: values.last_name,
      email: user.email,
      date_of_birth: values.date_of_birth,
      phone_number: values.phone_number,
    })
  }

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
      title={t("users.edit.title")}
      description={`${user.first_name} ${user.last_name}`}
      onSubmit={handleSubmit}
      submitLabel={t("common:actions.save")}
      submitting={saving}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit_first_name">
              {t("users.fields.firstName")}
              <Required />
            </Label>
            <Input
              id="edit_first_name"
              name="first_name"
              value={values.first_name}
              onChange={(e) => setField("first_name", e.target.value)}
              aria-required="true"
              aria-invalid={errors.first_name ? true : undefined}
            />
            <FieldError message={errors.first_name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_last_name">
              {t("users.fields.lastName")}
              <Required />
            </Label>
            <Input
              id="edit_last_name"
              name="last_name"
              value={values.last_name}
              onChange={(e) => setField("last_name", e.target.value)}
              aria-required="true"
              aria-invalid={errors.last_name ? true : undefined}
            />
            <FieldError message={errors.last_name} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_email">{t("common:labels.email")}</Label>
          {/* The API finds the member by this address: changing it here would target another account. */}
          <Input
            id="edit_email"
            name="email"
            type="email"
            value={user.email}
            readOnly
            aria-describedby="edit_email_hint"
            className="bg-muted text-muted-foreground"
          />
          <p id="edit_email_hint" className="text-xs text-muted-foreground">
            {t("users.edit.emailHint")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit_phone">{t("common:labels.phone")}</Label>
            <Input
              id="edit_phone"
              name="phone_number"
              type="tel"
              value={values.phone_number}
              onChange={(e) => setField("phone_number", e.target.value)}
              placeholder={t("users.edit.phonePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_date_of_birth">{t("users.fields.dateOfBirth")}</Label>
            <Input
              id="edit_date_of_birth"
              name="date_of_birth"
              type="date"
              value={values.date_of_birth}
              onChange={(e) => setField("date_of_birth", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit_role">{t("users.fields.role")}</Label>
          <Select onValueChange={onRoleChange} defaultValue={user.role?.id.toString() || undefined}>
            <SelectTrigger id="edit_role">
              <SelectValue placeholder={t("users.edit.chooseRole")} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id.toString()}>
                  {roleLabel(role.role_name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("users.edit.roleHint")}</p>
        </div>
      </div>
    </SidePanel>
  )
}
