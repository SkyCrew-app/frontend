"use client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus } from "lucide-react"

interface TaxonomyCategoryProps {
  categoryKey: string
  categoryLabel: string
  items: string[]
  newItemValue: string
  onNewItemChange: (value: string) => void
  onAddItem: () => void
  onRemoveItem: (item: string) => void
}

export function TaxonomyCategory({
  categoryKey,
  categoryLabel,
  items,
  newItemValue,
  onNewItemChange,
  onAddItem,
  onRemoveItem,
}: TaxonomyCategoryProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={categoryKey} className="text-base font-medium">
        {categoryLabel}
      </Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="text-sm bg-info/15 text-info"
          >
            {item}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-auto p-0 text-info hover:text-info"
              onClick={() => onRemoveItem(item)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Supprimer {item}</span>
            </Button>
          </Badge>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Aucun élément ajouté</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          id={categoryKey}
          value={newItemValue}
          onChange={(e) => onNewItemChange(e.target.value)}
          placeholder={`Ajouter un nouveau ${categoryLabel.toLowerCase()}`}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              onAddItem()
            }
          }}
        />
        <Button onClick={onAddItem} className="bg-info hover:bg-info/90 text-info-foreground">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter
        </Button>
      </div>
    </div>
  )
}
