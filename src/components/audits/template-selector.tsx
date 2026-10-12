"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { Check, FileText, Search } from "lucide-react"
import { GET_AUDIT_TEMPLATE, GET_TEMPLATES_FOR_AIRCRAFT_TYPE } from "@/graphql/audit"
import { auditFrequencyLabel } from "@/lib/audit"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/layout/EmptyState"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: any) => void
  aircraftType?: string
}

export function TemplateSelector({ isOpen, onClose, onSelectTemplate, aircraftType }: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)

  const { data: allTemplatesData, loading: allTemplatesLoading } = useQuery(GET_AUDIT_TEMPLATE)

  const { data: aircraftTemplatesData, loading: aircraftTemplatesLoading } = useQuery(GET_TEMPLATES_FOR_AIRCRAFT_TYPE, {
    variables: {
      aircraftType: aircraftType || "",
    },
    skip: !aircraftType,
  })

  // Inactive templates are kept out; the ones made for this aircraft type come first.
  const templates = useMemo(() => {
    const recommendedIds = new Set<number>(
      aircraftType ? (aircraftTemplatesData?.auditTemplatesForAircraftType ?? []).map((t: any) => t.id) : [],
    )
    return (allTemplatesData?.auditTemplates ?? [])
      .filter((template: any) => template.is_active !== false)
      .map((template: any) => ({ ...template, isRecommended: recommendedIds.has(template.id) }))
  }, [allTemplatesData, aircraftTemplatesData, aircraftType])

  const searchLower = searchTerm.trim().toLowerCase()
  const filteredTemplates = templates.filter(
    (template: any) =>
      !searchLower ||
      template.name.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower) ||
      template.applicable_aircraft_types?.some((type: string) => type.toLowerCase().includes(searchLower)),
  )

  const sortedTemplates = [...filteredTemplates].sort((a: any, b: any) => {
    if (a.isRecommended && !b.isRecommended) return -1
    if (!a.isRecommended && b.isRecommended) return 1
    return a.name.localeCompare(b.name, "fr")
  })

  const handleConfirmSelection = () => {
    const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId)
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate)
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choisir un modèle d'audit</DialogTitle>
          <DialogDescription>
            {aircraftType
              ? `Les modèles prévus pour le ${aircraftType} apparaissent en premier.`
              : "Le modèle ajoute à l'audit la liste des éléments à vérifier."}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Nom du modèle ou type d'aéronef…"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Rechercher un modèle"
          />
        </div>

        {allTemplatesLoading || aircraftTemplatesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : sortedTemplates.length > 0 ? (
          <ul className="space-y-3">
            {sortedTemplates.map((template: any) => {
              const selected = selectedTemplateId === template.id
              const itemCount = template.items?.length || 0
              return (
                <li key={template.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected ? "border-primary bg-primary/5" : "hover:bg-muted",
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{template.name}</span>
                        {template.isRecommended && <Badge variant="success">Recommandé</Badge>}
                      </div>
                      {template.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[
                          auditFrequencyLabel(template.recommended_frequency),
                          `${itemCount} élément${itemCount !== 1 ? "s" : ""}`,
                          template.applicable_aircraft_types?.length > 0
                            ? template.applicable_aircraft_types.join(", ")
                            : "Tous les aéronefs",
                        ].join(" · ")}
                      </p>
                    </div>
                    {selected && (
                      <span className="shrink-0 rounded-full bg-primary p-1 text-primary-foreground">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon={FileText}
            title="Aucun modèle trouvé"
            description={
              searchLower
                ? "Modifiez votre recherche."
                : "Aucun modèle actif n'est disponible. Créez-en un dans l'onglet « Modèles d'audit »."
            }
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleConfirmSelection} disabled={selectedTemplateId === null}>
            Utiliser ce modèle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
