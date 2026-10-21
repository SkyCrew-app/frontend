"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClipboardCheck, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { isAdministrator } from "@/lib/roles"
import { PageHeader } from "@/components/layout/PageHeader"
import { SidePanel } from "@/components/layout/SidePanel"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import {
  GET_CHECKLIST_TEMPLATES,
  CREATE_CHECKLIST_TEMPLATE,
  UPDATE_CHECKLIST_TEMPLATE,
  DELETE_CHECKLIST_TEMPLATE,
} from "@/graphql/checklist"
import type { ChecklistTemplate } from "@/interfaces/checklist"
import { useTranslation } from "react-i18next"

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

export default function AdminChecklistsPage() {
  const { t } = useTranslation("checklists")
  const router = useRouter()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    aircraft_model: "",
    description: "",
  })
  const [togglingId, setTogglingId] = useState<number | string | null>(null)
  const [templateToDelete, setTemplateToDelete] = useState<ChecklistTemplate | null>(null)
  // Deleting a template is reserved to administrators by the API.
  const canDelete = isAdministrator(useUserData(useCurrentUser()))

  const { data, loading, error, refetch } = useQuery(GET_CHECKLIST_TEMPLATES, {
    fetchPolicy: "network-only",
  })

  const [createTemplate, { loading: creating }] = useMutation(CREATE_CHECKLIST_TEMPLATE)
  const [updateTemplate] = useMutation(UPDATE_CHECKLIST_TEMPLATE)
  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_CHECKLIST_TEMPLATE)

  const templates: ChecklistTemplate[] = data?.checklistTemplates || []
  const canCreate = newTemplate.name.trim() !== "" && newTemplate.aircraft_model.trim() !== ""

  const handleCreate = async () => {
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
        title: t("admin.toast.created.title"),
        description: t("admin.toast.created.description"),
      })
      // A new template is empty: go straight to where its items are added.
      const createdId = result.data?.createChecklistTemplate?.id
      if (createdId) router.push(`/administration/checklists/${createdId}`)
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.createFailed.title"),
        description: t("toast.retryLater"),
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
        title: template.is_active ? t("admin.toast.deactivated.title") : t("admin.toast.activated.title"),
        description: template.is_active
          ? t("admin.toast.deactivated.description", { name: template.name })
          : t("admin.toast.activated.description", { name: template.name }),
      })
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.toggleFailed.title"),
        description: t("toast.retryLater"),
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return
    try {
      const result = await deleteTemplate({
        variables: { id: Number(templateToDelete.id) },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATES }],
        awaitRefetchQueries: true,
      })
      const removal = result.data?.deleteChecklistTemplate
      // A template that filled-in checklists refer to is kept, only taken out of use.
      toast(
        removal?.deleted
          ? {
              title: t("admin.toast.deleted.title"),
              description: t("admin.toast.deleted.description", { name: templateToDelete.name }),
            }
          : {
              title: t("admin.toast.deactivatedNotDeleted.title"),
              description:
                removal?.message ??
                t("admin.toast.deactivatedNotDeleted.description", { name: templateToDelete.name }),
            },
      )
      setTemplateToDelete(null)
    } catch {
      toast({
        variant: "destructive",
        title: t("admin.toast.deleteFailed.title"),
        description: t("toast.retryLater"),
      })
    }
  }

  const offeredSwitch = (template: (typeof templates)[number]) => (
    <div className="flex items-center gap-2">
      <Switch
        checked={template.is_active}
        disabled={togglingId === template.id}
        onCheckedChange={() => handleToggleActive(template)}
        aria-label={
          template.is_active
            ? t("admin.list.deactivateLabel", { name: template.name })
            : t("admin.list.activateLabel", { name: template.name })
        }
      />
      <Badge variant={template.is_active ? "success" : "neutral"}>
        {template.is_active ? t("admin.active") : t("admin.inactive")}
      </Badge>
    </div>
  )

  const templateActions = (template: (typeof templates)[number]) => (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(`/administration/checklists/${template.id}`)}
        aria-label={t("admin.list.editLabel", { name: template.name })}
        title={t("common:actions.edit")}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => setTemplateToDelete(template)}
          aria-label={t("admin.list.deleteLabel", { name: template.name })}
          title={t("common:actions.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  const createButton = (
    <Button onClick={() => setIsCreateOpen(true)}>
      <Plus className="h-4 w-4" />
      {t("admin.list.create")}
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin.list.title")}
        description={t("admin.list.description")}
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
          title={t("admin.list.empty.title")}
          description={t("admin.list.empty.description")}
          action={createButton}
        />
      ) : (
        <>
          {/* Wide screens: a table. */}
          <Card className="hidden overflow-hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.list.columns.template")}</TableHead>
                  <TableHead>{t("common:labels.aircraft")}</TableHead>
                  <TableHead className="text-right">{t("admin.list.columns.items")}</TableHead>
                  <TableHead>{t("admin.list.columns.offered")}</TableHead>
                  <TableHead className="w-24">
                    <span className="sr-only">{t("common:labels.actions")}</span>
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
                          <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{template.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{template.aircraft_model}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {itemCount === 0 ? <Badge variant="warning">{t("admin.list.emptyTemplate")}</Badge> : itemCount}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {offeredSwitch(template)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {templateActions(template)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Phones and tablets: one card per template. */}
          <ul className="space-y-3 lg:hidden" aria-label={t("admin.list.title")}>
            {templates.map((template) => {
              const itemCount = template.items?.length || 0
              return (
                <li key={template.id}>
                  <Card className="space-y-3 p-4">
                    <Link
                      href={`/administration/checklists/${template.id}`}
                      className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="break-words font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {template.aircraft_model} ·{" "}
                        {itemCount === 0
                          ? t("admin.list.emptyTemplate")
                          : t("admin.list.itemCount", { count: itemCount })}
                      </p>
                      {template.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </Link>
                    <div className="flex items-center justify-between gap-2">
                      {offeredSwitch(template)}
                      {templateActions(template)}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <AlertDialog
        open={templateToDelete !== null}
        onOpenChange={(open) => !open && !deleting && setTemplateToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.list.deleteDialog.title", { name: templateToDelete?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.list.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("common:actions.cancel")}</AlertDialogCancel>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("admin.list.deleteDialog.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SidePanel
        open={isCreateOpen}
        onOpenChange={(open) => !creating && setIsCreateOpen(open)}
        title={t("admin.list.createPanel.title")}
        description={t("admin.list.createPanel.description")}
        onSubmit={handleCreate}
        submitLabel={t("admin.list.createPanel.submit")}
        submitting={creating}
        submitDisabled={!canCreate}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">
              {t("admin.fields.name")}
              <Required />
            </Label>
            <Input
              id="template-name"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
              placeholder={t("admin.fields.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-model">
              {t("admin.fields.aircraftModel")}
              <Required />
            </Label>
            <Input
              id="template-model"
              value={newTemplate.aircraft_model}
              onChange={(e) => setNewTemplate({ ...newTemplate, aircraft_model: e.target.value })}
              placeholder={t("admin.fields.aircraftModelPlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-desc">{t("common:labels.description")}</Label>
            <Textarea
              id="template-desc"
              value={newTemplate.description}
              onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
              placeholder={t("admin.fields.descriptionPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("admin.fields.descriptionHint")}</p>
          </div>
        </div>
      </SidePanel>
    </div>
  )
}
