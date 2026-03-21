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
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import {
  ChecklistItem,
  ChecklistTemplate,
  ChecklistCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from "@/interfaces/checklist"

interface ChecklistTemplateEditorProps {
  template: ChecklistTemplate
  items: ChecklistItem[]
  onAddItem: (item: { item_name: string; description: string; category: string; is_required: boolean }) => void
  onUpdateItem: (item: ChecklistItem) => void
  onDeleteItem: (id: number | string) => void
  onReorder: (items: { id: number | string; sort_order: number }[]) => void
}

export function ChecklistTemplateEditor({
  template,
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorder,
}: ChecklistTemplateEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null)
  const [newItem, setNewItem] = useState({
    item_name: "",
    description: "",
    category: ChecklistCategory.EXTERIOR as string,
    is_required: true,
  })

  // Group items by category
  const groupedItems = CATEGORY_ORDER.reduce(
    (acc, cat) => {
      const catItems = items
        .filter((item) => item.category === cat)
        .sort((a, b) => a.sort_order - b.sort_order)
      if (catItems.length > 0) acc[cat] = catItems
      return acc
    },
    {} as Record<string, ChecklistItem[]>,
  )

  const handleAddItem = () => {
    if (!newItem.item_name.trim()) return
    onAddItem(newItem)
    setNewItem({
      item_name: "",
      description: "",
      category: ChecklistCategory.EXTERIOR,
      is_required: true,
    })
    setShowAddForm(false)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const category = result.source.droppableId
    const catItems = [...(groupedItems[category] || [])]

    const [moved] = catItems.splice(result.source.index, 1)
    catItems.splice(result.destination.index, 0, moved)

    const reordered = catItems.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }))

    onReorder(reordered)
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
        <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Ajouter un item
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {Object.entries(groupedItems).map(([category, catItems]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {CATEGORY_LABELS[category] || category}
                <Badge variant="secondary">{catItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId={category}>
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
                            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
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
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={() => setDeleteConfirmId(item.id)}
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

      {/* Add item dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Ajouter un item</DialogTitle>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Nom de l&apos;item</Label>
              <Input
                id="item-name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                placeholder="Ex: Vérifier le niveau d'huile"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-desc">Description (optionnel)</Label>
              <Textarea
                id="item-desc"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Instructions supplémentaires..."
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select
                value={newItem.category}
                onValueChange={(val) => setNewItem({ ...newItem, category: val })}
              >
                <SelectTrigger>
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
                checked={newItem.is_required}
                onCheckedChange={(val) => setNewItem({ ...newItem, is_required: val === true })}
              />
              <Label htmlFor="item-required" className="cursor-pointer">
                Obligatoire
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddItem} disabled={!newItem.item_name.trim()}>
              Ajouter
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
