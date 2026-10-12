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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, UserPlus } from "lucide-react"

interface CreateUserFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  saving?: boolean
  onSubmit: (userData: { first_name: string; last_name: string; email: string; date_of_birth: string }) => void
}

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

export function CreateUserForm({ isOpen, onOpenChange, saving = false, onSubmit }: CreateUserFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    onSubmit({
      first_name: (formData.get("first_name") as string).trim(),
      last_name: (formData.get("last_name") as string).trim(),
      email: (formData.get("email") as string).trim(),
      date_of_birth: formData.get("date_of_birth") as string,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Ajouter un membre
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>Le membre recevra un e-mail pour activer son compte et choisir son mot de passe.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                Prénom
                <Required />
              </Label>
              <Input id="first_name" name="first_name" required autoComplete="off" placeholder="Camille" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Nom
                <Required />
              </Label>
              <Input id="last_name" name="last_name" required autoComplete="off" placeholder="Martin" />
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
              required
              autoComplete="off"
              placeholder="camille.martin@exemple.fr"
            />
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
              required
              max={new Date().toISOString().split("T")[0]}
              className="sm:w-1/2"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter le membre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
