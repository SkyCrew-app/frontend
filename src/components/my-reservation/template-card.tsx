"use client"

import { useTranslation } from "react-i18next"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plane, Clock, Trash2, Pencil, CalendarDays, FileText } from "lucide-react"
import type { ReservationTemplate } from "@/interfaces/reservation-template"
import { flightCategoryLabel } from "@/components/reservation/flight-category"

interface TemplateCardProps {
  template: ReservationTemplate
  onUse: (template: ReservationTemplate) => void
  onEdit: (template: ReservationTemplate) => void
  onDelete: (template: ReservationTemplate) => void
}

const shortTime = (time: string | undefined) => (time ? time.slice(0, 5) : "…")

export function TemplateCard({ template, onUse, onEdit, onDelete }: TemplateCardProps) {
  const { t } = useTranslation("reservations")
  const hasDay = template.day_of_week !== null && template.day_of_week !== undefined
  const hasTimes = Boolean(template.preferred_start_time || template.preferred_end_time)
  const hasFacts = Boolean(template.aircraft || hasTimes || hasDay || template.purpose)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="truncate text-base">{template.name}</CardTitle>
        <Badge variant="neutral" className="shrink-0">
          {flightCategoryLabel(template.flight_category)}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-4 text-sm">
        {template.aircraft && (
          <p className="flex items-center gap-2">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">
              {template.aircraft.registration_number} — {template.aircraft.model}
            </span>
          </p>
        )}
        {hasTimes && (
          <p className="flex items-center gap-2 tabular-nums">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {shortTime(template.preferred_start_time)} – {shortTime(template.preferred_end_time)}
          </p>
        )}
        {hasDay && (
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {t(`weekday.${template.day_of_week as number}`, { defaultValue: "" })}
          </p>
        )}
        {template.purpose && (
          <p className="flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{template.purpose}</span>
          </p>
        )}
        {!hasFacts && <p className="text-muted-foreground">{t("template.card.noDetails")}</p>}
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-4">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-destructive hover:text-destructive"
          onClick={() => onDelete(template)}
          aria-label={t("template.card.deleteLabel", { name: template.name })}
          title={t("common:actions.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9"
          onClick={() => onEdit(template)}
          aria-label={t("template.card.editLabel", { name: template.name })}
          title={t("common:actions.edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={() => onUse(template)}>
          {t("template.card.use")}
        </Button>
      </CardFooter>
    </Card>
  )
}
