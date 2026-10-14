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
import { InstructorField, LicenceRequiredNote } from "@/components/reservation/instructor-field"
import { usePlan } from "@/components/hooks/usePlan"

// A flight with an instructor is an instruction flight: the API sets this category itself.
export const INSTRUCTION_CATEGORY = "INSTRUCTION"

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
  /** Shown under the slot: what the booking will cost. */
  price?: ReactNode
  purpose: string
  setPurpose: (value: string) => void
  notes: string
  setNotes: (value: string) => void
  flightCategory: string
  setFlightCategory: (value: string) => void
  onSubmit: () => void | Promise<void>
  isSubmitting: boolean
  /** Optional action shown at the start of the footer (e.g. cancelling the booking). */
  footerStart?: ReactNode
  /**
   * "With an instructor": shown when a setter is given. `instructorId` is "" for a flight
   * without one; `instructorRequired` when the member has no valid licence.
   */
  instructorId?: string
  setInstructorId?: (value: string) => void
  instructorRequired?: boolean
  /** The pilot of the booking, who cannot be their own instructor. */
  pilotId?: number | string | null
}

/** Side panel with the purpose, category and notes of a reservation whose slot is already chosen. */
export function ReservationForm({
  open,
  onOpenChange,
  title,
  description,
  isEdit = false,
  summary,
  price,
  purpose,
  setPurpose,
  notes,
  setNotes,
  flightCategory,
  setFlightCategory,
  onSubmit,
  isSubmitting,
  footerStart,
  instructorId = "",
  setInstructorId,
  instructorRequired = false,
  pilotId,
}: ReservationFormProps) {
  const { t } = useTranslation("reservations")
  const [categoryError, setCategoryError] = useState(false)
  const [instructorError, setInstructorError] = useState(false)
  const withInstructor = !!setInstructorId && instructorId !== ""
  // Without instruction in the plan, there is no instructor to choose: a member without a valid
  // licence cannot book (a booking that already has an instructor keeps it).
  const instruction = usePlan().includes("INSTRUCTION")
  const showInstructor = !!setInstructorId && instruction
  const licenceMissing = !instruction && instructorRequired && !withInstructor

  useEffect(() => {
    if (open) {
      setCategoryError(false)
      setInstructorError(false)
    }
  }, [open])

  // The category is a required enum of the API; a member without a licence needs an instructor.
  const handleSubmit = async () => {
    const missingInstructor = showInstructor && instructorRequired && !instructorId
    const missingCategory = !flightCategory && !withInstructor
    setInstructorError(missingInstructor)
    setCategoryError(missingCategory)
    if (missingInstructor || missingCategory || licenceMissing) return
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
      // Nothing to send: the note above says why.
      submitDisabled={licenceMissing}
      footerStart={footerStart}
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

        {licenceMissing && <LicenceRequiredNote />}

        {price}

        <div className="space-y-2">
          <Label htmlFor="purpose">{t("form.purpose")}</Label>
          <Input
            id="purpose"
            placeholder={t("form.purposePlaceholder")}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
        </div>

        {showInstructor && (
          <InstructorField
            id="instructor"
            value={instructorId}
            onChange={(value) => {
              setInstructorId(value)
              setInstructorError(false)
              if (value) {
                setFlightCategory(INSTRUCTION_CATEGORY)
                setCategoryError(false)
              }
            }}
            required={instructorRequired}
            error={instructorError ? t("form.errors.instructor") : undefined}
            excludeId={pilotId}
          />
        )}

        <div className="space-y-2">
          <Label htmlFor="category">
            {t("shared.flightCategory")}{" "}
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Select
            value={(withInstructor ? INSTRUCTION_CATEGORY : flightCategory) || undefined}
            onValueChange={(value) => {
              setFlightCategory(value)
              setCategoryError(false)
            }}
            disabled={withInstructor}
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
