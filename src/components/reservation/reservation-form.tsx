"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidePanel } from "@/components/layout/SidePanel"
import { FlightCategoryError } from "@/components/reservation/flight-category-error"
import { flightCategoryOptions } from "@/components/reservation/flight-category"

export interface ReservationSlotSummary {
  aircraft: string
  /** Long date, e.g. "mercredi 23 octobre 2024". */
  date: string
  start: string
  end: string
}

interface ReservationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  isEdit?: boolean
  /** The slot being booked or edited, shown read-only above the fields. */
  summary?: ReservationSlotSummary
  purpose: string
  setPurpose: (value: string) => void
  notes: string
  setNotes: (value: string) => void
  flightCategory: string
  setFlightCategory: (value: string) => void
  onSubmit: () => void | Promise<void>
  isSubmitting: boolean
}

/** Side panel with the purpose, category and notes of a reservation whose slot is already chosen. */
export function ReservationForm({
  open,
  onOpenChange,
  title,
  description,
  isEdit = false,
  summary,
  purpose,
  setPurpose,
  notes,
  setNotes,
  flightCategory,
  setFlightCategory,
  onSubmit,
  isSubmitting,
}: ReservationFormProps) {
  const { t } = useTranslation("reservations")
  const [categoryError, setCategoryError] = useState(false)

  useEffect(() => {
    if (open) setCategoryError(false)
  }, [open])

  // The category is a required enum of the API.
  const handleSubmit = async () => {
    if (!flightCategory) {
      setCategoryError(true)
      return
    }
    await onSubmit()
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next && isSubmitting) return
        onOpenChange(next)
      }}
      title={title}
      description={description}
      size="md"
      onSubmit={handleSubmit}
      submitLabel={isEdit ? t("common:actions.save") : t("form.submitCreate")}
      submitting={isSubmitting}
    >
      <div className="space-y-4">
        {summary && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-muted/50 p-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("common:labels.aircraft")}</dt>
              <dd className="font-medium">{summary.aircraft}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("common:labels.date")}</dt>
              <dd className="font-medium">{summary.date}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("common:labels.start")}</dt>
              <dd className="font-medium tabular-nums">{summary.start}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("common:labels.end")}</dt>
              <dd className="font-medium tabular-nums">{summary.end}</dd>
            </div>
          </dl>
        )}

        <div className="space-y-2">
          <Label htmlFor="purpose">{t("form.purpose")}</Label>
          <Input
            id="purpose"
            placeholder={t("form.purposePlaceholder")}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            {t("shared.flightCategory")}{" "}
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Select
            value={flightCategory || undefined}
            onValueChange={(value) => {
              setFlightCategory(value)
              setCategoryError(false)
            }}
          >
            <SelectTrigger
              id="category"
              aria-invalid={categoryError}
              aria-required="true"
              className={categoryError ? "border-destructive" : ""}
            >
              <SelectValue placeholder={t("form.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {flightCategoryOptions().map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FlightCategoryError visible={categoryError} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">{t("common:labels.notes")}</Label>
          <Textarea
            id="notes"
            placeholder={t("form.notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </SidePanel>
  )
}
