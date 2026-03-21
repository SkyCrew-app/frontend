"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plane, Clock, Trash2, Pencil, Play } from "lucide-react"
import type { ReservationTemplate } from "@/interfaces/reservation-template"

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]

const FLIGHT_CATEGORY_LABELS: Record<string, string> = {
  LOCAL: "Local",
  CROSS_COUNTRY: "Navigation",
  INSTRUCTION: "Instruction",
  TOURISM: "Tourisme",
  TRAINING: "Entra\u00eenement",
  MAINTENANCE: "Maintenance",
  PRIVATE: "Priv\u00e9",
  CORPORATE: "Entreprise",
}

interface TemplateCardProps {
  template: ReservationTemplate
  onUse: (template: ReservationTemplate) => void
  onEdit: (template: ReservationTemplate) => void
  onDelete: (id: number) => void
}

export function TemplateCard({ template, onUse, onEdit, onDelete }: TemplateCardProps) {
  return (
    <Card className="h-full flex flex-col shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg truncate">{template.name}</CardTitle>
        <Badge variant="outline">
          {FLIGHT_CATEGORY_LABELS[template.flight_category] ?? template.flight_category}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 text-sm">
        {template.aircraft && (
          <div className="flex items-center text-muted-foreground">
            <Plane className="h-4 w-4 mr-2" />
            {template.aircraft.registration_number} - {template.aircraft.model}
          </div>
        )}
        {(template.preferred_start_time || template.preferred_end_time) && (
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            {template.preferred_start_time ?? "?"} - {template.preferred_end_time ?? "?"}
          </div>
        )}
        {template.day_of_week !== null && template.day_of_week !== undefined && (
          <div className="text-muted-foreground">
            Jour pr&eacute;f&eacute;r&eacute; : {DAYS[template.day_of_week]}
          </div>
        )}
        {template.purpose && (
          <div className="text-muted-foreground truncate">{template.purpose}</div>
        )}
      </CardContent>
      <div className="p-4 pt-0 flex gap-2">
        <Button size="sm" onClick={() => onUse(template)} className="flex-1">
          <Play className="h-3 w-3 mr-1" />
          Utiliser
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDelete(template.id)}>
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    </Card>
  )
}
