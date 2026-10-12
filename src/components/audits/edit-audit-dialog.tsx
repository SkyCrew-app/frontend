"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Loader2 } from "lucide-react"
import { UPDATE_AUDIT, UPDATE_AUDIT_ITEM, GET_AUDIT_ENUMS } from "@/graphql/audit"
import { AuditResultType, AuditFrequencyType } from "@/interfaces/audit"
import { calculateNextAuditDate } from "@/lib/utils"
import { auditCategoryLabel, auditFrequencyLabel, auditResult, getChangedAuditItems } from "@/lib/audit"
import { formatDate } from "@/lib/format"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [activeTab, setActiveTab] = useState("details")

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
      setActiveTab("details")
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
          title: "Enregistrement impossible",
          description: "L'audit n'a pas pu être mis à jour. Réessayez dans un instant.",
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
          title: "Enregistrement incomplet",
          description:
            failures.length === 1
              ? `L'audit est mis à jour, mais 1 élément sur ${itemUpdates.length} n'a pas pu être enregistré. Réessayez.`
              : `L'audit est mis à jour, mais ${failures.length} éléments sur ${itemUpdates.length} n'ont pas pu être enregistrés. Réessayez.`,
        })
        return
      }

      toast({ title: "Audit mis à jour" })
      onSuccess()
    } finally {
      setUpdateLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !updateLoading && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier l'audit</DialogTitle>
          <DialogDescription>
            Audit du {formatDate(audit?.audit_date)}
            {audit?.aircraft?.registration_number ? ` · ${audit.aircraft.registration_number}` : ""}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="details">Informations</TabsTrigger>
              <TabsTrigger value="items" className="gap-1.5">
                Éléments vérifiés
                <span className="text-xs tabular-nums text-muted-foreground">{formData.auditItems.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4 space-y-6">
              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold">Audit</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2" role="group" aria-labelledby="edit-audit-date-label">
                    <Label id="edit-audit-date-label">
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
                    <Label htmlFor="edit-audit-result">
                      Résultat <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.auditResult}
                      onValueChange={(value) => handleInputChange("auditResult", value)}
                    >
                      <SelectTrigger id="edit-audit-result">
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
                <legend className="text-sm font-semibold">Planification</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-audit-frequency">
                      Fréquence <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.auditFrequency}
                      onValueChange={(value) => handleInputChange("auditFrequency", value)}
                    >
                      <SelectTrigger id="edit-audit-frequency">
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

                  <div className="space-y-2" role="group" aria-labelledby="edit-next-audit-date-label">
                    <Label id="edit-next-audit-date-label">Prochain audit</Label>
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

              <fieldset className="space-y-4">
                <legend className="text-sm font-semibold">Constats</legend>
                <div className="space-y-2">
                  <Label htmlFor="edit-audit-notes">Notes</Label>
                  <Textarea
                    id="edit-audit-notes"
                    placeholder="Ex. : légère corrosion sur le capot moteur, à surveiller"
                    value={formData.auditNotes}
                    onChange={(e) => handleInputChange("auditNotes", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-corrective-actions">Actions correctives</Label>
                  <Textarea
                    id="edit-corrective-actions"
                    placeholder="Ex. : remplacer la durite carburant avant le prochain vol"
                    value={formData.correctiveActions}
                    onChange={(e) => handleInputChange("correctiveActions", e.target.value)}
                    rows={3}
                  />
                </div>
              </fieldset>
            </TabsContent>

            <TabsContent value="items" className="mt-4 space-y-4">
              {formData.auditItems.length > 0 ? (
                formData.auditItems.map((item, index) => (
                  <fieldset key={item.id || index} className="space-y-4 rounded-lg border p-4">
                    <legend className="px-1 text-sm font-semibold">{item.description}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
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
                                {auditCategoryLabel(category)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
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
                                {auditResult(result).label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`item-${index}-notes`}>Notes</Label>
                      <Textarea
                        id={`item-${index}-notes`}
                        placeholder="Ex. : niveau d'huile complété, 0,5 L"
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
                        Nécessite une action corrective
                      </Label>
                    </div>
                  </fieldset>
                ))
              ) : (
                <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                  Cet audit ne contient aucun élément vérifié.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={updateLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateLoading}>
              {updateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
