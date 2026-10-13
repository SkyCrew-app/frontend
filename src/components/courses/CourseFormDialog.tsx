"use client"

import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMutation, useQuery } from "@apollo/client"
import { format, parseISO } from "date-fns"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidePanel } from "@/components/layout/SidePanel"
import { useToast } from "@/components/hooks/use-toast"
import { CREATE_COURSE, GET_MEMBERS_DIRECTORY, UPDATE_COURSE } from "@/graphql/course"
import { apiRefusal } from "@/lib/api-refusal"
import { datetimeLocalToISOString } from "@/lib/datetime"
import { courseParticipants } from "@/lib/roles"
import { courseStatusOptions, personName, type InstructionCourse } from "./course-helpers"

type Member = {
  id: number
  first_name: string
  last_name: string
  role?: { role_name?: string | null } | null
}

type CourseFormDialogProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
  // The course to modify; without it the dialog plans a new course.
  course?: InstructionCourse | null
  // Set when an instructor plans their own course: the instructor is not asked.
  instructorId?: number | null
}

const toInputValue = (iso: string | null | undefined) => (iso ? format(parseISO(iso), "yyyy-MM-dd'T'HH:mm") : "")

const emptyForm = (instructorId: string) => ({
  instructorId,
  studentId: "",
  startTime: "",
  endTime: "",
  status: "SCHEDULED",
})

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    {" "}
    *
  </span>
)

// Plans a course or modifies one: who, when and, for an existing course, its status.
export default function CourseFormDialog({ open, onClose, onSaved, course = null, instructorId = null }: CourseFormDialogProps) {
  const { t } = useTranslation("instruction")
  const { toast } = useToast()
  const isEdit = course !== null
  const ownInstructorId = instructorId === null ? "" : String(instructorId)
  const [form, setForm] = useState(emptyForm(ownInstructorId))
  const [submitted, setSubmitted] = useState(false)

  const { data: membersData, loading: membersLoading } = useQuery(GET_MEMBERS_DIRECTORY, { skip: !open })
  const [createCourse, { loading: creating }] = useMutation(CREATE_COURSE)
  const [updateCourse, { loading: updating }] = useMutation(UPDATE_COURSE)
  const saving = creating || updating

  // Start from the course to modify, or from a blank form, each time the dialog opens.
  useEffect(() => {
    if (!open) return
    setSubmitted(false)
    setForm(
      course
        ? {
            instructorId: String(course.instructor.id),
            studentId: String(course.student.id),
            startTime: toInputValue(course.startTime),
            endTime: toInputValue(course.endTime),
            status: course.status,
          }
        : emptyForm(ownInstructorId),
    )
  }, [open, course, ownInstructorId])

  const setField = (name: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [name]: value }))

  const { instructors, students } = courseParticipants<Member>(membersData?.membersDirectory, form.instructorId)
  // An instructor who plans or modifies their own course does not choose the instructor.
  const askInstructor = !ownInstructorId

  const errors = {
    instructorId: form.instructorId ? null : t("courses.form.errors.instructor"),
    studentId: form.studentId ? null : t("courses.form.errors.student"),
    startTime: form.startTime ? null : t("courses.form.errors.start"),
    endTime:
      form.endTime && form.startTime && new Date(form.endTime) <= new Date(form.startTime)
        ? t("courses.form.errors.end")
        : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const fieldError = (name: keyof typeof errors) =>
    submitted && errors[name] ? <p className="text-sm text-destructive">{errors[name]}</p> : null

  const handleSubmit = async () => {
    setSubmitted(true)
    if (hasErrors) return

    try {
      if (course) {
        await updateCourse({
          variables: {
            input: {
              id: course.id,
              startTime: datetimeLocalToISOString(form.startTime),
              endTime: datetimeLocalToISOString(form.endTime),
              instructorId: Number.parseInt(form.instructorId, 10),
              studentId: Number.parseInt(form.studentId, 10),
              status: form.status,
            },
          },
        })
        toast({ title: t("courses.form.toast.updated.title"), description: t("shared.changesSaved") })
      } else {
        await createCourse({
          variables: {
            input: {
              instructorId: Number.parseInt(form.instructorId, 10),
              studentId: Number.parseInt(form.studentId, 10),
              startTime: new Date(form.startTime).toISOString(),
              endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
            },
          },
        })
        toast({
          title: t("courses.form.toast.created.title"),
          description: t("courses.form.toast.created.description"),
        })
      }
      onSaved()
      onClose()
    } catch (error) {
      // A refusal (slot already taken, change reserved to administrators…) is explained by the API.
      toast({
        variant: "destructive",
        title: isEdit ? t("courses.form.toast.updateFailed.title") : t("courses.form.toast.createFailed.title"),
        description: apiRefusal(error, t("shared.saveFailed")),
      })
    }
  }

  const memberOptions = (members: Member[], emptyLabel: string) =>
    membersLoading ? (
      <div className="flex items-center justify-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("courses.form.loadingMembers")}
      </div>
    ) : members.length === 0 ? (
      <div className="p-3 text-center text-sm text-muted-foreground">{emptyLabel}</div>
    ) : (
      members.map((member) => (
        <SelectItem key={member.id} value={String(member.id)}>
          {personName(member)}
        </SelectItem>
      ))
    )

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => !next && !saving && onClose()}
      title={isEdit ? t("courses.form.title.edit") : t("courses.form.title.create")}
      description={
        isEdit ? t("courses.form.description.edit") : t("courses.form.description.create")
      }
      onSubmit={handleSubmit}
      submitLabel={isEdit ? t("common:actions.save") : t("courses.form.submitCreate")}
      submitting={saving}
    >
      <div className="space-y-4">
        {askInstructor && (
          <div className="space-y-2">
            <Label htmlFor="course-instructor">
              {t("common:labels.instructor")}
              <RequiredMark />
            </Label>
            <Select value={form.instructorId} onValueChange={(value) => setField("instructorId", value)}>
              <SelectTrigger id="course-instructor">
                <SelectValue placeholder={t("courses.form.instructorPlaceholder")} />
              </SelectTrigger>
              <SelectContent>{memberOptions(instructors, t("courses.form.noInstructor"))}</SelectContent>
            </Select>
            {fieldError("instructorId")}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="course-student">
            {t("common:labels.student")}
            <RequiredMark />
          </Label>
          <Select value={form.studentId} onValueChange={(value) => setField("studentId", value)}>
            <SelectTrigger id="course-student">
              <SelectValue placeholder={t("courses.form.studentPlaceholder")} />
            </SelectTrigger>
            <SelectContent>{memberOptions(students, t("courses.form.noMember"))}</SelectContent>
          </Select>
          {fieldError("studentId")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="course-start">
              {t("common:labels.start")}
              <RequiredMark />
            </Label>
            <Input
              id="course-start"
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => setField("startTime", event.target.value)}
              aria-invalid={submitted && !!errors.startTime}
            />
            {fieldError("startTime")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-end">{t("common:labels.end")}</Label>
            <Input
              id="course-end"
              type="datetime-local"
              value={form.endTime}
              min={form.startTime || undefined}
              onChange={(event) => setField("endTime", event.target.value)}
              aria-invalid={submitted && !!errors.endTime}
            />
            {fieldError("endTime") ?? <p className="text-xs text-muted-foreground">{t("shared.optional")}</p>}
          </div>
        </div>

        {isEdit && (
          <div className="space-y-2">
            <Label htmlFor="course-status">{t("common:labels.status")}</Label>
            <Select value={form.status} onValueChange={(value) => setField("status", value)}>
              <SelectTrigger id="course-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {courseStatusOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </SidePanel>
  )
}
