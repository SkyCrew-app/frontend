"use client"

import { useEffect, useId, useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { GET_MEMBER_COMMITMENTS } from "@/graphql/user"
import { formatDateTime, formatMoney } from "@/lib/format"

interface Person {
  id: number | string
  first_name?: string | null
  last_name?: string | null
}

interface UpcomingReservation {
  id: number | string
  start_time: string
  end_time: string
  charged_amount?: number | null
  aircraft?: { id: number | string; registration_number: string } | null
  /** The member who holds the booking: the student, on a booking this member instructs. */
  user?: Person | null
}

interface UpcomingCourse {
  id: number | string
  startTime: string
  instructor?: Person | null
  student?: Person | null
}

interface MemberCommitmentsData {
  memberCommitments: {
    upcomingReservations: UpcomingReservation[]
    upcomingInstructionReservations: UpcomingReservation[]
    upcomingCourses: UpcomingCourse[]
  }
}

interface DeactivateMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: { id: number | string; name: string } | null
  pending?: boolean
  /** Called with the administrator's choice about the bookings still to come. */
  onConfirm: (cancelUpcomingBookings: boolean) => void
}

// Lists longer than this are cut, with the number left out.
const SHOWN = 5

const totalCents = (bookings: UpcomingReservation[]) =>
  bookings.reduce((cents, booking) => cents + Math.round(Number(booking.charged_amount ?? 0) * 100), 0)

const personName = (person?: Person | null) => `${person?.first_name ?? ""} ${person?.last_name ?? ""}`.trim() || "—"

/**
 * Confirmation before deactivating a member: says how many bookings and courses they still
 * have, including the bookings of other members they were to instruct, and lets the
 * administrator cancel and refund the bookings in the same action.
 */
export function DeactivateMemberDialog({
  open,
  onOpenChange,
  member,
  pending = false,
  onConfirm,
}: DeactivateMemberDialogProps) {
  const { t } = useTranslation("administration")
  const checkboxId = useId()
  const [cancelBookings, setCancelBookings] = useState(false)

  const { data, loading, error } = useQuery<MemberCommitmentsData>(GET_MEMBER_COMMITMENTS, {
    variables: { id: Number(member?.id) },
    skip: !open || !member,
    fetchPolicy: "network-only",
  })

  // The choice is made again for each member.
  useEffect(() => {
    if (open) setCancelBookings(false)
  }, [open, member?.id])

  const reservations = data?.memberCommitments.upcomingReservations ?? []
  const instructed = data?.memberCommitments.upcomingInstructionReservations ?? []
  const courses = data?.memberCommitments.upcomingCourses ?? []
  const refundCents = totalCents(reservations)
  const studentsRefundCents = totalCents(instructed)
  const cancellable = reservations.length + instructed.length > 0

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("users.accountActions.deactivateConfirm.title", { name: member?.name ?? "" })}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("users.accountActions.deactivateConfirm.description")}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm" aria-live="polite">
          {loading && (
            <div className="space-y-2" aria-busy="true" aria-label={t("users.departure.loading")}>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          )}

          {error && !loading && <p className="text-muted-foreground">{t("users.departure.loadFailed")}</p>}

          {data && (
            <>
              <section className="space-y-2">
                <h3 className="font-semibold">
                  {reservations.length === 0
                    ? t("users.departure.noBookings")
                    : t("users.departure.bookings", { count: reservations.length })}
                </h3>
                {reservations.length > 0 && (
                  <>
                    <ul className="space-y-1 text-muted-foreground">
                      {reservations.slice(0, SHOWN).map((reservation) => (
                        <li key={reservation.id} className="flex flex-wrap justify-between gap-x-4 tabular-nums">
                          <span>
                            {formatDateTime(reservation.start_time)} · {reservation.aircraft?.registration_number ?? "—"}
                          </span>
                          <span>{formatMoney(reservation.charged_amount ?? 0)}</span>
                        </li>
                      ))}
                      {reservations.length > SHOWN && (
                        <li>{t("users.departure.more", { count: reservations.length - SHOWN })}</li>
                      )}
                    </ul>
                  </>
                )}
              </section>

              {instructed.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-semibold">
                    {t("users.departure.instructionBookings", { count: instructed.length })}
                  </h3>
                  <ul className="space-y-1 text-muted-foreground">
                    {instructed.slice(0, SHOWN).map((reservation) => (
                      <li key={reservation.id} className="flex flex-wrap justify-between gap-x-4 tabular-nums">
                        <span>
                          {formatDateTime(reservation.start_time)} · {reservation.aircraft?.registration_number ?? "—"} ·{" "}
                          {t("users.departure.courseWithStudent", { name: personName(reservation.user) })}
                        </span>
                        <span>{formatMoney(reservation.charged_amount ?? 0)}</span>
                      </li>
                    ))}
                    {instructed.length > SHOWN && (
                      <li>{t("users.departure.more", { count: instructed.length - SHOWN })}</li>
                    )}
                  </ul>
                  <p className="text-xs text-muted-foreground">{t("users.departure.instructionHint")}</p>
                </section>
              )}

              {cancellable && (
                <div className="flex items-start gap-3 rounded-md border p-3">
                  <Checkbox
                    id={checkboxId}
                    checked={cancelBookings}
                    disabled={pending}
                    onCheckedChange={(checked) => setCancelBookings(checked === true)}
                  />
                  <div className="space-y-1">
                    <label htmlFor={checkboxId} className="font-medium leading-none">
                      {reservations.length > 0
                        ? t("users.departure.cancelAndRefund", { amount: formatMoney(refundCents / 100) })
                        : t("users.departure.cancelInstructionAndRefund", {
                            amount: formatMoney(studentsRefundCents / 100),
                          })}
                    </label>
                    {reservations.length > 0 && (
                      <p className="text-xs text-muted-foreground">{t("users.departure.cancelHint")}</p>
                    )}
                    {instructed.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("users.departure.cancelInstructionHint", {
                          count: instructed.length,
                          amount: formatMoney(studentsRefundCents / 100),
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {courses.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-semibold">{t("users.departure.courses", { count: courses.length })}</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    {courses.slice(0, SHOWN).map((course) => {
                      // The other participant: the one who has to be told.
                      const isStudent = String(course.student?.id) === String(member?.id)
                      return (
                        <li key={course.id}>
                          {formatDateTime(course.startTime)} ·{" "}
                          {t(isStudent ? "users.departure.courseWithInstructor" : "users.departure.courseWithStudent", {
                            name: personName(isStudent ? course.instructor : course.student),
                          })}
                        </li>
                      )
                    })}
                    {courses.length > SHOWN && <li>{t("users.departure.more", { count: courses.length - SHOWN })}</li>}
                  </ul>
                  <p className="text-xs text-muted-foreground">{t("users.departure.coursesHint")}</p>
                </section>
              )}
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("common:actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            disabled={pending || loading}
            onClick={(event) => {
              // Stay open until the caller closes it, once the API has answered.
              event.preventDefault()
              onConfirm(cancelBookings && cancellable)
            }}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {cancelBookings && cancellable
              ? t("users.departure.confirmWithCancel")
              : t("users.accountActions.deactivateConfirm.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
