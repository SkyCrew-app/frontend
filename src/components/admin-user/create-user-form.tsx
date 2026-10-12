"use client"

import { useEffect, useState } from "react"
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
    if (!first_name) nextErrors.first_name = "Indiquez le prénom."
    if (!last_name) nextErrors.last_name = "Indiquez le nom."
    if (!email) nextErrors.email = "Indiquez l'adresse e-mail."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Cette adresse e-mail n'est pas valide."
    if (!values.date_of_birth) nextErrors.date_of_birth = "Indiquez la date de naissance."
    else if (values.date_of_birth > today) nextErrors.date_of_birth = "La date de naissance ne peut pas être dans le futur."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({ first_name, last_name, email, date_of_birth: values.date_of_birth })
  }

  return (
    <>
      <Button onClick={() => onOpenChange(true)}>
        <UserPlus className="h-4 w-4" />
        Ajouter un membre
      </Button>
      <SidePanel
        open={isOpen}
        onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
        title="Ajouter un membre"
        description="Le membre recevra un e-mail pour activer son compte et choisir son mot de passe."
        onSubmit={handleSubmit}
        submitLabel="Ajouter le membre"
        submitting={saving}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                Prénom
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
                placeholder="Camille"
              />
              <FieldError message={errors.first_name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Nom
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
                placeholder="Martin"
              />
              <FieldError message={errors.last_name} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              Adresse e-mail
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
              placeholder="camille.martin@exemple.fr"
            />
            <FieldError message={errors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">
              Date de naissance
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
