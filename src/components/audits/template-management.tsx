"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import {
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
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
import { cn } from "@/lib/utils"
import { auditCategoryLabel, auditCriticality, auditFrequencyLabel, toAuditTemplateItemInput } from "@/lib/audit"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SidePanel } from "@/components/layout/SidePanel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
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
  const userId: string | null = userData?.id ?? null

  const { loading, error, data, refetch } = useQuery(GET_AUDIT_TEMPLATE)
  const { data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  const [createTemplate, { loading: createLoading }] = useMutation(CREATE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ title: "Modèle créé" })
      refetch()
      setIsCreateDialogOpen(false)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Création impossible",
        description: "Le modèle n'a pas pu être créé. Vérifiez les informations puis réessayez.",
      })
    },
  })

  const [updateTemplate, { loading: updateLoading }] = useMutation(UPDATE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ title: "Modèle mis à jour" })
      refetch()
      setIsEditDialogOpen(false)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "Le modèle n'a pas pu être mis à jour. Réessayez dans un instant.",
      })
    },
  })

  const [deleteTemplate, { loading: deleteLoading }] = useMutation(DELETE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ title: "Modèle supprimé" })
      refetch()
      setIsDeleteDialogOpen(false)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "Le modèle n'a pas pu être supprimé. Réessayez dans un instant.",
      })
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

  const newTemplateButton = (
    <Button onClick={handleCreateTemplate}>
      <Plus className="h-4 w-4" />
      Nouveau modèle
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modèles d'audit</h2>
          <p className="text-sm text-muted-foreground">
            Un modèle fournit la liste des éléments à vérifier lors d'un audit.
          </p>
        </div>
        {newTemplateButton}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aucun modèle d'audit"
          description="Créez un premier modèle pour préparer la liste des éléments à vérifier."
          action={newTemplateButton}
        />
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => {
            const itemCount = template.items?.length || 0
            const expanded = expandedTemplate === template.id
            return (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.description && <CardDescription>{template.description}</CardDescription>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={template.is_active ? "success" : "neutral"}>
                        {template.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label={`Actions pour le modèle ${template.name}`}
                            title="Actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onSelect={() => handleEditTemplate(template)}>
                            <Pencil className="h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onSelect={() => handleDuplicateTemplate(template)}>
                            <Copy className="h-4 w-4" />
                            Dupliquer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onSelect={() => handleDeleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Fréquence recommandée</dt>
                      <dd className="text-sm font-medium">{auditFrequencyLabel(template.recommended_frequency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Types d'aéronefs</dt>
                      <dd className="text-sm font-medium">
                        {template.applicable_aircraft_types?.join(", ") || "Tous"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-3 border-t py-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-between"
                    aria-expanded={expanded}
                    onClick={() => toggleTemplateExpand(template.id)}
                  >
                    <span>
                      {itemCount} élément{itemCount !== 1 ? "s" : ""} à vérifier
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  {expanded &&
                    (itemCount > 0 ? (
                      <ul className="divide-y rounded-lg border">
                        {template.items.map((item: any) => (
                          <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{item.title}</p>
                              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                              <p className="mt-1 text-xs text-muted-foreground">{auditCategoryLabel(item.category)}</p>
                            </div>
                            <Badge variant={auditCriticality(item.criticality).variant} className="shrink-0">
                              {auditCriticality(item.criticality).label}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-4 text-sm text-muted-foreground">Aucun élément dans ce modèle.</p>
                    ))}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <TemplateFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        template={selectedTemplate}
        enumsData={enumsData}
        onSubmit={(templateData) => {
          if (!userId) {
            toast({
              variant: "destructive",
              description: "Utilisateur non identifié, veuillez réessayer dans un instant.",
            })
            return
          }
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
        isLoading={createLoading || !userId}
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

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => !open && !deleteLoading && setIsDeleteDialogOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le modèle « {selectedTemplate?.name} » et ses éléments seront définitivement supprimés. Les audits déjà
              réalisés ne sont pas modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              // Keep the dialog open until the mutation answers.
              onClick={(e) => {
                e.preventDefault()
                confirmDeleteTemplate()
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
    setNewAircraftType("")
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

    if (field === "title") {
      clearItemTitleError()
    }
  }

  const clearItemTitleError = () => {
    setValidationErrors((prev) => {
      if (!prev.itemTitle) return prev
      const next = { ...prev }
      delete next.itemTitle
      return next
    })
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
    clearItemTitleError()
    setIsItemFormOpen(true)
  }

  const validateItemTitle = () => {
    if (!itemFormData.title.trim()) {
      setValidationErrors((prev) => ({ ...prev, itemTitle: "Indiquez le titre de l'élément." }))
      return false
    }
    return true
  }

  const saveItem = () => {
    if (!validateItemTitle()) return

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

  const handleDragEnd = (result: any) => {
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

  // Checked when leaving the first step, where the field is.
  const validateName = () => {
    if (!formData.name.trim()) {
      setValidationErrors((prev) => ({ ...prev, name: "Indiquez le nom du modèle." }))
      return false
    }
    return true
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = "Indiquez le nom du modèle."
    }

    if (formData.items.length === 0) {
      errors.items = "Ajoutez au moins un élément à vérifier."
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    const submissionData = {
      ...formData,
      items: formData.items.map(toAuditTemplateItemInput),
    }

    onSubmit(submissionData)
  }

  const generalStep = (
    <>
      <fieldset className="space-y-4">
        <legend className="sr-only">Informations générales</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-template-name`}>
              Nom du modèle <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${mode}-template-name`}
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Ex. : Visite annuelle DR400"
              aria-invalid={Boolean(validationErrors.name)}
              className={cn(validationErrors.name && "border-destructive")}
            />
            {validationErrors.name && <p className="text-sm text-destructive">{validationErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-template-frequency`}>
              Fréquence recommandée <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.recommended_frequency}
              onValueChange={(value) => handleInputChange("recommended_frequency", value)}
            >
              <SelectTrigger id={`${mode}-template-frequency`}>
                <SelectValue placeholder="Sélectionner une fréquence" />
              </SelectTrigger>
              <SelectContent>
                {enumsData?.auditFrequencyTypes?.map((frequency: string) => (
                  <SelectItem key={frequency} value={frequency}>
                    {auditFrequencyLabel(frequency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-template-description`}>Description</Label>
          <Textarea
            id={`${mode}-template-description`}
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Ex. : contrôle complet de la cellule et du moteur avant la saison"
            rows={2}
          />
        </div>

        {/* CreateAuditTemplateInput has no is_active: a new template is always active. */}
        {mode === "edit" && (
          <div className="flex items-start gap-3">
            <Switch
              id="edit-template-active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange("is_active", checked)}
            />
            <div>
              <Label htmlFor="edit-template-active">Modèle actif</Label>
              <p className="text-xs text-muted-foreground">
                Un modèle inactif n'est plus proposé à la création d'un audit.
              </p>
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Aéronefs concernés</legend>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-template-aircraft-type`}>Type d'aéronef</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`${mode}-template-aircraft-type`}
              value={newAircraftType}
              onChange={(e) => setNewAircraftType(e.target.value)}
              placeholder="Ex. : DR400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addAircraftType()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addAircraftType}
              disabled={!newAircraftType.trim()}
              className="shrink-0"
            >
              Ajouter
            </Button>
          </div>
        </div>
        {formData.applicable_aircraft_types.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun type précisé : le modèle vaut pour tous les aéronefs.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {formData.applicable_aircraft_types.map((type) => (
              <Badge key={type} variant="neutral" className="gap-1 py-1 pr-1">
                {type}
                <button
                  type="button"
                  onClick={() => removeAircraftType(type)}
                  aria-label={`Retirer ${type}`}
                  title={`Retirer ${type}`}
                  className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </fieldset>
    </>
  )

  const itemsStep = (
    <fieldset className="space-y-3">
      <legend className="sr-only">Éléments à vérifier</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold" aria-hidden="true">
            Éléments à vérifier <span className="text-destructive">*</span>
          </p>
          {formData.items.length > 1 && (
            <p className="text-xs text-muted-foreground">Faites glisser la poignée pour changer l'ordre.</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => openItemForm()}>
          <Plus className="h-4 w-4" />
          Ajouter un élément
        </Button>
      </div>

      {validationErrors.items && <p className="text-sm text-destructive">{validationErrors.items}</p>}

      {formData.items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Aucun élément pour le moment. Ajoutez les points à contrôler pendant l'audit.
        </p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable
            droppableId="audit-items"
            isDropDisabled={Boolean(isItemFormOpen)}
            isCombineEnabled={false}
            ignoreContainerClipping={false}
          >
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
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
                        className="mb-2 flex items-start gap-2 rounded-lg border bg-card p-3"
                      >
                        <div
                          {...provided.dragHandleProps}
                          aria-label={`Déplacer ${item.title}`}
                          title="Déplacer"
                          className="mt-0.5 cursor-grab rounded-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Badge variant={auditCriticality(item.criticality).variant}>
                              {auditCriticality(item.criticality).label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {auditCategoryLabel(item.category)}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openItemForm(index)}
                            className="h-9 w-9"
                            aria-label={`Modifier ${item.title}`}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Retirer ${item.title}`}
                            title="Retirer du modèle"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </fieldset>
  )

  const itemMainStep = (
    <fieldset className="space-y-4">
      <legend className="sr-only">Élément</legend>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-item-title`}>
          Titre <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${mode}-item-title`}
          value={itemFormData.title}
          onChange={(e) => handleItemInputChange("title", e.target.value)}
          placeholder="Ex. : Niveau d'huile moteur"
          aria-invalid={Boolean(validationErrors.itemTitle)}
          className={cn(validationErrors.itemTitle && "border-destructive")}
        />
        {validationErrors.itemTitle && (
          <p className="text-sm text-destructive">{validationErrors.itemTitle}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-item-description`}>Description</Label>
        <Textarea
          id={`${mode}-item-description`}
          value={itemFormData.description}
          onChange={(e) => handleItemInputChange("description", e.target.value)}
          placeholder="Ex. : vérifier le niveau à la jauge, moteur froid"
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-category`}>Catégorie</Label>
          <Select
            value={itemFormData.category}
            onValueChange={(value) => handleItemInputChange("category", value)}
          >
            <SelectTrigger id={`${mode}-item-category`}>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {enumsData?.auditCategoryTypes?.map((category: string) => (
                <SelectItem key={category} value={category}>
                  {auditCategoryLabel(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-criticality`}>Criticité</Label>
          <Select
            value={itemFormData.criticality}
            onValueChange={(value) => handleItemInputChange("criticality", value)}
          >
            <SelectTrigger id={`${mode}-item-criticality`}>
              <SelectValue placeholder="Sélectionner un niveau" />
            </SelectTrigger>
            <SelectContent>
              {enumsData?.criticalityLevels?.map((level: string) => (
                <SelectItem key={level} value={level}>
                  {auditCriticality(level).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </fieldset>
  )

  const itemInspectionStep = (
    <>
      <fieldset className="space-y-4">
        <legend className="sr-only">Inspection</legend>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-inspection-method`}>Méthode d'inspection</Label>
          <Input
            id={`${mode}-item-inspection-method`}
            value={itemFormData.inspection_method}
            onChange={(e) => handleItemInputChange("inspection_method", e.target.value)}
            placeholder="Ex. : contrôle visuel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-expected-result`}>Résultat attendu</Label>
          <Input
            id={`${mode}-item-expected-result`}
            value={itemFormData.expected_result}
            onChange={(e) => handleItemInputChange("expected_result", e.target.value)}
            placeholder="Ex. : niveau entre mini et maxi"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-reference`}>Documentation de référence</Label>
          <Input
            id={`${mode}-item-reference`}
            value={itemFormData.reference_documentation}
            onChange={(e) => handleItemInputChange("reference_documentation", e.target.value)}
            placeholder="Ex. : manuel de maintenance, chapitre 12"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Options</legend>
        <div className="flex items-center gap-3">
          <Switch
            id={`${mode}-item-mandatory`}
            checked={itemFormData.is_mandatory}
            onCheckedChange={(checked) => handleItemInputChange("is_mandatory", checked)}
          />
          <Label htmlFor={`${mode}-item-mandatory`} className="font-normal">
            Élément obligatoire
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id={`${mode}-item-photo`}
            checked={itemFormData.requires_photo_evidence}
            onCheckedChange={(checked) => handleItemInputChange("requires_photo_evidence", checked)}
          />
          <Label htmlFor={`${mode}-item-photo`} className="font-normal">
            Photo à joindre comme preuve
          </Label>
        </div>
      </fieldset>
    </>
  )

  return (
    <>
      <SidePanel
        open={isOpen}
        onOpenChange={(open) => !open && onClose()}
        title={mode === "create" ? "Créer un modèle d'audit" : "Modifier le modèle d'audit"}
        description="Décrivez le modèle puis listez les éléments à vérifier, dans l'ordre de l'inspection."
        onSubmit={handleSubmit}
        submitLabel={mode === "create" ? "Créer le modèle" : "Enregistrer"}
        submitting={isLoading}
        steps={[
          { title: "Informations générales", content: generalStep, validate: validateName },
          { title: "Éléments à vérifier", content: itemsStep },
        ]}
      />

      {/* A sibling of the template panel, so its form is never nested in the other one. */}
      <SidePanel
        open={isItemFormOpen}
        onOpenChange={setIsItemFormOpen}
        title={currentItemIndex !== null ? "Modifier l'élément" : "Ajouter un élément"}
        description="Un point à contrôler pendant l'audit."
        onSubmit={saveItem}
        submitLabel={currentItemIndex !== null ? "Enregistrer l'élément" : "Ajouter l'élément"}
        size="md"
        steps={[
          { title: "Élément", content: itemMainStep, validate: validateItemTitle },
          { title: "Inspection", content: itemInspectionStep },
        ]}
      />
    </>
  )
}
