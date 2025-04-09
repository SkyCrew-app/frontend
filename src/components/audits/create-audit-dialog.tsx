"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Loader2, Plus, FileText } from "lucide-react"
import {
  GET_AIRCRAFT_FOR_AUDIT,
  GET_USERS_FOR_AUDIT,
  GET_AUDIT_ENUMS,
  GET_AUDIT_TEMPLATE_BY_ID,
  CREATE_AUDIT,
} from "@/graphql/audit"
import { AuditResultType, AuditFrequencyType, AuditCategoryType } from "@/interfaces/audit"
import { calculateNextAuditDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TemplateSelector } from "@/components/audits/template-selector"
import { useToast } from "@/components/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"

interface CreateAuditDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateAuditDialog({ isOpen, onClose, onSuccess }: CreateAuditDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    aircraftId: "",
    auditorId: "",
    auditDate: new Date(),
    auditResult: AuditResultType.CONFORME,
    auditNotes: "",
    auditFrequency: AuditFrequencyType.ANNUEL,
    nextAuditDate: null as Date | null,
    templateId: "",
    auditItems: [] as any[],
  })
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [selectedAircraftType, setSelectedAircraftType] = useState<string | null>(null)

  const { data: aircraftData } = useQuery(GET_AIRCRAFT_FOR_AUDIT)
  const { data: userData } = useQuery(GET_USERS_FOR_AUDIT)
  const { data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  const { data: templateData, loading: templateLoading } = useQuery(GET_AUDIT_TEMPLATE_BY_ID, {
    variables: {
      id: Number.parseInt(formData.templateId),
    },
    skip: !formData.templateId,
  })

  const [createAudit, { loading: createLoading }] = useMutation(CREATE_AUDIT, {
    onCompleted: () => {
      toast({ variant: "default", description: "Audit créé avec succès" })
      resetForm()
      onSuccess()
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Erreur lors de la création: ${error.message}` })
    },
  })

  useEffect(() => {
    if (isOpen) {
      resetForm()
    }
  }, [isOpen])

  useEffect(() => {
    if (templateData?.auditTemplate) {
      setFormData((prev) => ({
        ...prev,
        auditFrequency: templateData.auditTemplate.recommended_frequency,
        auditItems: templateData.auditTemplate.items.map((item: any) => ({
          category: item.category,
          description: item.title,
          notes: item.description,
          result: AuditResultType.CONFORME,
          requires_action: false,
          criticality: item.criticality,
          inspection_method: item.inspection_method,
          expected_result: item.expected_result,
          reference_documentation: item.reference_documentation,
          requires_photo_evidence: item.requires_photo_evidence,
          is_mandatory: item.is_mandatory,
        })),
      }))

      setFormData((prev) => {
        if (prev.auditDate) {
          const nextDate = calculateNextAuditDate(prev.auditDate, templateData.auditTemplate.recommended_frequency)
          if (nextDate) {
            return {
              ...prev,
              nextAuditDate: nextDate,
            }
          }
        }
        return prev
      })
    }
  }, [templateData])

  useEffect(() => {
    if (formData.aircraftId && aircraftData?.getAircrafts) {
      const selectedAircraft = aircraftData.getAircrafts.find(
        (aircraft: any) => aircraft.id.toString() === formData.aircraftId,
      )
      if (selectedAircraft) {
        setSelectedAircraftType(selectedAircraft.model)
      }
    } else {
      setSelectedAircraftType(null)
    }
  }, [formData.aircraftId, aircraftData])

  const resetForm = () => {
    setFormData({
      aircraftId: "",
      auditorId: "",
      auditDate: new Date(),
      auditResult: AuditResultType.CONFORME,
      auditNotes: "",
      auditFrequency: AuditFrequencyType.ANNUEL,
      nextAuditDate: null,
      templateId: "",
      auditItems: [],
    })
    setValidationErrors({})
    setActiveTab("details")
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

    if (field === "auditFrequency" || field === "auditDate") {
      const date = field === "auditDate" ? value : formData.auditDate
      const frequency = field === "auditFrequency" ? value : formData.auditFrequency

      if (date) {
        const nextDate = calculateNextAuditDate(date, frequency)
        if (nextDate) {
          setFormData((prev) => ({
            ...prev,
            nextAuditDate: nextDate,
          }))
        }
      }
    }
  }

  const handleSelectTemplate = (template: any) => {
    setFormData((prev) => ({
      ...prev,
      templateId: template.id.toString(),
    }))
  }

  const handleAuditItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.auditItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    }
    setFormData((prev) => ({
      ...prev,
      auditItems: updatedItems,
    }))
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.aircraftId) {
      errors.aircraftId = "L'aéronef est requis"
    }

    if (!formData.auditorId) {
      errors.auditorId = "L'auditeur est requis"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const createAuditInput = {
      aircraftId: Number.parseInt(formData.aircraftId),
      auditorId: Number.parseInt(formData.auditorId),
      audit_date: formData.auditDate.toISOString(),
      audit_result: formData.auditResult,
      audit_notes: formData.auditNotes,
      audit_frequency: formData.auditFrequency,
      next_audit_date: formData.nextAuditDate?.toISOString(),
      templateId: formData.templateId ? Number.parseInt(formData.templateId) : undefined,
    }

    createAudit({
      variables: {
        createAuditInput,
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Créer un nouvel audit</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="details" className="text-xs sm:text-sm">
                Détails de l'audit
              </TabsTrigger>
              <TabsTrigger value="items" className="text-xs sm:text-sm">
                Éléments à vérifier ({formData.auditItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 sm:space-y-6">
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="aircraft">
                    Aéronef <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.aircraftId}
                    onValueChange={(value) => handleInputChange("aircraftId", value)}
                    required
                  >
                    <SelectTrigger id="aircraft" className={validationErrors.aircraftId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Sélectionner un aéronef" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aircraftData?.getAircrafts ?? []).map((aircraft: any) => (
                        <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                          {aircraft.registration_number} ({aircraft.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.aircraftId && <p className="text-xs text-red-500">{validationErrors.aircraftId}</p>}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="auditor">
                    Auditeur <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.auditorId}
                    onValueChange={(value) => handleInputChange("auditorId", value)}
                    required
                  >
                    <SelectTrigger id="auditor" className={validationErrors.auditorId ? "border-red-500" : ""}>
                      <SelectValue placeholder="Sélectionner un auditeur" />
                    </SelectTrigger>
                    <SelectContent>
                      {userData?.getUsers?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.auditorId && <p className="text-xs text-red-500">{validationErrors.auditorId}</p>}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="audit-date">
                    Date d'audit <span className="text-red-500">*</span>
                  </Label>
                  <DatePicker
                    date={formData.auditDate}
                    onSelect={(date) => date && handleInputChange("auditDate", date)}
                    placeholder="Sélectionner une date"
                    clearable={false}
                  />
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="audit-result">
                    Résultat d'audit <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.auditResult}
                    onValueChange={(value) => handleInputChange("auditResult", value)}
                    required
                  >
                    <SelectTrigger id="audit-result">
                      <SelectValue placeholder="Sélectionner un résultat" />
                    </SelectTrigger>
                    <SelectContent>
                      {enumsData?.auditResultTypes?.map((result: string) => (
                        <SelectItem key={result} value={result}>
                          {result === AuditResultType.CONFORME && "Conforme"}
                          {result === AuditResultType.NON_CONFORME && "Non conforme"}
                          {result === AuditResultType.CONFORME_AVEC_REMARQUES && "Conforme avec remarques"}
                          {result === AuditResultType.NON_APPLICABLE && "Non applicable"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="audit-frequency">
                    Fréquence d'audit <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.auditFrequency}
                    onValueChange={(value) => handleInputChange("auditFrequency", value)}
                    required
                  >
                    <SelectTrigger id="audit-frequency">
                      <SelectValue placeholder="Sélectionner une fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      {enumsData?.auditFrequencyTypes?.map((frequency: string) => (
                        <SelectItem key={frequency} value={frequency}>
                          {frequency === AuditFrequencyType.QUOTIDIEN && "Quotidien"}
                          {frequency === AuditFrequencyType.HEBDOMADAIRE && "Hebdomadaire"}
                          {frequency === AuditFrequencyType.MENSUEL && "Mensuel"}
                          {frequency === AuditFrequencyType.TRIMESTRIEL && "Trimestriel"}
                          {frequency === AuditFrequencyType.SEMESTRIEL && "Semestriel"}
                          {frequency === AuditFrequencyType.ANNUEL && "Annuel"}
                          {frequency === AuditFrequencyType.BIANNUEL && "Biannuel"}
                          {frequency === AuditFrequencyType.HEURES_DE_VOL && "Heures de vol"}
                          {frequency === AuditFrequencyType.APRES_INCIDENT && "Après incident"}
                          {frequency === AuditFrequencyType.AUTRE && "Autre"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="next-audit-date">Date du prochain audit</Label>
                  <DatePicker
                    date={formData.nextAuditDate || undefined}
                    onSelect={(date) => handleInputChange("nextAuditDate", date)}
                    placeholder="Sélectionner une date"
                    clearable
                  />
                </div>
              </div>

              <div className="space-y-1 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="template">Modèle d'audit (optionnel)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTemplateDialogOpen(true)}
                    className="flex items-center gap-1.5 h-8 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Parcourir les modèles
                  </Button>
                </div>
                {formData.templateId && templateData?.auditTemplate ? (
                  <div className="rounded-md border p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-medium">{templateData.auditTemplate.name}</h4>
                        <p className="text-xs text-muted-foreground">{templateData.auditTemplate.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {templateData.auditTemplate.items?.length || 0} élément
                            {templateData.auditTemplate.items?.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            templateId: "",
                            auditItems: [],
                          }))
                        }}
                        className="h-7 text-xs"
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed p-4 text-center">
                    <div>
                      <p className="text-sm font-medium">Aucun modèle sélectionné</p>
                      <p className="text-xs text-muted-foreground">
                        Sélectionnez un modèle pour préremplir les éléments d'audit.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="audit-notes">Notes d'audit</Label>
                <Textarea
                  id="audit-notes"
                  placeholder="Saisissez vos notes d'audit ici..."
                  value={formData.auditNotes}
                  onChange={(e) => handleInputChange("auditNotes", e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 sm:space-y-6">
              {formData.auditItems.length > 0 ? (
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    {formData.auditItems.map((item, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{item.description}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label htmlFor={`item-${index}-category`}>Catégorie</Label>
                              <Select
                                value={item.category}
                                onValueChange={(value) => handleAuditItemChange(index, "category", value)}
                              >
                                <SelectTrigger id={`item-${index}-category`}>
                                  <SelectValue placeholder="Sélectionner une catégorie" />
                                </SelectTrigger>
                                <SelectContent>
                                  {enumsData?.auditCategoryTypes?.map((category: string) => (
                                    <SelectItem key={category} value={category}>
                                      {category === AuditCategoryType.CELLULE && "Cellule"}
                                      {category === AuditCategoryType.MOTEUR && "Moteur"}
                                      {category === AuditCategoryType.AVIONIQUE && "Avionique"}
                                      {category === AuditCategoryType.TRAIN_ATTERRISSAGE && "Train d'atterrissage"}
                                      {category === AuditCategoryType.SYSTEME_CARBURANT && "Système carburant"}
                                      {category === AuditCategoryType.SYSTEME_ELECTRIQUE && "Système électrique"}
                                      {category === AuditCategoryType.DOCUMENTATION && "Documentation"}
                                      {category === AuditCategoryType.EQUIPEMENT_SECURITE && "Équipement de sécurité"}
                                      {category === AuditCategoryType.AUTRE && "Autre"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor={`item-${index}-result`}>Résultat</Label>
                              <Select
                                value={item.result}
                                onValueChange={(value) => handleAuditItemChange(index, "result", value)}
                              >
                                <SelectTrigger id={`item-${index}-result`}>
                                  <SelectValue placeholder="Sélectionner un résultat" />
                                </SelectTrigger>
                                <SelectContent>
                                  {enumsData?.auditResultTypes?.map((result: string) => (
                                    <SelectItem key={result} value={result}>
                                      {result === AuditResultType.CONFORME && "Conforme"}
                                      {result === AuditResultType.NON_CONFORME && "Non conforme"}
                                      {result === AuditResultType.CONFORME_AVEC_REMARQUES && "Conforme avec remarques"}
                                      {result === AuditResultType.NON_APPLICABLE && "Non applicable"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor={`item-${index}-notes`}>Notes</Label>
                            <Textarea
                              id={`item-${index}-notes`}
                              placeholder="Notes sur cet élément d'audit..."
                              value={item.notes || ""}
                              onChange={(e) => handleAuditItemChange(index, "notes", e.target.value)}
                              rows={2}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex h-48 w-full items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Aucun élément d'audit</p>
                    <p className="text-sm text-muted-foreground">
                      Sélectionnez un modèle d'audit pour ajouter des éléments à vérifier.
                    </p>
                    <Button type="button" onClick={() => setIsTemplateDialogOpen(true)} className="mt-2">
                      Sélectionner un modèle
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                <p className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>
                    Les éléments d'audit seront automatiquement créés à partir du modèle sélectionné. Les modifications
                    effectuées ici sont uniquement à titre d'aperçu.
                  </span>
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 sm:mt-6 flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createLoading} className="flex items-center gap-1.5">
              {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              Créer l'audit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <TemplateSelector
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        aircraftType={selectedAircraftType || undefined}
        key={`template-selector-${selectedAircraftType || "all"}`}
      />
    </Dialog>
  )
}
