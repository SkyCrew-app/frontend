"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { UPDATE_AUDIT, UPDATE_AUDIT_ITEM, GET_AUDIT_ENUMS } from "@/graphql/audit"
import { AuditResultType, AuditFrequencyType } from "@/interfaces/audit"
import { calculateNextAuditDate } from "@/lib/utils"
import { auditCategoryLabel, auditFrequencyLabel, auditResult, getChangedAuditItems } from "@/lib/audit"
import { formatDate } from "@/lib/format"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SidePanel, type SidePanelStep } from "@/components/layout/SidePanel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/hooks/use-toast"
import { DatePicker } from "@/components/ui/date-picker"

interface EditAuditDialogProps {
  isOpen: boolean
  onClose: () => void
  audit: any
  onSuccess: () => void
}

export function EditAuditDialog({ isOpen, onClose, audit, onSuccess }: EditAuditDialogProps) {
  const { t } = useTranslation("administration")
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    auditDate: new Date(),
    auditResult: AuditResultType.CONFORME,
    auditNotes: "",
    auditFrequency: AuditFrequencyType.ANNUEL,
    nextAuditDate: null as Date | null,
    correctiveActions: "",
    auditItems: [] as any[],
  })

  const { data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateAudit] = useMutation(UPDATE_AUDIT)
  const [updateAuditItem] = useMutation(UPDATE_AUDIT_ITEM)

  useEffect(() => {
    if (audit && isOpen) {
      setFormData({
        auditDate: new Date(audit.audit_date),
        auditResult: audit.audit_result,
        auditNotes: audit.audit_notes || "",
        auditFrequency: audit.audit_frequency,
        nextAuditDate: audit.next_audit_date ? new Date(audit.next_audit_date) : null,
        correctiveActions: audit.corrective_actions || "",
        auditItems:
          audit.audit_items?.map((item: any) => ({
            id: item.id,
            category: item.category,
            description: item.description,
            notes: item.notes || "",
            result: item.result,
            requires_action: item.requires_action || false,
            criticality: item.criticality,
          })) || [],
      })
    }
  }, [audit, isOpen])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

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

  const handleSubmit = async () => {
    if (updateLoading) {
      return
    }

    setUpdateLoading(true)
    try {
      try {
        await updateAudit({
          variables: {
            id: audit.id,
            input: {
              audit_date: formData.auditDate.toISOString(),
              audit_result: formData.auditResult,
              audit_notes: formData.auditNotes,
              audit_frequency: formData.auditFrequency,
              next_audit_date: formData.nextAuditDate?.toISOString(),
              corrective_actions: formData.correctiveActions,
            },
          },
        })
      } catch {
        toast({
          variant: "destructive",
          title: t("audits.edit.toast.failed.title"),
          description: t("audits.edit.toast.failed.description"),
        })
        return
      }

      // UpdateAuditInput carries no items: each modified item has its own mutation.
      const itemUpdates = getChangedAuditItems(audit.audit_items, formData.auditItems)
      const results = await Promise.allSettled(
        itemUpdates.map(({ id, input }) => updateAuditItem({ variables: { id, input } })),
      )
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected")

      if (failures.length > 0) {
        toast({
          variant: "destructive",
          title: t("audits.edit.toast.partial.title"),
          description: t("audits.edit.toast.partial.description", {
            count: failures.length,
            total: itemUpdates.length,
          }),
        })
        return
      }

      toast({ title: t("audits.edit.toast.updated") })
      onSuccess()
    } finally {
      setUpdateLoading(false)
    }
  }

  const auditStep = (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2" role="group" aria-labelledby="edit-audit-date-label">
          <Label id="edit-audit-date-label">
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
          <Label htmlFor="edit-audit-result">
            {t("audits.fields.result")} <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.auditResult} onValueChange={(value) => handleInputChange("auditResult", value)}>
            <SelectTrigger id="edit-audit-result">
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

        <div className="space-y-2">
          <Label htmlFor="edit-audit-frequency">
            {t("audits.fields.frequency")} <span className="text-destructive">*</span>
          </Label>
          <Select value={formData.auditFrequency} onValueChange={(value) => handleInputChange("auditFrequency", value)}>
            <SelectTrigger id="edit-audit-frequency">
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

        <div className="space-y-2" role="group" aria-labelledby="edit-next-audit-date-label">
          <Label id="edit-next-audit-date-label">{t("audits.fields.nextAudit")}</Label>
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
    </>
  )

  const findingsStep = (
    <>
      <div className="space-y-2">
        <Label htmlFor="edit-audit-notes">{t("common:labels.notes")}</Label>
        <Textarea
          id="edit-audit-notes"
          placeholder={t("audits.edit.notesPlaceholder")}
          value={formData.auditNotes}
          onChange={(e) => handleInputChange("auditNotes", e.target.value)}
          rows={5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-corrective-actions">{t("audits.fields.correctiveActions")}</Label>
        <Textarea
          id="edit-corrective-actions"
          placeholder={t("audits.edit.correctiveActionsPlaceholder")}
          value={formData.correctiveActions}
          onChange={(e) => handleInputChange("correctiveActions", e.target.value)}
          rows={5}
        />
      </div>
    </>
  )

  const itemsStep = formData.auditItems.map((item, index) => (
    <fieldset key={item.id || index} className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-semibold">{item.description}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`item-${index}-category`}>{t("common:labels.category")}</Label>
          <Select value={item.category} onValueChange={(value) => handleAuditItemChange(index, "category", value)}>
            <SelectTrigger id={`item-${index}-category`}>
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
          <Label htmlFor={`item-${index}-result`}>{t("audits.fields.result")}</Label>
          <Select value={item.result} onValueChange={(value) => handleAuditItemChange(index, "result", value)}>
            <SelectTrigger id={`item-${index}-result`}>
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

      <div className="space-y-2">
        <Label htmlFor={`item-${index}-notes`}>{t("common:labels.notes")}</Label>
        <Textarea
          id={`item-${index}-notes`}
          placeholder={t("audits.edit.itemNotesPlaceholder")}
          value={item.notes || ""}
          onChange={(e) => handleAuditItemChange(index, "notes", e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`item-${index}-requires-action`}
          checked={Boolean(item.requires_action)}
          onCheckedChange={(checked) => handleAuditItemChange(index, "requires_action", checked === true)}
        />
        <Label htmlFor={`item-${index}-requires-action`} className="font-normal">
          {t("audits.edit.requiresAction")}
        </Label>
      </div>
    </fieldset>
  ))

  const itemCount = formData.auditItems.length
  const steps: SidePanelStep[] = [
    { title: t("audits.form.steps.audit"), content: auditStep },
    { title: t("audits.edit.steps.findings"), content: findingsStep },
  ]
  // An audit created without a template has no item: the step would be empty.
  if (itemCount > 0) {
    steps.push({
      title: t("audits.fields.checkedItems"),
      description: t("audits.edit.itemsToFill", { count: itemCount }),
      content: itemsStep,
    })
  }

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !open && !updateLoading && onClose()}
      title={t("audits.edit.title")}
      description={
        <>
          {t("audits.auditOf", { date: formatDate(audit?.audit_date) })}
          {audit?.aircraft?.registration_number ? ` · ${audit.aircraft.registration_number}` : ""}
        </>
      }
      onSubmit={handleSubmit}
      submitLabel={t("common:actions.save")}
      submitting={updateLoading}
      steps={steps}
    />
  )
}
