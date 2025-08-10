"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Loader2, Save } from "lucide-react"
import { UPDATE_AUDIT, GET_AUDIT_ENUMS } from "@/graphql/audit"
import { AuditResultType, AuditFrequencyType, AuditCategoryType } from "@/interfaces/audit"
import { calculateNextAuditDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const { data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  const [updateAudit, { loading: updateLoading }] = useMutation(UPDATE_AUDIT, {
    onCompleted: () => {
      toast({ variant: "default", description: "Audit mis à jour avec succès" })
      onSuccess()
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Erreur lors de la mise à jour: ${error.message}` })
    },
  })

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

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    updateAudit({
      variables: {
        id: audit.id,
        input: {
          audit_date: formData.auditDate.toISOString(),
          audit_result: formData.auditResult,
          audit_notes: formData.auditNotes,
          audit_frequency: formData.auditFrequency,
          next_audit_date: formData.nextAuditDate?.toISOString(),
          corrective_actions: formData.correctiveActions,
          audit_items: formData.auditItems.map((item) => ({
            id: item.id,
            category: item.category,
            description: item.description,
            notes: item.notes,
            result: item.result,
            requires_action: item.requires_action,
          })),
        },
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Modifier l'audit</DialogTitle>
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
                <Label htmlFor="audit-notes">Notes d'audit</Label>
                <Textarea
                  id="audit-notes"
                  placeholder="Saisissez vos notes d'audit ici..."
                  value={formData.auditNotes}
                  onChange={(e) => handleInputChange("auditNotes", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="corrective-actions">Actions correctives</Label>
                <Textarea
                  id="corrective-actions"
                  placeholder="Décrivez les actions correctives à mettre en place..."
                  value={formData.correctiveActions}
                  onChange={(e) => handleInputChange("correctiveActions", e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4 sm:space-y-6">
              {formData.auditItems.length > 0 ? (
                <ScrollArea className="h-[50vh] pr-4">
                  <div className="space-y-4">
                    {formData.auditItems.map((item, index) => (
                      <Card key={item.id || index}>
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

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`item-${index}-requires-action`}
                              checked={item.requires_action}
                              onChange={(e) => handleAuditItemChange(index, "requires_action", e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor={`item-${index}-requires-action`} className="text-xs">
                              Nécessite une action corrective
                            </Label>
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
                    <p className="text-sm text-muted-foreground">Cet audit ne contient aucun élément à vérifier.</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4 sm:mt-6 flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateLoading} className="flex items-center gap-1.5">
              {updateLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
