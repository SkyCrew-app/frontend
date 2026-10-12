"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardCheck, Loader2, Pencil, Plus } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import {
  GET_CHECKLIST_TEMPLATES,
  CREATE_CHECKLIST_TEMPLATE,
  UPDATE_CHECKLIST_TEMPLATE,
} from "@/graphql/checklist"
import type { ChecklistTemplate } from "@/interfaces/checklist"

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

export default function AdminChecklistsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    aircraft_model: "",
    description: "",
  })
  const [togglingId, setTogglingId] = useState<number | string | null>(null)

  const { data, loading, error, refetch } = useQuery(GET_CHECKLIST_TEMPLATES, {
    fetchPolicy: "network-only",
  })

  const [createTemplate, { loading: creating }] = useMutation(CREATE_CHECKLIST_TEMPLATE)
  const [updateTemplate] = useMutation(UPDATE_CHECKLIST_TEMPLATE)

  const templates: ChecklistTemplate[] = data?.checklistTemplates || []
  const canCreate = newTemplate.name.trim() !== "" && newTemplate.aircraft_model.trim() !== ""

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!canCreate) return
    try {
      const result = await createTemplate({
        variables: {
          input: {
            name: newTemplate.name,
            aircraft_model: newTemplate.aircraft_model,
            description: newTemplate.description,
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATES }],
      })

      setNewTemplate({ name: "", aircraft_model: "", description: "" })
      setIsCreateOpen(false)
      toast({
        title: "Modèle créé",
        description: "Ajoutez maintenant ses points de contrôle.",
      })
      // A new template is empty: go straight to where its items are added.
      const createdId = result.data?.createChecklistTemplate?.id
      if (createdId) router.push(`/administration/checklists/${createdId}`)
    } catch {
      toast({
        variant: "destructive",
        title: "Le modèle n'a pas pu être créé",
        description: "Réessayez dans un instant.",
      })
    }
  }

  const handleToggleActive = async (template: ChecklistTemplate) => {
    setTogglingId(template.id)
    try {
      await updateTemplate({
        variables: {
          input: {
            id: Number(template.id),
            is_active: !template.is_active,
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATES }],
      })
      toast({
        title: template.is_active ? "Modèle désactivé" : "Modèle activé",
        description: template.is_active
          ? `« ${template.name} » n'est plus proposé aux pilotes.`
          : `« ${template.name} » est maintenant proposé aux pilotes.`,
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Le statut du modèle n'a pas pu être modifié",
        description: "Réessayez dans un instant.",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const createButton = (
    <Button onClick={() => setIsCreateOpen(true)}>
      <Plus className="h-4 w-4" />
      Créer un modèle
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modèles de checklists"
        description="Les checklists prévol proposées aux pilotes, par type d'avion."
        actions={createButton}
        className="mb-0"
      />

      {loading && templates.length === 0 ? (
        <Card className="divide-y overflow-hidden">
          <Skeleton className="h-11 w-full rounded-none" />
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-5 w-20" />
            </div>
          ))}
        </Card>
      ) : error && templates.length === 0 ? (
        <ErrorState onRetry={() => refetch()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aucun modèle de checklist"
          description="Créez un modèle par type d'avion : les pilotes le rempliront avant chaque vol."
          action={createButton}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modèle</TableHead>
                <TableHead>Avion</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead>Proposé aux pilotes</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const itemCount = template.items?.length || 0
                return (
                  <TableRow
                    key={template.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/administration/checklists/${template.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="max-w-md truncate text-xs text-muted-foreground">{template.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{template.aircraft_model}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {itemCount === 0 ? <Badge variant="warning">Vide</Badge> : itemCount}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={template.is_active}
                          disabled={togglingId === template.id}
                          onCheckedChange={() => handleToggleActive(template)}
                          aria-label={
                            template.is_active ? `Désactiver le modèle ${template.name}` : `Activer le modèle ${template.name}`
                          }
                        />
                        <Badge variant={template.is_active ? "success" : "neutral"}>
                          {template.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/administration/checklists/${template.id}`)}
                        aria-label={`Modifier le modèle ${template.name}`}
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={(open) => !creating && setIsCreateOpen(open)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un modèle de checklist</DialogTitle>
            <DialogDescription>Vous ajouterez les points de contrôle à l&apos;étape suivante.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Nom du modèle
                <Required />
              </Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="Prévol DR400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-model">
                Modèle d&apos;avion
                <Required />
              </Label>
              <Input
                id="template-model"
                value={newTemplate.aircraft_model}
                onChange={(e) => setNewTemplate({ ...newTemplate, aircraft_model: e.target.value })}
                placeholder="Robin DR400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-desc">Description</Label>
              <Textarea
                id="template-desc"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Visite prévol complète, à faire avant chaque premier vol de la journée"
              />
              <p className="text-xs text-muted-foreground">Facultatif. Affichée au pilote en tête de la checklist.</p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creating}>
                Annuler
              </Button>
              <Button type="submit" disabled={!canCreate || creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Créer le modèle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
