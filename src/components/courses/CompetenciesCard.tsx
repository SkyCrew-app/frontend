"use client"

import type React from "react"
import { useState } from "react"
import { CheckCircle2, Circle, ListChecks, Loader2, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
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
  // Nothing is validated on a course that has not started or is cancelled (the API refuses it).
  canValidate?: boolean
  // Both resolve to true when the change was saved.
  onAdd: (competency: { name: string; description: string }) => Promise<boolean>
  onValidate: (competencyId: number) => Promise<boolean>
}

export function CompetenciesCard({
  competencies,
  canManage,
  canValidate = canManage,
  onAdd,
  onValidate,
}: CompetenciesCardProps) {
  const { t } = useTranslation("instruction")
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
          <CardTitle className="text-lg">{t("courses.competencies.title")}</CardTitle>
          <CardDescription>
            {total === 0
              ? t("courses.competencies.description")
              : t("courses.competencies.summary", { count: validated, total })}
          </CardDescription>
        </div>
        {canManage && !isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="shrink-0">
            <Plus className="h-4 w-4" />
            {t("common:actions.add")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {total > 0 && (
          <Progress
            value={percentage(validated, total)}
            className="h-2"
            aria-label={t("courses.competencies.progressAria", { validated, total })}
          />
        )}

        {total === 0 && !isAdding ? (
          <EmptyState
            icon={ListChecks}
            title={t("courses.competencies.empty.title")}
            description={
              canManage
                ? t("courses.competencies.empty.manage")
                : t("courses.competencies.empty.readOnly")
            }
            action={
              canManage ? (
                <Button onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4" />
                  {t("courses.competencies.addOne")}
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
                  <Badge variant="success">{t("courses.competencies.validated")}</Badge>
                ) : canManage && canValidate ? (
                  <Button variant="outline" size="sm" onClick={() => setToValidate(competency)}>
                    {t("courses.competencies.validate")}
                  </Button>
                ) : (
                  <Badge variant="neutral">{t("courses.competencies.toValidate")}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}

        {isAdding && (
          <form onSubmit={handleAdd} className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="competency-name">
                {t("courses.competencies.nameLabel")} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="competency-name"
                placeholder={t("courses.competencies.namePlaceholder")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="competency-description">{t("common:labels.description")}</Label>
              <Textarea
                id="competency-description"
                placeholder={t("courses.competencies.descriptionPlaceholder")}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{t("shared.optional")}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="submit" disabled={!canSubmit || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("courses.competencies.submit")}
              </Button>
            </div>
          </form>
        )}
      </CardContent>

      <AlertDialog open={toValidate !== null} onOpenChange={(open) => !open && !validating && setToValidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courses.competencies.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courses.competencies.confirm.description", { name: toValidate?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={validating}>{t("common:actions.cancel")}</AlertDialogCancel>
            <Button onClick={handleValidate} disabled={validating}>
              {validating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("courses.competencies.confirm.submit")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
