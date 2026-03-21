"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Save, AlertTriangle, ClipboardCheck } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import {
  GET_CHECKLIST_TEMPLATE,
  UPDATE_CHECKLIST_TEMPLATE,
  CREATE_CHECKLIST_ITEM,
  DELETE_CHECKLIST_ITEM,
  REORDER_CHECKLIST_ITEMS,
} from "@/graphql/checklist"
import type { ChecklistTemplate, ChecklistItem } from "@/interfaces/checklist"
import { ChecklistTemplateEditor } from "@/components/checklists/ChecklistTemplateEditor"

export default function AdminChecklistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = Number(params.id)

  const [templateInfo, setTemplateInfo] = useState({
    name: "",
    description: "",
    aircraft_model: "",
  })
  const [hasChanges, setHasChanges] = useState(false)

  const { data, loading, error } = useQuery(GET_CHECKLIST_TEMPLATE, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  })

  const [updateTemplate, { loading: saving }] = useMutation(UPDATE_CHECKLIST_TEMPLATE)
  const [createItem] = useMutation(CREATE_CHECKLIST_ITEM)
  const [deleteItem] = useMutation(DELETE_CHECKLIST_ITEM)
  const [reorderItems] = useMutation(REORDER_CHECKLIST_ITEMS)

  const template: ChecklistTemplate | undefined = data?.checklistTemplate

  useEffect(() => {
    if (template) {
      setTemplateInfo({
        name: template.name,
        description: template.description || "",
        aircraft_model: template.aircraft_model,
      })
    }
  }, [template])

  const handleInfoChange = (field: string, value: string) => {
    setTemplateInfo((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSaveInfo = async () => {
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
      setHasChanges(false)
      toast({
        title: "Modèle mis à jour",
        description: "Les informations du modèle ont été enregistrées.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible de sauvegarder les modifications.",
      })
    }
  }

  const handleAddItem = async (item: {
    item_name: string
    description: string
    category: string
    is_required: boolean
  }) => {
    try {
      await createItem({
        variables: {
          input: {
            templateId: id,
            item_name: item.item_name,
            description: item.description,
            category: item.category.toUpperCase(),
            is_required: item.is_required,
            sort_order: (template?.items?.length || 0),
          },
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
      toast({
        title: "Item ajouté",
        description: `L'item "${item.item_name}" a été ajouté.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible d'ajouter l'item.",
      })
    }
  }

  const handleDeleteItem = async (itemId: number | string) => {
    try {
      await deleteItem({
        variables: { id: Number(itemId) },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
      toast({
        title: "Item supprimé",
        description: "L'item a été supprimé de la checklist.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (error as Error).message || "Impossible de supprimer l'item.",
      })
    }
  }

  const handleReorder = async (reorderedItems: { id: number | string; sort_order: number }[]) => {
    try {
      const sortedItems = [...reorderedItems].sort((a, b) => a.sort_order - b.sort_order)
      await reorderItems({
        variables: {
          templateId: id,
          itemIds: sortedItems.map((item) => Number(item.id)),
        },
        refetchQueries: [{ query: GET_CHECKLIST_TEMPLATE, variables: { id } }],
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de réordonner les items.",
      })
    }
  }

  const handleUpdateItem = async (item: ChecklistItem) => {
    // Not used directly in the editor but kept for interface compatibility
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error || !template) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="p-6 text-red-800 dark:text-red-300 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold">Erreur de chargement</h3>
            <p>Impossible de charger le modèle de checklist.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <Button
          variant="ghost"
          onClick={() => router.push("/administration/checklists")}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux modèles
        </Button>

        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold sm:text-3xl">Modifier le modèle</h1>
        </div>

        {/* Template info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations du modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom du modèle</Label>
                <Input
                  id="edit-name"
                  value={templateInfo.name}
                  onChange={(e) => handleInfoChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model">Modèle d&apos;avion</Label>
                <Input
                  id="edit-model"
                  value={templateInfo.aircraft_model}
                  onChange={(e) => handleInfoChange("aircraft_model", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={templateInfo.description}
                onChange={(e) => handleInfoChange("description", e.target.value)}
                placeholder="Description du modèle..."
              />
            </div>
            {hasChanges && (
              <div className="flex justify-end">
                <Button onClick={handleSaveInfo} disabled={saving} className="gap-1">
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items editor */}
        <Card>
          <CardContent className="pt-6">
            <ChecklistTemplateEditor
              template={template}
              items={template.items || []}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onReorder={handleReorder}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
