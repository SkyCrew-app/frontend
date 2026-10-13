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
import { useTranslation } from "react-i18next"

export default function AdminChecklistDetailPage() {
  const { t } = useTranslation("checklists")
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
      toast({ title: t("admin.toast.saved.title") })
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.saveFailed.title"),
        description: t("toast.retryLater"),
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
      toast({ title: t("admin.toast.itemAdded.title"), description: input.item_name })
      return true
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.itemAddFailed.title"),
        description: t("toast.retryLater"),
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
      toast({ title: t("admin.toast.itemSaved.title"), description: input.item_name })
      return true
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.itemSaveFailed.title"),
        description: t("toast.retryLater"),
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
      toast({ title: t("admin.toast.itemDeleted.title") })
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.itemDeleteFailed.title"),
        description: t("toast.retryLater"),
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
        title: t("admin.toast.reorderFailed.title"),
        description: t("admin.toast.reorderFailed.description"),
      })
    }
  }

  const backButton = (
    <Button variant="outline" asChild>
      <Link href="/administration/checklists">
        <ArrowLeft className="h-4 w-4" />
        {t("admin.detail.back")}
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
        <PageHeader title={t("admin.detail.title")} actions={backButton} className="mb-0" />
        <ErrorState
          description={t("admin.detail.loadError")}
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
            <Badge variant={template.is_active ? "success" : "neutral"}>
              {template.is_active ? t("admin.active") : t("admin.inactive")}
            </Badge>
          </span>
        }
        description={t("admin.detail.subtitle", { model: template.aircraft_model })}
        actions={backButton}
        className="mb-0"
      />

      <Card>
        <form onSubmit={handleSaveInfo}>
          <CardHeader>
            <CardTitle className="text-base">{t("admin.detail.info.title")}</CardTitle>
            <CardDescription>{t("admin.detail.info.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  {t("admin.fields.name")}
                  <span className="text-destructive" aria-hidden="true">
                    {" *"}
                  </span>
                </Label>
                <Input
                  id="edit-name"
                  value={templateInfo.name}
                  onChange={(e) => handleInfoChange("name", e.target.value)}
                  placeholder={t("admin.fields.namePlaceholder")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">
                  {t("admin.fields.aircraftModel")}
                  <span className="text-destructive" aria-hidden="true">
                    {" *"}
                  </span>
                </Label>
                <Input
                  id="edit-model"
                  value={templateInfo.aircraft_model}
                  onChange={(e) => handleInfoChange("aircraft_model", e.target.value)}
                  placeholder={t("admin.fields.aircraftModelPlaceholder")}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">{t("common:labels.description")}</Label>
              <Textarea
                id="edit-desc"
                value={templateInfo.description}
                onChange={(e) => handleInfoChange("description", e.target.value)}
                placeholder={t("admin.fields.descriptionPlaceholder")}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            {hasChanges && <p className="text-sm text-muted-foreground sm:mr-auto">{t("admin.detail.unsavedChanges")}</p>}
            <Button type="button" variant="outline" onClick={() => setInfoEdits({})} disabled={!hasChanges || saving}>
              {t("common:actions.cancel")}
            </Button>
            <Button type="submit" disabled={!hasChanges || !infoValid || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("common:actions.save")}
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
