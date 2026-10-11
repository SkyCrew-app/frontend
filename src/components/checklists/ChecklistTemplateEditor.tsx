"use client"

import { useState } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { ChecklistItem, ChecklistTemplate, CATEGORY_LABELS, CATEGORY_ORDER } from "@/interfaces/checklist"
import {
  emptyChecklistItemDraft,
  groupItemsByCategory,
  reorderItemIds,
  toChecklistItemDraft,
  type ChecklistItemDraft,
} from "@/lib/checklist-items"

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
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [draft, setDraft] = useState<ChecklistItemDraft>(emptyChecklistItemDraft)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null)

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
    if (deleteConfirmId !== null) {
      onDeleteItem(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Items de la checklist ({items.length})</h3>
        <Button onClick={openAddForm} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Ajouter un item
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {groupedItems.map(({ category, items: catItems }) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {CATEGORY_LABELS[category] || category}
                <Badge variant="secondary">{catItems.length}</Badge>
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
                            className={`flex items-center gap-2 rounded-lg border p-3 bg-background ${
                              snapshot.isDragging ? "shadow-lg" : ""
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab text-muted-foreground"
                              aria-label={`Déplacer l'item ${item.item_name}`}
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {item.item_name}
                                {item.is_required && <span className="text-red-500 ml-1">*</span>}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditForm(item)}
                              aria-label={`Modifier l'item ${item.item_name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => setDeleteConfirmId(item.id)}
                              aria-label={`Supprimer l'item ${item.item_name}`}
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

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Aucun item dans cette checklist.</p>
          <p className="text-sm mt-1">Ajoutez des items pour construire votre checklist.</p>
        </div>
      )}

      {/* Add / edit item dialog */}
      <Dialog open={showItemForm} onOpenChange={(open) => !saving && setShowItemForm(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{editingItem ? "Modifier l'item" : "Ajouter un item"}</DialogTitle>
          <DialogDescription>
            {editingItem
              ? "Modifiez le nom, la description, la catégorie ou le caractère obligatoire de l'item."
              : "Renseignez le nouvel item à ajouter à la checklist."}
          </DialogDescription>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nom de l&apos;item</Label>
              <Input
                id="item-name"
                value={draft.item_name}
                onChange={(e) => setDraft({ ...draft, item_name: e.target.value })}
                placeholder="Ex: Vérifier le niveau d'huile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-desc">Description (optionnel)</Label>
              <Textarea
                id="item-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Instructions supplémentaires..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Catégorie</Label>
              <Select value={draft.category} onValueChange={(val) => setDraft({ ...draft, category: val })}>
                <SelectTrigger id="item-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="item-required"
                checked={draft.is_required}
                onCheckedChange={(val) => setDraft({ ...draft, is_required: val === true })}
              />
              <Label htmlFor="item-required" className="cursor-pointer">
                Obligatoire
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemForm(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSubmitItem} disabled={saving || !draft.item_name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer cet item ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
