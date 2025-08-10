"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import {
  Plus,
  Save,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Loader2,
  GripVertical,
  Copy,
  AlertTriangle,
  X,
} from "lucide-react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import {
  GET_AUDIT_TEMPLATE,
  CREATE_AUDIT_TEMPLATE,
  UPDATE_AUDIT_TEMPLATE,
  DELETE_AUDIT_TEMPLATE,
  GET_AUDIT_ENUMS,
} from "@/graphql/audit"
import { AuditCategoryType, AuditFrequencyType, CriticalityLevel } from "@/interfaces/audit"
import { getAuditCategoryLabel, getAuditFrequencyLabel, getCriticalityLabel } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"

export function TemplateManagement() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<any[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { loading, error, data, refetch } = useQuery(GET_AUDIT_TEMPLATE)
  const { data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  const [createTemplate, { loading: createLoading }] = useMutation(CREATE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ description: "Modèle d'audit créé avec succès" })
      refetch()
      setIsCreateDialogOpen(false)
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Erreur: ${error.message}` })
    },
  })

  const [updateTemplate, { loading: updateLoading }] = useMutation(UPDATE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ description: "Modèle d'audit mis à jour avec succès" })
      refetch()
      setIsEditDialogOpen(false)
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Erreur: ${error.message}` })
    },
  })

  const [deleteTemplate, { loading: deleteLoading }] = useMutation(DELETE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ description: "Modèle d'audit supprimé avec succès" })
      refetch()
      setIsDeleteDialogOpen(false)
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Erreur: ${error.message}` })
    },
  })

  useEffect(() => {
    if (data?.auditTemplates) {
      setTemplates(data.auditTemplates)
    }
  }, [data])

  const handleCreateTemplate = () => {
    setSelectedTemplate(null)
    setIsCreateDialogOpen(true)
  }

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template)
    setIsEditDialogOpen(true)
  }

  const handleDeleteTemplate = (template: any) => {
    setSelectedTemplate(template)
    setIsDeleteDialogOpen(true)
  }

  const handleDuplicateTemplate = (template: any) => {
    const duplicatedTemplate = {
      ...template,
      name: `${template.name} (copie)`,
      id: undefined,
    }
    setSelectedTemplate(duplicatedTemplate)
    setIsCreateDialogOpen(true)
  }

  const confirmDeleteTemplate = () => {
    if (selectedTemplate) {
      deleteTemplate({
        variables: {
          id: selectedTemplate.id,
        },
      })
    }
  }

  const toggleTemplateExpand = (templateId: number) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId)
  }

  if (loading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        Erreur lors du chargement des modèles d'audit: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Modèles d'audit</h2>
        <Button onClick={handleCreateTemplate} className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Nouveau modèle
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <div className="space-y-2">
            <p className="text-lg font-medium">Aucun modèle d'audit</p>
            <p className="text-sm text-muted-foreground">Commencez par créer un nouveau modèle d'audit.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateTemplate(template)}
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Dupliquer</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditTemplate(template)} title="Modifier">
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Modifier</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTemplate(template)}
                      title="Supprimer"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Fréquence recommandée</span>
                    <span className="text-sm font-medium">
                      {getAuditFrequencyLabel(template.recommended_frequency)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Types d'aéronefs</span>
                    <span className="text-sm font-medium">
                      {template.applicable_aircraft_types?.join(", ") || "Tous"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Statut</span>
                    <span className="text-sm font-medium">
                      {template.is_active ? (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        >
                          Actif
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        >
                          Inactif
                        </Badge>
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => toggleTemplateExpand(template.id)}
                >
                  <span>
                    {template.items?.length || 0} élément{template.items?.length !== 1 ? "s" : ""}
                  </span>
                  {expandedTemplate === template.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CardFooter>
              {expandedTemplate === template.id && (
                <div className="border-t px-6 py-4">
                  <h4 className="mb-3 text-sm font-medium">Éléments du modèle</h4>
                  {template.items?.length > 0 ? (
                    <div className="space-y-2">
                      {template.items.map((item: any) => (
                        <div key={item.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium">{item.title}</h5>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                item.criticality === CriticalityLevel.CRITIQUE
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                  : item.criticality === CriticalityLevel.MAJEUR
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                                    : item.criticality === CriticalityLevel.MINEUR
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                              }
                            >
                              {getCriticalityLabel(item.criticality)}
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Catégorie:</span> {getAuditCategoryLabel(item.category)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun élément dans ce modèle.</p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <TemplateFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        template={selectedTemplate}
        enumsData={enumsData}
        onSubmit={(templateData) => {
          createTemplate({
            variables: {
              input: {
                name: templateData.name,
                description: templateData.description,
                recommended_frequency: templateData.recommended_frequency,
                applicable_aircraft_types: templateData.applicable_aircraft_types,
                items: templateData.items,
                createdById: userId,
              },
            },
          })
        }}
        isLoading={createLoading}
        mode="create"
      />

      <TemplateFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        template={selectedTemplate}
        enumsData={enumsData}
        onSubmit={(templateData) => {
          updateTemplate({
            variables: {
              id: selectedTemplate.id,
              input: {
                name: templateData.name,
                description: templateData.description,
                recommended_frequency: templateData.recommended_frequency,
                applicable_aircraft_types: templateData.applicable_aircraft_types,
                is_active: templateData.is_active,
                items: templateData.items,
              },
            },
          })
        }}
        isLoading={updateLoading}
        mode="edit"
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à ce modèle seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTemplate}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface TemplateFormDialogProps {
  isOpen: boolean
  onClose: () => void
  template: any
  enumsData: any
  onSubmit: (templateData: any) => void
  isLoading: boolean
  mode: "create" | "edit"
}

function TemplateFormDialog({
  isOpen,
  onClose,
  template,
  enumsData,
  onSubmit,
  isLoading,
  mode,
}: TemplateFormDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    recommended_frequency: AuditFrequencyType.ANNUEL,
    applicable_aircraft_types: [] as string[],
    is_active: true,
    items: [] as any[],
  })
  const [newAircraftType, setNewAircraftType] = useState("")
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null)
  const [itemFormData, setItemFormData] = useState({
    title: "",
    description: "",
    category: AuditCategoryType.AUTRE,
    criticality: CriticalityLevel.MINEUR,
    inspection_method: "",
    expected_result: "",
    reference_documentation: "",
    requires_photo_evidence: false,
    is_mandatory: true,
  })
  const [isItemFormOpen, setIsItemFormOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        description: template.description || "",
        recommended_frequency: template.recommended_frequency || AuditFrequencyType.ANNUEL,
        applicable_aircraft_types: template.applicable_aircraft_types || [],
        is_active: template.is_active !== undefined ? template.is_active : true,
        items:
          template.items?.map((item: any, index: number) => ({
            ...item,
            order_index: item.order_index || index,
          })) || [],
      })
    } else {
      resetForm()
    }
  }, [template, isOpen])

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      recommended_frequency: AuditFrequencyType.ANNUEL,
      applicable_aircraft_types: [],
      is_active: true,
      items: [],
    })
    setValidationErrors({})
  }

  const resetItemForm = () => {
    setItemFormData({
      title: "",
      description: "",
      category: AuditCategoryType.AUTRE,
      criticality: CriticalityLevel.MINEUR,
      inspection_method: "",
      expected_result: "",
      reference_documentation: "",
      requires_photo_evidence: false,
      is_mandatory: true,
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleItemInputChange = (field: string, value: any) => {
    setItemFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const addAircraftType = () => {
    if (newAircraftType.trim() && !formData.applicable_aircraft_types.includes(newAircraftType.trim())) {
      handleInputChange("applicable_aircraft_types", [...formData.applicable_aircraft_types, newAircraftType.trim()])
      setNewAircraftType("")
    }
  }

  const removeAircraftType = (type: string) => {
    handleInputChange(
      "applicable_aircraft_types",
      formData.applicable_aircraft_types.filter((t) => t !== type),
    )
  }

  const openItemForm = (index?: number) => {
    if (index !== undefined) {
      const item = formData.items[index]
      setItemFormData({
        title: item.title || "",
        description: item.description || "",
        category: item.category || AuditCategoryType.AUTRE,
        criticality: item.criticality || CriticalityLevel.MINEUR,
        inspection_method: item.inspection_method || "",
        expected_result: item.expected_result || "",
        reference_documentation: item.reference_documentation || "",
        requires_photo_evidence: item.requires_photo_evidence || false,
        is_mandatory: item.is_mandatory !== undefined ? item.is_mandatory : true,
      })
      setCurrentItemIndex(index)
    } else {
      resetItemForm()
      setCurrentItemIndex(null)
    }
    setIsItemFormOpen(true)
  }

  const saveItem = () => {
    const errors: Record<string, string> = {}
    if (!itemFormData.title.trim()) {
      errors.itemTitle = "Le titre est requis"
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    const newItem = {
      ...itemFormData,
      order_index: currentItemIndex !== null ? formData.items[currentItemIndex].order_index : formData.items.length,
    }

    const newItems = [...formData.items]
    if (currentItemIndex !== null) {
      newItems[currentItemIndex] = newItem
    } else {
      newItems.push(newItem)
    }

    handleInputChange("items", newItems)
    setIsItemFormOpen(false)
  }

  const removeItem = (index: number) => {
    const newItems = [...formData.items]
    newItems.splice(index, 1)
    handleInputChange("items", newItems)
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnd = (result: any) => {
    setIsDragging(false)

    if (!result.destination) return

    if (result.destination.index === result.source.index) return

    const items = Array.from(formData.items)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    const updatedItems = items.map((item, index) => ({
      ...item,
      order_index: index,
    }))

    handleInputChange("items", updatedItems)
  }

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = "Le nom du modèle est requis"
    }

    if (formData.items.length === 0) {
      errors.items = "Au moins un élément d'audit est requis"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const submissionData = {
      ...formData,
      items: formData.items.map((item, index) => ({
        ...item,
        order_index: index,
      })),
    }

    onSubmit(submissionData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Créer un nouveau modèle d'audit" : "Modifier le modèle d'audit"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Définissez les détails et les éléments du nouveau modèle d'audit."
              : "Modifiez les détails et les éléments du modèle d'audit existant."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Nom du modèle <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nom du modèle d'audit"
                className={validationErrors.name ? "border-red-500" : ""}
              />
              {validationErrors.name && <p className="text-xs text-red-500">{validationErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-frequency">
                Fréquence recommandée <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.recommended_frequency}
                onValueChange={(value) => handleInputChange("recommended_frequency", value)}
              >
                <SelectTrigger id="template-frequency">
                  <SelectValue placeholder="Sélectionner une fréquence" />
                </SelectTrigger>
                <SelectContent>
                  {enumsData?.auditFrequencyTypes?.map((frequency: string) => (
                    <SelectItem key={frequency} value={frequency}>
                      {getAuditFrequencyLabel(frequency as AuditFrequencyType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Description du modèle d'audit"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Types d'aéronefs applicables</Label>
            <div className="flex items-center gap-2">
              <Input
                value={newAircraftType}
                onChange={(e) => setNewAircraftType(e.target.value)}
                placeholder="Ajouter un type d'aéronef"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addAircraftType()
                  }
                }}
              />
              <Button type="button" onClick={addAircraftType} className="shrink-0">
                Ajouter
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.applicable_aircraft_types.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {type}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeAircraftType(type)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Supprimer</span>
                  </Button>
                </Badge>
              ))}
              {formData.applicable_aircraft_types.length === 0 && (
                <span className="text-sm text-muted-foreground">Aucun type d'aéronef spécifié (applicable à tous)</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="template-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange("is_active", checked)}
            />
            <Label htmlFor="template-active">Modèle actif</Label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>
                Éléments d'audit <span className="text-red-500">*</span>
              </Label>
              <Button type="button" onClick={() => openItemForm()} className="flex items-center gap-1.5" size="sm">
                <Plus className="h-4 w-4" />
                Ajouter un élément
              </Button>
            </div>

            {validationErrors.items && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertTriangle className="h-4 w-4" />
                {validationErrors.items}
              </div>
            )}

            <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="space-y-2 min-h-[100px] border border-dashed rounded-md p-2">
                <Droppable
                  droppableId="audit-items"
                  isDropDisabled={Boolean(isItemFormOpen)}
                  isCombineEnabled={false}
                  ignoreContainerClipping={false}
                >
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                      style={{ minHeight: "10px" }}
                    >
                      {formData.items.length > 0 ? (
                        <>
                          {formData.items.map((item, index) => (
                            <Draggable
                              key={`item-${index}`}
                              draggableId={`item-${index}`}
                              index={index}
                              isDragDisabled={Boolean(isItemFormOpen)}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="rounded-md border p-3 mb-2"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="mt-1 cursor-move text-muted-foreground">
                                      <GripVertical className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <h5 className="font-medium">{item.title}</h5>
                                          <p className="text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Badge
                                            variant="outline"
                                            className={
                                              item.criticality === CriticalityLevel.CRITIQUE
                                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                                : item.criticality === CriticalityLevel.MAJEUR
                                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                                                  : item.criticality === CriticalityLevel.MINEUR
                                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                            }
                                          >
                                            {getCriticalityLabel(item.criticality)}
                                          </Badge>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openItemForm(index)}
                                            className="h-7 w-7"
                                          >
                                            <Edit className="h-3.5 w-3.5" />
                                            <span className="sr-only">Modifier</span>
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeItem(index)}
                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            <span className="sr-only">Supprimer</span>
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="mt-2 text-xs">
                                        <span className="font-medium">Catégorie:</span>{" "}
                                        {getAuditCategoryLabel(item.category)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </>
                      ) : (
                        <div className="flex h-24 w-full items-center justify-center text-center">
                          <div>
                            <p className="text-sm font-medium">Aucun élément d'audit</p>
                            <p className="text-xs text-muted-foreground">
                              Ajoutez des éléments à vérifier lors de l'audit.
                            </p>
                          </div>
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </DragDropContext>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex items-center gap-1.5">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              {mode === "create" ? "Créer le modèle" : "Enregistrer les modifications"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={isItemFormOpen} onOpenChange={setIsItemFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentItemIndex !== null ? "Modifier l'élément d'audit" : "Ajouter un élément d'audit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-title">
                Titre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="item-title"
                value={itemFormData.title}
                onChange={(e) => handleItemInputChange("title", e.target.value)}
                placeholder="Titre de l'élément"
                className={validationErrors.itemTitle ? "border-red-500" : ""}
              />
              {validationErrors.itemTitle && <p className="text-xs text-red-500">{validationErrors.itemTitle}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={itemFormData.description}
                onChange={(e) => handleItemInputChange("description", e.target.value)}
                placeholder="Description détaillée de l'élément à vérifier"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item-category">Catégorie</Label>
                <Select
                  value={itemFormData.category}
                  onValueChange={(value) => handleItemInputChange("category", value)}
                >
                  <SelectTrigger id="item-category">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {enumsData?.auditCategoryTypes?.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {getAuditCategoryLabel(category as AuditCategoryType)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-criticality">Niveau de criticité</Label>
                <Select
                  value={itemFormData.criticality}
                  onValueChange={(value) => handleItemInputChange("criticality", value)}
                >
                  <SelectTrigger id="item-criticality">
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {enumsData?.criticalityLevels?.map((level: string) => (
                      <SelectItem key={level} value={level}>
                        {getCriticalityLabel(level as CriticalityLevel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-inspection-method">Méthode d'inspection</Label>
              <Input
                id="item-inspection-method"
                value={itemFormData.inspection_method}
                onChange={(e) => handleItemInputChange("inspection_method", e.target.value)}
                placeholder="Comment inspecter cet élément"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-expected-result">Résultat attendu</Label>
              <Input
                id="item-expected-result"
                value={itemFormData.expected_result}
                onChange={(e) => handleItemInputChange("expected_result", e.target.value)}
                placeholder="Résultat attendu de l'inspection"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-reference">Documentation de référence</Label>
              <Input
                id="item-reference"
                value={itemFormData.reference_documentation}
                onChange={(e) => handleItemInputChange("reference_documentation", e.target.value)}
                placeholder="Référence à la documentation technique"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="item-photo"
                checked={itemFormData.requires_photo_evidence}
                onCheckedChange={(checked) => handleItemInputChange("requires_photo_evidence", checked)}
              />
              <Label htmlFor="item-photo">Nécessite une preuve photographique</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="item-mandatory"
                checked={itemFormData.is_mandatory}
                onCheckedChange={(checked) => handleItemInputChange("is_mandatory", checked)}
              />
              <Label htmlFor="item-mandatory">Élément obligatoire</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsItemFormOpen(false)}>
              Annuler
            </Button>
            <Button type="button" onClick={saveItem}>
              {currentItemIndex !== null ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
