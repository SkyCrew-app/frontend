"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import {
  GET_CHECKLIST_TEMPLATE,
  UPDATE_CHECKLIST_TEMPLATE,
  CREATE_CHECKLIST_ITEM,
  UPDATE_CHECKLIST_ITEM,
  DELETE_CHECKLIST_ITEM,
  REORDER_CHECKLIST_ITEMS,
} from "@/graphql/checklist"
import type { ChecklistItem, ChecklistTemplate } from "@/interfaces/checklist"
import {
  buildCreateChecklistItemInput,
  buildUpdateChecklistItemInput,
  type ChecklistItemDraft,
} from "@/lib/checklist-items"
import { ChecklistTemplateEditor } from "@/components/checklists/ChecklistTemplateEditor"

export default function AdminChecklistDetailPage() {
  const params = useParams()
  const { toast } = useToast()
  const id = Number(params.id)

  // Only the fields being edited: adding or moving an item reloads the template
  // and must not wipe what is typed here.
  const [infoEdits, setInfoEdits] = useState<Partial<Record<"name" | "description" | "aircraft_model", string>>>({})

  const { data, loading, error, refetch } = useQuery(GET_CHECKLIST_TEMPLATE, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  })

  const [updateTemplate, { loading: saving }] = useMutation(UPDATE_CHECKLIST_TEMPLATE)
  const [createItem] = useMutation(CREATE_CHECKLIST_ITEM)
  const [updateItem] = useMutation(UPDATE_CHECKLIST_ITEM)
  const [deleteItem] = useMutation(DELETE_CHECKLIST_ITEM)
  const [reorderItems] = useMutation(REORDER_CHECKLIST_ITEMS)

  const template: ChecklistTemplate | undefined = data?.checklistTemplate

  const templateInfo = {
    name: infoEdits.name ?? template?.name ?? "",
    description: infoEdits.description ?? template?.description ?? "",
    aircraft_model: infoEdits.aircraft_model ?? template?.aircraft_model ?? "",
  }
  const hasChanges =
    !!template &&
    (templateInfo.name !== template.name ||
      templateInfo.description !== (template.description || "") ||
      templateInfo.aircraft_model !== template.aircraft_model)
  const infoValid = templateInfo.name.trim() !== "" && templateInfo.aircraft_model.trim() !== ""

  const handleInfoChange = (field: "name" | "description" | "aircraft_model", value: string) => {
    setInfoEdits((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveInfo = async (event: FormEvent) => {
    event.preventDefault()
    if (!hasChanges || !infoValid) return
    try {
      await updateTemplate({
        variables: {
          input: {
            id,
            name: templateInfo.name,
            description: templateInfo.description,
            aircraft_model: templateInfo.aircraft_model,
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
      setInfoEdits({})
      toast({ title: "Modèle enregistré" })
    } catch {
      toast({
        variant: "destructive",
        title: "Les modifications n'ont pas pu être enregistrées",
        description: "Réessayez dans un instant.",
      })
    }
  }

  const handleAddItem = async (draft: ChecklistItemDraft): Promise<boolean> => {
    const input = buildCreateChecklistItemInput(id, draft, template?.items || [])
    if (!input) return false

    try {
      await createItem({
        variables: { input },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
      toast({ title: "Point ajouté", description: input.item_name })
      return true
    } catch {
      toast({
        variant: "destructive",
        title: "Le point n'a pas pu être ajouté",
        description: "Réessayez dans un instant.",
      })
      return false
    }
  }

  const handleUpdateItem = async (item: ChecklistItem, draft: ChecklistItemDraft): Promise<boolean> => {
    const input = buildUpdateChecklistItemInput(item, draft, template?.items || [])
    if (!input) return false

    try {
      await updateItem({
        variables: { input },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
      toast({ title: "Point enregistré", description: input.item_name })
      return true
    } catch {
      toast({
        variant: "destructive",
        title: "Le point n'a pas pu être enregistré",
        description: "Réessayez dans un instant.",
      })
      return false
    }
  }

  const handleDeleteItem = async (itemId: number | string) => {
    try {
      await deleteItem({
        variables: { id: Number(itemId) },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
      toast({ title: "Point supprimé" })
    } catch {
      toast({
        variant: "destructive",
        title: "Le point n'a pas pu être supprimé",
        description: "Réessayez dans un instant.",
      })
    }
  }

  const handleReorder = async (itemIds: number[]) => {
    try {
      await reorderItems({
        variables: { templateId: id, itemIds },
        // Shows the new order at once; it is rolled back if the API refuses it.
        optimisticResponse: {
          reorderChecklistItems: itemIds.map((itemId, index) => ({
            __typename: "ChecklistItem",
            id: itemId,
            sort_order: index,
          })),
        },
      })
    } catch {
      toast({
        variant: "destructive",
        title: "Le nouvel ordre n'a pas pu être enregistré",
        description: "Les points ont repris leur ordre précédent.",
      })
    }
  }

  const backButton = (
    <Button variant="outline" asChild>
      <Link href="/administration/checklists">
        <ArrowLeft className="h-4 w-4" />
        Tous les modèles
      </Link>
    </Button>
  )

  if (loading && !template) {
    return (
      <div className="space-y-6">
        <PageHeader title={<Skeleton className="h-8 w-56" />} actions={backButton} className="mb-0" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="space-y-6">
        <PageHeader title="Modèle de checklist" actions={backButton} className="mb-0" />
        <ErrorState
          description="Ce modèle n'a pas pu être chargé. Il n'existe peut-être plus."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {template.name}
            <Badge variant={template.is_active ? "success" : "neutral"}>{template.is_active ? "Actif" : "Inactif"}</Badge>
          </span>
        }
        description={`Modèle de checklist · ${template.aircraft_model}`}
        actions={backButton}
        className="mb-0"
      />

      <Card>
        <form onSubmit={handleSaveInfo}>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
            <CardDescription>Ce que le pilote voit avant de commencer la checklist.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Nom du modèle
                  <span className="text-destructive" aria-hidden="true">
                    {" *"}
                  </span>
                </Label>
                <Input
                  id="edit-name"
                  value={templateInfo.name}
                  onChange={(e) => handleInfoChange("name", e.target.value)}
                  placeholder="Prévol DR400"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">
                  Modèle d&apos;avion
                  <span className="text-destructive" aria-hidden="true">
                    {" *"}
                  </span>
                </Label>
                <Input
                  id="edit-model"
                  value={templateInfo.aircraft_model}
                  onChange={(e) => handleInfoChange("aircraft_model", e.target.value)}
                  placeholder="Robin DR400"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={templateInfo.description}
                onChange={(e) => handleInfoChange("description", e.target.value)}
                placeholder="Visite prévol complète, à faire avant chaque premier vol de la journée"
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {hasChanges && <p className="text-sm text-muted-foreground sm:mr-auto">Modifications non enregistrées</p>}
            <Button type="button" variant="outline" onClick={() => setInfoEdits({})} disabled={!hasChanges || saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={!hasChanges || !infoValid || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ChecklistTemplateEditor
        template={template}
        items={template.items || []}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        onDeleteItem={handleDeleteItem}
        onReorder={handleReorder}
      />
    </div>
  )
}
