"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { TAXONOMY_LISTS, type SettingsFormValues, type Taxonomies } from "@/lib/settings"
import { DeleteItemDialog, NameDialog } from "../item-list"
import { TaxonomyCategory } from "./taxonomy-category"

type ListKey = keyof Taxonomies

type PendingAction =
  | { type: "add"; list: ListKey }
  | { type: "edit"; list: ListKey; item: string }
  | { type: "delete"; list: ListKey; item: string }

export function TaxonomyManager() {
  const { watch, setValue } = useFormContext<SettingsFormValues>()
  const taxonomies = watch("taxonomies")
  const [action, setAction] = useState<PendingAction | null>(null)
  // Kept after closing so the dialog text does not change while it fades out.
  const [lastAction, setLastAction] = useState<PendingAction | null>(null)

  const open = (next: PendingAction) => {
    setAction(next)
    setLastAction(next)
  }
  const close = () => setAction(null)

  const itemsOf = (list: ListKey): string[] => taxonomies?.[list] ?? []
  const save = (list: ListKey, items: string[]) =>
    setValue(`taxonomies.${list}`, items, { shouldDirty: true, shouldValidate: true })

  const shown = action ?? lastAction
  const list = TAXONOMY_LISTS.find((entry) => entry.key === shown?.list) ?? TAXONOMY_LISTS[0]
  const shownItem = shown && shown.type !== "add" ? shown.item : ""

  const handleName = (name: string) => {
    if (!action) return
    if (action.type === "add") save(action.list, [...itemsOf(action.list), name])
    if (action.type === "edit") {
      save(
        action.list,
        itemsOf(action.list).map((item) => (item === action.item ? name : item)),
      )
    }
    close()
  }

  const handleDelete = () => {
    if (action?.type !== "delete") return
    save(
      action.list,
      itemsOf(action.list).filter((item) => item !== action.item),
    )
    close()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Les valeurs proposées dans les listes de choix du club. Vos changements sont pris en compte quand vous
        enregistrez les paramètres.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {TAXONOMY_LISTS.map((entry) => (
          <TaxonomyCategory
            key={entry.key}
            title={entry.title}
            addLabel={entry.addTitle}
            emptyText={entry.emptyText}
            items={itemsOf(entry.key)}
            onAdd={() => open({ type: "add", list: entry.key })}
            onEdit={(item) => open({ type: "edit", list: entry.key, item })}
            onDelete={(item) => open({ type: "delete", list: entry.key, item })}
          />
        ))}
      </div>

      <NameDialog
        open={action?.type === "add" || action?.type === "edit"}
        onOpenChange={(next) => !next && close()}
        title={shown?.type === "edit" ? `Modifier « ${shownItem} »` : list.addTitle}
        description={`Liste « ${list.title} ».`}
        label="Nom"
        placeholder={`Ex. ${list.example}`}
        initialValue={shown?.type === "edit" ? shownItem : ""}
        submitLabel={shown?.type === "edit" ? "Modifier" : "Ajouter"}
        existingNames={itemsOf(list.key)}
        duplicateMessage="Cette valeur est déjà dans la liste."
        onSubmit={handleName}
      />

      <DeleteItemDialog
        open={action?.type === "delete"}
        onOpenChange={(next) => !next && close()}
        title={list.deleteTitle}
        description={`« ${shownItem} » sera retiré de la liste « ${list.title} » au prochain enregistrement des paramètres.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
