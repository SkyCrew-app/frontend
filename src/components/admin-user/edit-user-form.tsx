"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
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

// The value of a date input, or nothing when the member has no valid birth date.
const toDateInputValue = (value: string | null | undefined) => {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0]
}

export function EditUserForm({
  isOpen,
  onOpenChange,
  user,
  roles,
  onRoleChange,
  saving = false,
  onSubmit,
}: EditUserFormProps) {
  if (!user) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    onSubmit({
      first_name: formData.get("first_name") as string,
      last_name: formData.get("last_name") as string,
      email: formData.get("email") as string,
      date_of_birth: formData.get("date_of_birth") as string,
      phone_number: formData.get("phone_number") as string,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le membre</DialogTitle>
          <DialogDescription>
            {user.first_name} {user.last_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit_first_name">Prénom</Label>
              <Input id="edit_first_name" name="first_name" defaultValue={user.first_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_last_name">Nom</Label>
              <Input id="edit_last_name" name="last_name" defaultValue={user.last_name} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_email">Adresse e-mail</Label>
            {/* The API finds the member by this address: changing it here would target another account. */}
            <Input
              id="edit_email"
              name="email"
              type="email"
              defaultValue={user.email}
              readOnly
              aria-describedby="edit_email_hint"
              className="bg-muted text-muted-foreground"
            />
            <p id="edit_email_hint" className="text-xs text-muted-foreground">
              L'adresse e-mail identifie le compte et ne peut pas être modifiée ici.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Téléphone</Label>
              <Input
                id="edit_phone"
                name="phone_number"
                type="tel"
                defaultValue={user.phone_number ?? ""}
                placeholder="06 12 34 56 78"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_date_of_birth">Date de naissance</Label>
              <Input
                id="edit_date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={toDateInputValue(user.date_of_birth)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit_role">Rôle</Label>
            <Select onValueChange={onRoleChange} defaultValue={user.role?.id.toString() || undefined}>
              <SelectTrigger id="edit_role">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Le rôle détermine ce que le membre peut voir et modifier.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
