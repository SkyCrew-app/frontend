"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@apollo/client"
import { Search, FileText, Check, Info, Loader2 } from "lucide-react"
import { GET_AUDIT_TEMPLATE, GET_TEMPLATES_FOR_AIRCRAFT_TYPE } from "@/graphql/audit"
import { getAuditFrequencyLabel } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: any) => void
  aircraftType?: string
}

export function TemplateSelector({ isOpen, onClose, onSelectTemplate, aircraftType }: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)

  const { data: allTemplatesData, loading: allTemplatesLoading } = useQuery(GET_AUDIT_TEMPLATE)

  const { data: aircraftTemplatesData, loading: aircraftTemplatesLoading } = useQuery(GET_TEMPLATES_FOR_AIRCRAFT_TYPE, {
    variables: {
      aircraftType: aircraftType || "",
    },
    skip: !aircraftType,
  })

  useEffect(() => {
    if (allTemplatesData?.auditTemplates) {
      setTemplates(allTemplatesData.auditTemplates)
    }

    if (aircraftType && aircraftTemplatesData?.auditTemplatesForAircraftType) {
      const aircraftSpecificTemplateIds = new Set(
        aircraftTemplatesData.auditTemplatesForAircraftType.map((t: any) => t.id),
      )

      setTemplates((prevTemplates) =>
        prevTemplates.map((template: any) => ({
          ...template,
          isRecommended: aircraftSpecificTemplateIds.has(template.id),
        })),
      )
    }
  }, [allTemplatesData, aircraftTemplatesData, aircraftType])

  const filteredTemplates = templates.filter((template) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      template.name.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower) ||
      template.applicable_aircraft_types?.some((type: string) => type.toLowerCase().includes(searchLower))
    )
  })

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1
    if (!a.isRecommended && b.isRecommended) return 1
    return a.name.localeCompare(b.name)
  })

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplateId(template.id)
  }

  const handleConfirmSelection = () => {
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Sélectionner un modèle d'audit</DialogTitle>
          <DialogDescription>
            Choisissez un modèle d'audit pour préremplir les éléments à vérifier.
            {aircraftType && (
              <span className="block mt-1 text-xs font-medium text-primary">
                Filtré pour le type d'aéronef: {aircraftType}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un modèle..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[50vh] pr-4">
          {allTemplatesLoading || aircraftTemplatesLoading ? (
            <div className="flex h-32 w-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sortedTemplates.length > 0 ? (
            <div className="space-y-3">
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                    selectedTemplateId === template.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-medium">{template.name}</h3>
                          {template.isRecommended && (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs"
                            >
                              Recommandé
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{getAuditFrequencyLabel(template.recommended_frequency)}</Badge>
                          {template.applicable_aircraft_types?.length > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    {template.applicable_aircraft_types.length} type(s) d'aéronef
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Types d'aéronefs: {template.applicable_aircraft_types.join(", ")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Badge variant="outline">
                            {template.items?.length || 0} élément{template.items?.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {selectedTemplateId === template.id && (
                      <div className="rounded-full bg-primary p-1 text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed p-4 text-center">
              <div>
                <p className="text-sm font-medium">Aucun modèle trouvé</p>
                <p className="text-xs text-muted-foreground">
                  {searchTerm
                    ? "Essayez de modifier vos critères de recherche."
                    : "Aucun modèle d'audit n'est disponible."}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleConfirmSelection} disabled={selectedTemplateId === null}>
            Sélectionner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
