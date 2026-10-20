"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation } from "@apollo/client"
import { Ban, CalendarClock, ChevronRight, MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/hooks/use-toast"
import { ConfirmDeleteDialog } from "@/components/e-learning/ConfirmDeleteDialog"
import { DELETE_COURSE, UPDATE_COURSE } from "@/graphql/course"
import { apiRefusal } from "@/lib/api-refusal"
import { formatDate, formatMoney, formatTime } from "@/lib/format"
import { canCancelReservation } from "@/lib/reservation-status"
import { learningRoutes } from "@/lib/learning-navigation"
import CourseFormDialog from "./CourseFormDialog"
import {
  counterpartRoleLabel,
  courseCounterpart,
  courseDisplayStatus,
  courseHours,
  courseRemoval,
  personName,
  type InstructionCourse,
} from "./course-helpers"

type CourseListProps = {
  courses: InstructionCourse[]
  userId: number | null
  // An administrator may modify any course, an instructor only the ones they give.
  isAdministrator?: boolean
  onChanged: () => void
}

export default function CourseList({ courses, userId, isAdministrator = false, onChanged }: CourseListProps) {
  const { t } = useTranslation("instruction")
  const router = useRouter()
  const { toast } = useToast()
  // The edited course is kept while its dialog closes, so the dialog does not change under the eyes.
  const [courseToEdit, setCourseToEdit] = useState<InstructionCourse | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<InstructionCourse | null>(null)
  const [deleteCourse, { loading: deleting }] = useMutation(DELETE_COURSE)
  const [cancelCourse, { loading: cancelling }] = useMutation(UPDATE_COURSE)
  // A course in the student's record is cancelled rather than deleted (the API refuses it).
  const removal = courseToDelete ? courseRemoval(courseToDelete) : null
  // The aircraft booking of the course stays unless it is cancelled with it (the API refunds it
  // then). Once the flight has started only an administrator cancels a booking.
  const booking = courseToDelete?.reservation ?? null
  const bookingCancellable = !!booking && canCancelReservation(booking, { isAdmin: isAdministrator })
  const [cancelBooking, setCancelBooking] = useState(true)
  const withBooking = bookingCancellable && cancelBooking
  const askToRemove = (course: InstructionCourse) => {
    setCancelBooking(true)
    setCourseToDelete(course)
  }
  const bookingCancelledToast = () =>
    booking?.aircraft
      ? t("courses.list.toast.bookingCancelled", { registration: booking.aircraft.registration_number })
      : undefined

  const givesCourse = (course: InstructionCourse) => userId !== null && Number(course.instructor.id) === userId
  const canEdit = (course: InstructionCourse) => isAdministrator || givesCourse(course)

  const handleCancel = async () => {
    if (!courseToDelete) return
    try {
      await cancelCourse({
        variables: {
          input: { id: courseToDelete.id, status: "CANCELED", ...(withBooking && { cancelBooking: true }) },
        },
      })
      setCourseToDelete(null)
      onChanged()
      toast({
        title: t("courses.list.toast.cancelled.title"),
        ...(withBooking && { description: bookingCancelledToast() }),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("courses.list.toast.cancelFailed.title"),
        description: apiRefusal(error, t("shared.saveFailed")),
      })
    }
  }

  const handleDelete = async () => {
    if (!courseToDelete) return
    if (removal === "cancel") return handleCancel()
    try {
      await deleteCourse({ variables: { id: courseToDelete.id, ...(withBooking && { cancelBooking: true }) } })
      setCourseToDelete(null)
      onChanged()
      toast({
        title: t("courses.list.toast.deleted.title"),
        description: withBooking ? bookingCancelledToast() : t("courses.list.toast.deleted.description"),
      })
    } catch (error) {
      // A course that is part of a training record is refused by the API, which says why.
      toast({
        variant: "destructive",
        title: t("courses.list.toast.deleteFailed.title"),
        description: apiRefusal(error, t("shared.deleteFailed")),
      })
    }
  }

  const courseActions = (course: InstructionCourse, href: string) =>
    canEdit(course) ? (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            aria-label={t("courses.list.actionsAria")}
            title={t("common:labels.actions")}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={href}>
              <ChevronRight className="h-4 w-4" />
              {t("courses.open")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setCourseToEdit(course)
              setIsEditOpen(true)
            }}
          >
            <Pencil className="h-4 w-4" />
            {t("common:actions.edit")}
          </DropdownMenuItem>
          {courseRemoval(course) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => askToRemove(course)}
              >
                {courseRemoval(course) === "delete" ? (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {t("common:actions.delete")}
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    {t("courses.list.cancel")}
                  </>
                )}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : (
      <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
        <Link href={href} aria-label={t("courses.open")} title={t("courses.open")}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    )

  return (
    <>
      {/* Wide screens: a table. */}
      <div className="hidden rounded-xl border bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common:labels.date")}</TableHead>
              <TableHead>{t("courses.schedule")}</TableHead>
              <TableHead>{t("courses.list.with")}</TableHead>
              <TableHead>{t("common:labels.status")}</TableHead>
              <TableHead className="text-right">{t("courses.list.validatedCompetencies")}</TableHead>
              <TableHead className="text-right">{t("courses.list.rating")}</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t("common:labels.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => {
              const { person, role } = courseCounterpart(course, userId)
              const status = courseDisplayStatus(course)
              const validated = course.competencies.filter((competency) => competency.validated).length
              const href = learningRoutes.course(course.id)

              return (
                <TableRow key={course.id} className="cursor-pointer" onClick={() => router.push(href)}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {/* The link keeps the row reachable from the keyboard. */}
                    <Link href={href} onClick={(event) => event.stopPropagation()} className="hover:underline">
                      {formatDate(course.startTime)}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">{courseHours(course)}</TableCell>
                  <TableCell>
                    <div className="min-w-[8rem]">
                      <p className="font-medium">{personName(person)}</p>
                      <p className="text-xs text-muted-foreground">{counterpartRoleLabel(role)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {course.competencies.length > 0 ? `${validated} / ${course.competencies.length}` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {course.rating ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <Star className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                        {course.rating} / 5
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    {courseActions(course, href)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Phones and tablets: one card per course. */}
      <ul className="space-y-3 lg:hidden" aria-label={t("courses.title")}>
        {courses.map((course) => {
          const { person, role } = courseCounterpart(course, userId)
          const status = courseDisplayStatus(course)
          const validated = course.competencies.filter((competency) => competency.validated).length
          const href = learningRoutes.course(course.id)
          return (
            <li key={course.id} className="flex items-start gap-2 rounded-xl border bg-card p-4">
              <Link
                href={href}
                className="min-w-0 flex-1 space-y-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{formatDate(course.startTime)}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">{courseHours(course)}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </span>
                <span className="block text-sm">
                  {personName(person)}{" "}
                  <span className="text-muted-foreground">· {counterpartRoleLabel(role)}</span>
                </span>
                {(course.competencies.length > 0 || course.rating) && (
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {course.competencies.length > 0 && (
                      <span>
                        {t("courses.list.validatedCount", {
                          count: course.competencies.length,
                          validated,
                          total: course.competencies.length,
                        })}
                      </span>
                    )}
                    {course.rating && (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
                        {course.rating} / 5
                      </span>
                    )}
                  </span>
                )}
              </Link>
              {courseActions(course, href)}
            </li>
          )
        })}
      </ul>

      <CourseFormDialog
        open={isEditOpen}
        course={courseToEdit}
        // Only an administrator chooses the instructor of someone else's course.
        instructorId={courseToEdit && !isAdministrator ? Number(courseToEdit.instructor.id) : null}
        // The API lets only an administrator change who gives or takes a course.
        canChangeParticipants={isAdministrator}
        onClose={() => setIsEditOpen(false)}
        onSaved={onChanged}
      />

      <ConfirmDeleteDialog
        open={courseToDelete !== null}
        onOpenChange={(open) => !open && setCourseToDelete(null)}
        title={removal === "cancel" ? t("courses.list.cancelConfirm.title") : t("courses.list.deleteConfirm.title")}
        description={
          courseToDelete
            ? t(removal === "cancel" ? "courses.list.cancelConfirm.description" : "courses.list.deleteConfirm.description", {
                date: formatDate(courseToDelete.startTime),
                name: personName(courseCounterpart(courseToDelete, userId).person),
              })
            : ""
        }
        confirmLabel={removal === "cancel" ? t("courses.list.cancel") : undefined}
        dismissLabel={removal === "cancel" ? t("courses.list.cancelConfirm.keep") : undefined}
        onConfirm={handleDelete}
        loading={deleting || cancelling}
      >
        {booking && (
          <div className="space-y-3 rounded-lg border p-3 text-sm">
            <div className="space-y-1">
              <p className="font-medium">{t("courses.list.booking.title")}</p>
              <p className="flex items-start gap-2 text-muted-foreground">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">
                  {[
                    booking.aircraft?.registration_number,
                    formatDate(booking.start_time),
                    `${formatTime(booking.start_time)} – ${formatTime(booking.end_time)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>
              {booking.charged_amount != null && (
                <p className="tabular-nums text-muted-foreground">
                  {t("courses.list.booking.paid", { amount: formatMoney(Number(booking.charged_amount)) })}
                </p>
              )}
            </div>
            {bookingCancellable ? (
              <>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="cancel-course-booking"
                    checked={cancelBooking}
                    onCheckedChange={(checked) => setCancelBooking(checked === true)}
                    disabled={deleting || cancelling}
                    className="mt-0.5"
                  />
                  <Label htmlFor="cancel-course-booking" className="font-normal leading-snug">
                    {t("courses.list.booking.cancelToo")}
                  </Label>
                </div>
                {!cancelBooking && <p className="text-muted-foreground">{t("courses.list.booking.kept")}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">{t("courses.list.booking.started")}</p>
            )}
          </div>
        )}
      </ConfirmDeleteDialog>
    </>
  )
}
