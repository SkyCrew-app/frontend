"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Loader2 } from "lucide-react"
import {
  GET_AIRCRAFT_FOR_AUDIT,
  GET_USERS_FOR_AUDIT,
  GET_AUDIT_ENUMS,
  GET_AUDIT_TEMPLATE_BY_ID,
  CREATE_AUDIT,
} from "@/graphql/audit"
import { AuditResultType, AuditFrequencyType } from "@/interfaces/audit"
import { calculateNextAuditDate, cn } from "@/lib/utils"
import { auditCategoryLabel, auditCriticality, auditFrequencyLabel, auditResult } from "@/lib/audit"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [selectedAircraftType, setSelectedAircraftType] = useState<string | null>(null)

  const { data: aircraftData } = useQuery(GET_AIRCRAFT_FOR_AUDIT)
  const { data: userData } = useQuery(GET_USERS_FOR_AUDIT)
  const { data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  const { data: templateData } = useQuery(GET_AUDIT_TEMPLATE_BY_ID, {
    variables: {
      id: Number.parseInt(formData.templateId),
    },
    skip: !formData.templateId,
  })

  const [createAudit, { loading: createLoading }] = useMutation(CREATE_AUDIT, {
    onCompleted: () => {
      toast({ title: "Audit créé" })
      resetForm()
      onSuccess()
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Création impossible",
        description: "L'audit n'a pas pu être créé. Vérifiez les informations puis réessayez.",
      })
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

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.aircraftId) {
      errors.aircraftId = "Choisissez l'aéronef audité."
    }

    if (!formData.auditorId) {
      errors.auditorId = "Choisissez l'auditeur."
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

  const selectedTemplate = formData.templateId ? templateData?.auditTemplate : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !createLoading && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un audit</DialogTitle>
          <DialogDescription>Enregistrez l'audit de sécurité d'un aéronef, avec ou sans modèle.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Audit</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aircraft">
                  Aéronef <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.aircraftId} onValueChange={(value) => handleInputChange("aircraftId", value)}>
                  <SelectTrigger
                    id="aircraft"
                    aria-invalid={Boolean(validationErrors.aircraftId)}
                    className={cn(validationErrors.aircraftId && "border-destructive")}
                  >
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
                {validationErrors.aircraftId && (
                  <p className="text-sm text-destructive">{validationErrors.aircraftId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditor">
                  Auditeur <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.auditorId} onValueChange={(value) => handleInputChange("auditorId", value)}>
                  <SelectTrigger
                    id="auditor"
                    aria-invalid={Boolean(validationErrors.auditorId)}
                    className={cn(validationErrors.auditorId && "border-destructive")}
                  >
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
                {validationErrors.auditorId && <p className="text-sm text-destructive">{validationErrors.auditorId}</p>}
              </div>

              <div className="space-y-2" role="group" aria-labelledby="audit-date-label">
                <Label id="audit-date-label">
                  Date de l'audit <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  date={formData.auditDate}
                  onSelect={(date) => date && handleInputChange("auditDate", date)}
                  placeholder="Sélectionner une date"
                  clearable={false}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="audit-result">
                  Résultat <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.auditResult} onValueChange={(value) => handleInputChange("auditResult", value)}>
                  <SelectTrigger id="audit-result">
                    <SelectValue placeholder="Sélectionner un résultat" />
                  </SelectTrigger>
                  <SelectContent>
                    {enumsData?.auditResultTypes?.map((result: string) => (
                      <SelectItem key={result} value={result}>
                        {auditResult(result).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Modèle d'audit</legend>
            {selectedTemplate ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{selectedTemplate.name}</p>
                    {selectedTemplate.description && (
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsTemplateDialogOpen(true)}>
                      Changer
                    </Button>
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
                    >
                      Retirer
                    </Button>
                  </div>
                </div>

                {formData.auditItems.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {formData.auditItems.length === 1
                        ? "1 élément à vérifier sera créé avec l'audit."
                        : `${formData.auditItems.length} éléments à vérifier seront créés avec l'audit.`}{" "}
                      Vous renseignerez leur résultat en modifiant l'audit.
                    </p>
                    <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
                      {formData.auditItems.map((item, index) => (
                        <li key={index} className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{auditCategoryLabel(item.category)}</p>
                          </div>
                          {item.criticality && (
                            <Badge variant={auditCriticality(item.criticality).variant} className="shrink-0">
                              {auditCriticality(item.criticality).label}
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Ce modèle ne contient aucun élément à vérifier.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Facultatif : un modèle ajoute à l'audit la liste des éléments à vérifier.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setIsTemplateDialogOpen(true)}
                >
                  Choisir un modèle
                </Button>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Planification</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="audit-frequency">
                  Fréquence <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.auditFrequency}
                  onValueChange={(value) => handleInputChange("auditFrequency", value)}
                >
                  <SelectTrigger id="audit-frequency">
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

              <div className="space-y-2" role="group" aria-labelledby="next-audit-date-label">
                <Label id="next-audit-date-label">Prochain audit</Label>
                <DatePicker
                  date={formData.nextAuditDate || undefined}
                  onSelect={(date) => handleInputChange("nextAuditDate", date)}
                  placeholder="Non planifié"
                  clearable
                />
                <p className="text-xs text-muted-foreground">
                  Calculé à partir de la date et de la fréquence ; vous pouvez le modifier.
                </p>
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="sr-only">Notes</legend>
            <Label htmlFor="audit-notes">Notes</Label>
            <Textarea
              id="audit-notes"
              placeholder="Ex. : audit réalisé après la visite des 100 heures"
              value={formData.auditNotes}
              onChange={(e) => handleInputChange("auditNotes", e.target.value)}
              rows={3}
            />
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={createLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={createLoading}>
              {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
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
