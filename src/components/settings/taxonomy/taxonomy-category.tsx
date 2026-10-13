"use client"

import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ItemList } from "../item-list"
import { SettingsSection } from "../settings-field"

interface TaxonomyCategoryProps {
  title: string
  /** Accessible name of the add button, e.g. "Ajouter un type de vol". */
  addLabel: string
  emptyText: string
  items: string[]
  onAdd: () => void
  onEdit: (item: string) => void
  onDelete: (item: string) => void
}

/** One choice list: its values, and the buttons to add, rename and delete them. */
export function TaxonomyCategory({ title, addLabel, emptyText, items, onAdd, onEdit, onDelete }: TaxonomyCategoryProps) {
  const { t } = useTranslation("administration")
  return (
    <SettingsSection
      title={title}
      action={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} aria-label={addLabel}>
          <Plus className="h-4 w-4" />
          {t("common:actions.add")}
        </Button>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ItemList
          items={items.map((item) => ({ key: item, name: item }))}
          onEdit={(item) => onEdit(item.name)}
          onDelete={(item) => onDelete(item.name)}
        />
      )}
    </SettingsSection>
  )
}
