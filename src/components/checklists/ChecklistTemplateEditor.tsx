"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClipboardList, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { EmptyState } from "@/components/layout/EmptyState"
import { SidePanel } from "@/components/layout/SidePanel"
import { cn } from "@/lib/utils"
import { ChecklistItem, ChecklistTemplate, CATEGORY_ORDER } from "@/interfaces/checklist"
import {
  checklistCategoryLabel,
  emptyChecklistItemDraft,
  groupItemsByCategory,
  reorderItemIds,
  toChecklistItemDraft,
  type ChecklistItemDraft,
} from "@/lib/checklist-items"
import { useTranslation } from "react-i18next"

interface ChecklistTemplateEditorProps {
  template: ChecklistTemplate
  items: ChecklistItem[]
  // Both resolve to true once the item is saved; the form stays open otherwise.
  onAddItem: (draft: ChecklistItemDraft) => Promise<boolean>
  onUpdateItem: (item: ChecklistItem, draft: ChecklistItemDraft) => Promise<boolean>
  onDeleteItem: (id: number | string) => void
  // Ids of every item of the template, in their new order.
  onReorder: (itemIds: number[]) => void
}

export function ChecklistTemplateEditor({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorder,
}: ChecklistTemplateEditorProps) {
  const { t } = useTranslation("checklists")
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [draft, setDraft] = useState<ChecklistItemDraft>(emptyChecklistItemDraft)
  const [saving, setSaving] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ChecklistItem | null>(null)

  const groupedItems = groupItemsByCategory(items)

  const openAddForm = () => {
    setEditingItem(null)
    setDraft(emptyChecklistItemDraft())
    setShowItemForm(true)
  }

  const openEditForm = (item: ChecklistItem) => {
    setEditingItem(item)
    setDraft(toChecklistItemDraft(item))
    setShowItemForm(true)
  }

  const handleSubmitItem = async () => {
    if (!draft.item_name.trim() || saving) return

    setSaving(true)
    try {
      const saved = editingItem ? await onUpdateItem(editingItem, draft) : await onAddItem(draft)
      if (saved) setShowItemForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.droppableId !== result.source.droppableId) return

    const itemIds = reorderItemIds(items, result.source.droppableId, result.source.index, result.destination.index)
    if (itemIds) onReorder(itemIds)
  }

  const handleConfirmDelete = () => {
    if (itemToDelete !== null) {
      onDeleteItem(itemToDelete.id)
      setItemToDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("editor.title", { total: items.length })}</h2>
          {items.length > 1 && (
            <p className="text-sm text-muted-foreground">
              {t("editor.dragHint")}
            </p>
          )}
        </div>
        {items.length > 0 && (
          <Button onClick={openAddForm} className="shrink-0">
            <Plus className="h-4 w-4" />
            {t("editor.addItem")}
          </Button>
        )}
      </div>

      {items.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t("editor.empty.title")}
          description={t("editor.empty.description")}
          action={
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4" />
              {t("editor.empty.action")}
            </Button>
          }
        />
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        {groupedItems.map(({ category, items: catItems }) => (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                {checklistCategoryLabel(category)}
                <span className="text-sm font-normal tabular-nums text-muted-foreground">{catItems.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId={category} type={category}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                    {catItems.map((item, index) => (
                      <Draggable key={String(item.id)} draggableId={String(item.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border bg-background p-2 pl-1",
                              snapshot.isDragging && "shadow-lg",
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="flex h-9 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                              aria-label={t("editor.moveLabel", { name: item.item_name })}
                              title={t("editor.move")}
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{item.item_name}</p>
                              {item.description && (
                                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                              )}
                            </div>
                            <Badge variant={item.is_required ? "outline" : "neutral"} className="hidden shrink-0 sm:inline-flex">
                              {item.is_required ? t("common:labels.required") : t("common:labels.optional")}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() => openEditForm(item)}
                              aria-label={t("editor.editLabel", { name: item.item_name })}
                              title={t("common:actions.edit")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setItemToDelete(item)}
                              aria-label={t("editor.deleteLabel", { name: item.item_name })}
                              title={t("common:actions.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        ))}
      </DragDropContext>

      {/* Add / edit item panel */}
      <SidePanel
        open={showItemForm}
        onOpenChange={(open) => !saving && setShowItemForm(open)}
        title={editingItem ? t("editor.panel.editTitle") : t("editor.addItem")}
        description={
          editingItem
            ? t("editor.panel.editDescription")
            : t("editor.panel.addDescription")
        }
        onSubmit={handleSubmitItem}
        submitLabel={editingItem ? t("common:actions.save") : t("common:actions.add")}
        submitting={saving}
        submitDisabled={!draft.item_name.trim()}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">
              {t("editor.panel.name")}
              <span className="text-destructive" aria-hidden="true">
                {" *"}
              </span>
            </Label>
            <Input
              id="item-name"
              value={draft.item_name}
              onChange={(e) => setDraft({ ...draft, item_name: e.target.value })}
              placeholder={t("editor.panel.namePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">{t("editor.panel.details")}</Label>
            <Textarea
              id="item-desc"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t("editor.panel.detailsPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("editor.panel.detailsHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-category">{t("common:labels.category")}</Label>
            <Select value={draft.category} onValueChange={(val) => setDraft({ ...draft, category: val })}>
              <SelectTrigger id="item-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_ORDER.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {checklistCategoryLabel(cat)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="item-required"
              checked={draft.is_required}
              onCheckedChange={(val) => setDraft({ ...draft, is_required: val === true })}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="item-required" className="cursor-pointer">
                {t("common:labels.required")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("editor.panel.requiredHint")}
              </p>
            </div>
          </div>
        </div>
      </SidePanel>

      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("editor.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("editor.deleteDialog.description", { name: itemToDelete?.item_name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={handleConfirmDelete}>
              {t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
