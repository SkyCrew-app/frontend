"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("administration")
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
      toast({ title: t("audits.templates.toast.created") })
      refetch()
      setIsCreateDialogOpen(false)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("audits.templates.toast.createFailed.title"),
        description: t("audits.templates.toast.createFailed.description"),
      })
    },
  })

  const [updateTemplate, { loading: updateLoading }] = useMutation(UPDATE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ title: t("audits.templates.toast.updated") })
      refetch()
      setIsEditDialogOpen(false)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("audits.templates.toast.updateFailed.title"),
        description: t("audits.templates.toast.updateFailed.description"),
      })
    },
  })

  const [deleteTemplate, { loading: deleteLoading }] = useMutation(DELETE_AUDIT_TEMPLATE, {
    onCompleted: () => {
      toast({ title: t("audits.templates.toast.deleted") })
      refetch()
      setIsDeleteDialogOpen(false)
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("audits.templates.toast.deleteFailed.title"),
        description: t("audits.templates.toast.deleteFailed.description"),
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
      name: t("audits.templates.copyName", { name: template.name }),
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
      {t("audits.templates.new")}
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("audits.tabs.templates")}</h2>
          <p className="text-sm text-muted-foreground">{t("audits.templates.intro")}</p>
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
          title={t("audits.templates.empty.title")}
          description={t("audits.templates.empty.description")}
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
                        {template.is_active ? t("audits.templates.active") : t("audits.templates.inactive")}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            aria-label={t("audits.templates.actionsFor", { name: template.name })}
                            title={t("common:labels.actions")}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onSelect={() => handleEditTemplate(template)}>
                            <Pencil className="h-4 w-4" />
                            {t("common:actions.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onSelect={() => handleDuplicateTemplate(template)}>
                            <Copy className="h-4 w-4" />
                            {t("audits.templates.duplicate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onSelect={() => handleDeleteTemplate(template)}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("common:actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("audits.templates.recommendedFrequency")}</dt>
                      <dd className="text-sm font-medium">{auditFrequencyLabel(template.recommended_frequency)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("audits.templates.aircraftTypes")}</dt>
                      <dd className="text-sm font-medium">
                        {template.applicable_aircraft_types?.join(", ") || t("audits.templates.allTypes")}
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
                    <span>{t("audits.templates.itemsToCheck", { count: itemCount })}</span>
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
                      <p className="px-4 text-sm text-muted-foreground">{t("audits.templates.noItems")}</p>
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
              description: t("audits.templates.toast.noUser"),
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
            <AlertDialogTitle>{t("audits.templates.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("audits.templates.deleteConfirm.description", { name: selectedTemplate?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{t("common:actions.cancel")}</AlertDialogCancel>
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
              {t("common:actions.delete")}
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
  const { t } = useTranslation("administration")
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
      formData.applicable_aircraft_types.filter((existing) => existing !== type),
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
      setValidationErrors((prev) => ({ ...prev, itemTitle: t("audits.templates.item.errors.title") }))
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
      setValidationErrors((prev) => ({ ...prev, name: t("audits.templates.form.errors.name") }))
      return false
    }
    return true
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.name.trim()) {
      errors.name = t("audits.templates.form.errors.name")
    }

    if (formData.items.length === 0) {
      errors.items = t("audits.templates.form.errors.items")
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
        <legend className="sr-only">{t("audits.templates.form.steps.general")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-template-name`}>
              {t("audits.templates.form.name")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`${mode}-template-name`}
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder={t("audits.templates.form.namePlaceholder")}
              aria-invalid={Boolean(validationErrors.name)}
              className={cn(validationErrors.name && "border-destructive")}
            />
            {validationErrors.name && <p className="text-sm text-destructive">{validationErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-template-frequency`}>
              {t("audits.templates.recommendedFrequency")} <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.recommended_frequency}
              onValueChange={(value) => handleInputChange("recommended_frequency", value)}
            >
              <SelectTrigger id={`${mode}-template-frequency`}>
                <SelectValue placeholder={t("audits.form.selectFrequency")} />
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
          <Label htmlFor={`${mode}-template-description`}>{t("common:labels.description")}</Label>
          <Textarea
            id={`${mode}-template-description`}
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder={t("audits.templates.form.descriptionPlaceholder")}
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
              <Label htmlFor="edit-template-active">{t("audits.templates.form.active")}</Label>
              <p className="text-xs text-muted-foreground">{t("audits.templates.form.activeHint")}</p>
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t("audits.templates.form.aircraftConcerned")}</legend>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-template-aircraft-type`}>{t("audits.templates.form.aircraftType")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id={`${mode}-template-aircraft-type`}
              value={newAircraftType}
              onChange={(e) => setNewAircraftType(e.target.value)}
              placeholder={t("audits.templates.form.aircraftTypePlaceholder")}
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
              {t("common:actions.add")}
            </Button>
          </div>
        </div>
        {formData.applicable_aircraft_types.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("audits.templates.form.noAircraftType")}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {formData.applicable_aircraft_types.map((type) => (
              <Badge key={type} variant="neutral" className="gap-1 py-1 pr-1">
                {type}
                <button
                  type="button"
                  onClick={() => removeAircraftType(type)}
                  aria-label={t("audits.templates.form.removeNamed", { name: type })}
                  title={t("audits.templates.form.removeNamed", { name: type })}
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
      <legend className="sr-only">{t("audits.templates.form.steps.items")}</legend>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold" aria-hidden="true">
            {t("audits.templates.form.steps.items")} <span className="text-destructive">*</span>
          </p>
          {formData.items.length > 1 && (
            <p className="text-xs text-muted-foreground">{t("audits.templates.form.dragHint")}</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => openItemForm()}>
          <Plus className="h-4 w-4" />
          {t("audits.templates.item.add")}
        </Button>
      </div>

      {validationErrors.items && <p className="text-sm text-destructive">{validationErrors.items}</p>}

      {formData.items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          {t("audits.templates.form.noItems")}
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
                          aria-label={t("audits.templates.form.moveNamed", { name: item.title })}
                          title={t("audits.templates.form.move")}
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
                            aria-label={t("audits.templates.form.editNamed", { name: item.title })}
                            title={t("common:actions.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label={t("audits.templates.form.removeNamed", { name: item.title })}
                            title={t("audits.templates.form.removeFromTemplate")}
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
      <legend className="sr-only">{t("audits.templates.item.steps.item")}</legend>
      <div className="space-y-2">
        <Label htmlFor={`${mode}-item-title`}>
          {t("audits.templates.item.title")} <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${mode}-item-title`}
          value={itemFormData.title}
          onChange={(e) => handleItemInputChange("title", e.target.value)}
          placeholder={t("audits.templates.item.titlePlaceholder")}
          aria-invalid={Boolean(validationErrors.itemTitle)}
          className={cn(validationErrors.itemTitle && "border-destructive")}
        />
        {validationErrors.itemTitle && (
          <p className="text-sm text-destructive">{validationErrors.itemTitle}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${mode}-item-description`}>{t("common:labels.description")}</Label>
        <Textarea
          id={`${mode}-item-description`}
          value={itemFormData.description}
          onChange={(e) => handleItemInputChange("description", e.target.value)}
          placeholder={t("audits.templates.item.descriptionPlaceholder")}
          rows={2}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-category`}>{t("common:labels.category")}</Label>
          <Select
            value={itemFormData.category}
            onValueChange={(value) => handleItemInputChange("category", value)}
          >
            <SelectTrigger id={`${mode}-item-category`}>
              <SelectValue placeholder={t("audits.form.selectCategory")} />
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
          <Label htmlFor={`${mode}-item-criticality`}>{t("audits.templates.item.criticality")}</Label>
          <Select
            value={itemFormData.criticality}
            onValueChange={(value) => handleItemInputChange("criticality", value)}
          >
            <SelectTrigger id={`${mode}-item-criticality`}>
              <SelectValue placeholder={t("audits.templates.item.selectLevel")} />
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
        <legend className="sr-only">{t("audits.templates.item.steps.inspection")}</legend>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-inspection-method`}>{t("audits.templates.item.inspectionMethod")}</Label>
          <Input
            id={`${mode}-item-inspection-method`}
            value={itemFormData.inspection_method}
            onChange={(e) => handleItemInputChange("inspection_method", e.target.value)}
            placeholder={t("audits.templates.item.inspectionMethodPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-expected-result`}>{t("audits.templates.item.expectedResult")}</Label>
          <Input
            id={`${mode}-item-expected-result`}
            value={itemFormData.expected_result}
            onChange={(e) => handleItemInputChange("expected_result", e.target.value)}
            placeholder={t("audits.templates.item.expectedResultPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${mode}-item-reference`}>{t("audits.templates.item.reference")}</Label>
          <Input
            id={`${mode}-item-reference`}
            value={itemFormData.reference_documentation}
            onChange={(e) => handleItemInputChange("reference_documentation", e.target.value)}
            placeholder={t("audits.templates.item.referencePlaceholder")}
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t("audits.templates.item.options")}</legend>
        <div className="flex items-center gap-3">
          <Switch
            id={`${mode}-item-mandatory`}
            checked={itemFormData.is_mandatory}
            onCheckedChange={(checked) => handleItemInputChange("is_mandatory", checked)}
          />
          <Label htmlFor={`${mode}-item-mandatory`} className="font-normal">
            {t("audits.templates.item.mandatory")}
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id={`${mode}-item-photo`}
            checked={itemFormData.requires_photo_evidence}
            onCheckedChange={(checked) => handleItemInputChange("requires_photo_evidence", checked)}
          />
          <Label htmlFor={`${mode}-item-photo`} className="font-normal">
            {t("audits.templates.item.photo")}
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
        title={mode === "create" ? t("audits.templates.form.createTitle") : t("audits.templates.form.editTitle")}
        description={t("audits.templates.form.description")}
        onSubmit={handleSubmit}
        submitLabel={mode === "create" ? t("audits.templates.form.createSubmit") : t("common:actions.save")}
        submitting={isLoading}
        steps={[
          { title: t("audits.templates.form.steps.general"), content: generalStep, validate: validateName },
          { title: t("audits.templates.form.steps.items"), content: itemsStep },
        ]}
      />

      {/* A sibling of the template panel, so its form is never nested in the other one. */}
      <SidePanel
        open={isItemFormOpen}
        onOpenChange={setIsItemFormOpen}
        title={currentItemIndex !== null ? t("audits.templates.item.edit") : t("audits.templates.item.add")}
        description={t("audits.templates.item.description")}
        onSubmit={saveItem}
        submitLabel={currentItemIndex !== null ? t("audits.templates.item.save") : t("audits.templates.item.addSubmit")}
        size="md"
        steps={[
          { title: t("audits.templates.item.steps.item"), content: itemMainStep, validate: validateItemTitle },
          { title: t("audits.templates.item.steps.inspection"), content: itemInspectionStep },
        ]}
      />
    </>
  )
}
