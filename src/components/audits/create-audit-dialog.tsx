"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
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
import { SidePanel } from "@/components/layout/SidePanel"
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

const PREVIEW_ITEM_COUNT = 5

export function CreateAuditDialog({ isOpen, onClose, onSuccess }: CreateAuditDialogProps) {
  const { t } = useTranslation("administration")
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
      toast({ title: t("audits.create.toast.created") })
      resetForm()
      onSuccess()
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: t("audits.create.toast.failed.title"),
        description: t("audits.create.toast.failed.description"),
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
      errors.aircraftId = t("audits.create.errors.aircraft")
    }

    if (!formData.auditorId) {
      errors.auditorId = t("audits.create.errors.auditor")
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = () => {
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
  // The preview is cut so that the step never needs scrolling.
  const previewItems = formData.auditItems.slice(0, PREVIEW_ITEM_COUNT)
  const hiddenItemCount = formData.auditItems.length - previewItems.length

  const auditStep = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="aircraft">
          {t("audits.fields.aircraft")} <span className="text-destructive">*</span>
        </Label>
        <Select value={formData.aircraftId} onValueChange={(value) => handleInputChange("aircraftId", value)}>
          <SelectTrigger
            id="aircraft"
            aria-invalid={Boolean(validationErrors.aircraftId)}
            className={cn(validationErrors.aircraftId && "border-destructive")}
          >
            <SelectValue placeholder={t("audits.create.selectAircraft")} />
          </SelectTrigger>
          <SelectContent>
            {(aircraftData?.getAircrafts ?? []).map((aircraft: any) => (
              <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                {aircraft.registration_number} ({aircraft.model})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {validationErrors.aircraftId && <p className="text-sm text-destructive">{validationErrors.aircraftId}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="auditor">
          {t("audits.fields.auditor")} <span className="text-destructive">*</span>
        </Label>
        <Select value={formData.auditorId} onValueChange={(value) => handleInputChange("auditorId", value)}>
          <SelectTrigger
            id="auditor"
            aria-invalid={Boolean(validationErrors.auditorId)}
            className={cn(validationErrors.auditorId && "border-destructive")}
          >
            <SelectValue placeholder={t("audits.create.selectAuditor")} />
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
          {t("audits.fields.auditDate")} <span className="text-destructive">*</span>
        </Label>
        <DatePicker
          date={formData.auditDate}
          onSelect={(date) => date && handleInputChange("auditDate", date)}
          placeholder={t("audits.form.selectDate")}
          clearable={false}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audit-result">
          {t("audits.fields.result")} <span className="text-destructive">*</span>
        </Label>
        <Select value={formData.auditResult} onValueChange={(value) => handleInputChange("auditResult", value)}>
          <SelectTrigger id="audit-result">
            <SelectValue placeholder={t("audits.form.selectResult")} />
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
  )

  const templateStep = selectedTemplate ? (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">{selectedTemplate.name}</p>
          {selectedTemplate.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{selectedTemplate.description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsTemplateDialogOpen(true)}>
            {t("audits.create.template.change")}
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
            {t("common:actions.remove")}
          </Button>
        </div>
      </div>

      {formData.auditItems.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("audits.create.template.itemsCreated", { count: formData.auditItems.length })}{" "}
            {t("audits.create.template.fillLater")}
          </p>
          <ul className="divide-y rounded-md border">
            {previewItems.map((item, index) => (
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
          {hiddenItemCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("audits.create.template.moreItems", { count: hiddenItemCount })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("audits.create.template.noItems")}</p>
      )}
    </div>
  ) : (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {t("audits.create.template.hint")}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setIsTemplateDialogOpen(true)}
      >
        {t("audits.create.template.choose")}
      </Button>
    </div>
  )

  const planningStep = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="audit-frequency">
            {t("audits.fields.frequency")} <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.auditFrequency} onValueChange={(value) => handleInputChange("auditFrequency", value)}>
            <SelectTrigger id="audit-frequency">
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

        <div className="space-y-2" role="group" aria-labelledby="next-audit-date-label">
          <Label id="next-audit-date-label">{t("audits.fields.nextAudit")}</Label>
          <DatePicker
            date={formData.nextAuditDate || undefined}
            onSelect={(date) => handleInputChange("nextAuditDate", date)}
            placeholder={t("audits.form.notPlanned")}
            clearable
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("audits.form.nextAuditHint")}
      </p>

      <div className="space-y-2">
        <Label htmlFor="audit-notes">{t("common:labels.notes")}</Label>
        <Textarea
          id="audit-notes"
          placeholder={t("audits.create.notesPlaceholder")}
          value={formData.auditNotes}
          onChange={(e) => handleInputChange("auditNotes", e.target.value)}
          rows={4}
        />
      </div>
    </>
  )

  return (
    <>
      <SidePanel
        open={isOpen}
        onOpenChange={(open) => !open && !createLoading && onClose()}
        title={t("audits.create.title")}
        description={t("audits.create.description")}
        onSubmit={handleSubmit}
        submitLabel={t("audits.create.submit")}
        submitting={createLoading}
        steps={[
          { title: t("audits.form.steps.audit"), content: auditStep, validate: validateForm },
          { title: t("audits.create.steps.template"), content: templateStep },
          { title: t("audits.create.steps.planning"), content: planningStep },
        ]}
      />

      <TemplateSelector
        isOpen={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        aircraftType={selectedAircraftType || undefined}
        key={`template-selector-${selectedAircraftType || "all"}`}
      />
    </>
  )
}
