"use client"

import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GET_BOOKABLE_INSTRUCTORS, GET_MAY_BOOK_WITHOUT_INSTRUCTOR } from "@/graphql/reservation"

interface Instructor {
  id: number | string
  first_name?: string | null
  last_name?: string | null
}

// Value of the "no instructor" choice: the select needs a non-empty one.
const NO_INSTRUCTOR = "none"

export const instructorName = (
  instructor: { first_name?: string | null; last_name?: string | null } | null | undefined,
) =>
  [instructor?.first_name, instructor?.last_name].filter(Boolean).join(" ")

/**
 * True when the signed-in member has no valid licence: they then book with an instructor.
 * The API decides when the booking is made; this only lets the form say so beforehand.
 */
export function useInstructorRequired(): boolean {
  const { data } = useQuery<{ mayBookWithoutInstructor: boolean }>(GET_MAY_BOOK_WITHOUT_INSTRUCTOR)
  return data?.mayBookWithoutInstructor === false
}

interface InstructorFieldProps {
  id: string
  /** Id of the chosen instructor, "" for a flight without one. */
  value: string
  onChange: (value: string) => void
  /** The member has no valid licence: an instructor must be chosen. */
  required: boolean
  error?: string
  /** The pilot of the booking, who cannot be their own instructor. */
  excludeId?: number | string | null
}

/** "With an instructor": the picker of a booking form, limited to the active instructors of the club. */
export function InstructorField({ id, value, onChange, required, error, excludeId }: InstructorFieldProps) {
  const { t } = useTranslation("reservations")
  const { data } = useQuery<{ bookableInstructors: Instructor[] }>(GET_BOOKABLE_INSTRUCTORS)
  const instructors = (data?.bookableInstructors ?? []).filter(
    (instructor) => excludeId == null || String(instructor.id) !== String(excludeId),
  )
  const hintId = `${id}-hint`

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {t("form.instructor.label")}{" "}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      <Select
        value={value || (required ? undefined : NO_INSTRUCTOR)}
        onValueChange={(next) => onChange(next === NO_INSTRUCTOR ? "" : next)}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
          aria-required={required}
          aria-describedby={hintId}
          className={error ? "border-destructive" : ""}
        >
          <SelectValue placeholder={t("form.instructor.placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NO_INSTRUCTOR}>{t("form.instructor.none")}</SelectItem>}
          {instructors.map((instructor) => (
            <SelectItem key={instructor.id} value={String(instructor.id)}>
              {instructorName(instructor)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p id={hintId} className="text-xs text-muted-foreground">
        {required ? t("form.instructor.requiredHint") : t("form.instructor.optionalHint")}
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
