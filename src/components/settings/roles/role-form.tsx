"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RoleFormProps {
  defaultValue?: string
  onSubmit: (roleName: string) => void
  isSubmitting: boolean
}

export function RoleForm({ defaultValue = "", onSubmit, isSubmitting }: RoleFormProps) {
  const [roleName, setRoleName] = React.useState(defaultValue)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (roleName.trim()) {
      onSubmit(roleName.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="role_name">Nom du rôle</Label>
        <Input
          id="role_name"
          name="role_name"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          required
          autoFocus
        />
      </div>
      <Button type="submit" disabled={isSubmitting || !roleName.trim()}>
        {isSubmitting ? "Traitement..." : defaultValue ? "Mettre à jour" : "Créer"}
      </Button>
    </form>
  )
}
