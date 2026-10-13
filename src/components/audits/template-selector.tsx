"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Check, FileText, Search } from "lucide-react"
import { GET_AUDIT_TEMPLATE, GET_TEMPLATES_FOR_AIRCRAFT_TYPE } from "@/graphql/audit"
import { auditFrequencyLabel } from "@/lib/audit"
import { currentLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/layout/EmptyState"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SidePanel } from "@/components/layout/SidePanel"

interface TemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: any) => void
  aircraftType?: string
}

export function TemplateSelector({ isOpen, onClose, onSelectTemplate, aircraftType }: TemplateSelectorProps) {
  const { t } = useTranslation("administration")
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
      aircraftType
        ? (aircraftTemplatesData?.auditTemplatesForAircraftType ?? []).map((template: any) => template.id)
        : [],
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
    return a.name.localeCompare(b.name, currentLocale())
  })

  const handleConfirmSelection = () => {
    const selectedTemplate = templates.find((template: any) => template.id === selectedTemplateId)
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate)
    }
    onClose()
  }

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={t("audits.templateSelector.title")}
      description={
        aircraftType
          ? t("audits.templateSelector.descriptionForType", { type: aircraftType })
          : t("audits.templateSelector.description")
      }
      onSubmit={handleConfirmSelection}
      submitLabel={t("audits.templateSelector.submit")}
      submitDisabled={selectedTemplateId === null}
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("audits.templateSelector.searchPlaceholder")}
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={t("audits.templateSelector.search")}
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
                        {template.isRecommended && (
                          <Badge variant="success">{t("audits.templateSelector.recommended")}</Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{template.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {[
                          auditFrequencyLabel(template.recommended_frequency),
                          t("audits.templateSelector.itemCount", { count: itemCount }),
                          template.applicable_aircraft_types?.length > 0
                            ? template.applicable_aircraft_types.join(", ")
                            : t("audits.allAircraft"),
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
            title={t("audits.templateSelector.empty.title")}
            description={
              searchLower ? t("audits.templateSelector.empty.search") : t("audits.templateSelector.empty.none")
            }
          />
        )}

      </div>
    </SidePanel>
  )
}
