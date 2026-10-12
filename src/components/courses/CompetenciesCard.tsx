"use client"

import type React from "react"
import { useState } from "react"
import { CheckCircle2, Circle, ListChecks, Loader2, Plus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/layout/EmptyState"
import { percentage } from "@/lib/learning-progress"

export interface Competency {
  id: number
  name: string
  description: string
  validated: boolean
}

interface CompetenciesCardProps {
  competencies: Competency[]
  // The instructor of the course adds and validates; the student only reads.
  canManage: boolean
  // Both resolve to true when the change was saved.
  onAdd: (competency: { name: string; description: string }) => Promise<boolean>
  onValidate: (competencyId: number) => Promise<boolean>
}

export function CompetenciesCard({ competencies, canManage, onAdd, onValidate }: CompetenciesCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [toValidate, setToValidate] = useState<Competency | null>(null)
  const [validating, setValidating] = useState(false)

  const validated = competencies.filter((competency) => competency.validated).length
  const total = competencies.length
  const canSubmit = name.trim() !== ""

  const closeForm = () => {
    setIsAdding(false)
    setName("")
    setDescription("")
  }

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    const saved = await onAdd({ name: name.trim(), description: description.trim() })
    setSaving(false)
    if (saved) closeForm()
  }

  const handleValidate = async () => {
    if (!toValidate) return
    setValidating(true)
    const saved = await onValidate(toValidate.id)
    setValidating(false)
    if (saved) setToValidate(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-lg">Compétences</CardTitle>
          <CardDescription>
            {total === 0
              ? "Ce qui est travaillé pendant le cours."
              : `${validated} sur ${total} validée${validated > 1 ? "s" : ""}`}
          </CardDescription>
        </div>
        {canManage && !isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="shrink-0">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {total > 0 && (
          <Progress
            value={percentage(validated, total)}
            className="h-2"
            aria-label={`${validated} compétences validées sur ${total}`}
          />
        )}

        {total === 0 && !isAdding ? (
          <EmptyState
            icon={ListChecks}
            title="Aucune compétence"
            description={
              canManage
                ? "Ajoutez les compétences travaillées pendant ce cours pour suivre la progression de l'élève."
                : "L'instructeur n'a pas encore ajouté de compétence à ce cours."
            }
            action={
              canManage ? (
                <Button onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter une compétence
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y">
            {competencies.map((competency) => (
              <li key={competency.id} className="flex items-start gap-3 py-3">
                {competency.validated ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{competency.name}</p>
                  {competency.description && (
                    <p className="text-sm text-muted-foreground">{competency.description}</p>
                  )}
                </div>
                {competency.validated ? (
                  <Badge variant="success">Validée</Badge>
                ) : canManage ? (
                  <Button variant="outline" size="sm" onClick={() => setToValidate(competency)}>
                    Valider
                  </Button>
                ) : (
                  <Badge variant="neutral">À valider</Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {isAdding && (
          <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="competency-name">
                Nom de la compétence <span className="text-destructive">*</span>
              </Label>
              <Input
                id="competency-name"
                placeholder="Ex. Atterrissage par vent de travers"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competency-description">Description</Label>
              <Textarea
                id="competency-description"
                placeholder="Ex. Tenir l'axe et corriger la dérive jusqu'au toucher des roues."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Facultatif.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={!canSubmit || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Ajouter la compétence
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <AlertDialog open={toValidate !== null} onOpenChange={(open) => !open && !validating && setToValidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider cette compétence ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {toValidate?.name} » sera marquée comme acquise et l'élève en sera informé. Une validation ne peut pas
              être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validating}>Annuler</AlertDialogCancel>
            <Button onClick={handleValidate} disabled={validating}>
              {validating && <Loader2 className="h-4 w-4 animate-spin" />}
              Valider la compétence
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
