"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { User, Role } from "@/interfaces/user"

interface EditUserFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  roles: Role[]
  selectedRole: string | null
  onRoleChange: (role: string) => void
  onSubmit: (userData: {
    first_name: string
    last_name: string
    email: string
    date_of_birth: string
    phone_number: string
  }) => void
}

export function EditUserForm({
  isOpen,
  onOpenChange,
  user,
  roles,
  selectedRole,
  onRoleChange,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Modifier l'utilisateur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_first_name" className="text-right">
                Prénom
              </Label>
              <Input id="edit_first_name" name="first_name" defaultValue={user.first_name} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_last_name" className="text-right">
                Nom
              </Label>
              <Input id="edit_last_name" name="last_name" defaultValue={user.last_name} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_email" className="text-right">
                Email
              </Label>
              <Input id="edit_email" name="email" type="email" defaultValue={user.email} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_phone" className="text-right">
                Téléphone
              </Label>
              <Input
                id="edit_phone"
                name="phone_number"
                type="tel"
                defaultValue={user.phone_number}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_date_of_birth" className="text-right">
                Date de naissance
              </Label>
              <Input
                id="edit_date_of_birth"
                name="date_of_birth"
                type="date"
                defaultValue={new Date(user.date_of_birth).toISOString().split("T")[0]}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_role" className="text-right">
                Rôle
              </Label>
              <Select onValueChange={onRoleChange} defaultValue={user.role?.id.toString() || ""}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionnez un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.role_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Mettre à jour</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
