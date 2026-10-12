import { formatDate, formatTime } from "@/lib/format"

type BadgeVariant = "info" | "warning" | "success" | "danger" | "neutral"

export interface CoursePerson {
  id: number | string
  first_name?: string | null
  last_name?: string | null
}

export interface InstructionCourse {
  id: number
  instructor: CoursePerson
  student: CoursePerson
  startTime: string
  endTime: string | null
  status: string
  rating: number | null
  competencies: { id: number; name: string; description: string; validated: boolean }[]
}

// The API spells the cancelled status both ways depending on the query.
const STATUSES: Record<string, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: "Planifié", variant: "info" },
  IN_PROGRESS: { label: "En cours", variant: "warning" },
  COMPLETED: { label: "Terminé", variant: "success" },
  CANCELED: { label: "Annulé", variant: "danger" },
  CANCELLED: { label: "Annulé", variant: "danger" },
}

// Label and badge colour of a course status, the same on every screen.
export function courseStatus(status: string | null | undefined): { label: string; variant: BadgeVariant } {
  return STATUSES[(status ?? "").toUpperCase()] ?? { label: "Statut inconnu", variant: "neutral" }
}

// The statuses an instructor can give a course, as the API names them.
export const COURSE_STATUS_OPTIONS = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELED"].map((value) => ({
  value,
  label: courseStatus(value).label,
}))

export function personName(person: CoursePerson | null | undefined): string {
  const name = [person?.first_name, person?.last_name].filter(Boolean).join(" ").trim()
  return name || "—"
}

export function personInitials(person: CoursePerson | null | undefined): string {
  const initials = [person?.first_name, person?.last_name]
    .map((part) => part?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase()
  return initials || "?"
}

// The person the user has the course with, and that person's part in it.
export function courseCounterpart(
  course: Pick<InstructionCourse, "instructor" | "student">,
  userId: number | string | null | undefined,
): { person: CoursePerson; role: "Élève" | "Instructeur" } {
  const givesIt = userId != null && String(course.instructor?.id) === String(userId)
  return givesIt ? { person: course.student, role: "Élève" } : { person: course.instructor, role: "Instructeur" }
}

// "14:00 – 15:30", or the start alone while the course has no end.
export function courseHours(course: Pick<InstructionCourse, "startTime" | "endTime">): string {
  return course.endTime ? `${formatTime(course.startTime)} – ${formatTime(course.endTime)}` : formatTime(course.startTime)
}

// "12 oct. 2026, 14:00 – 15:30"
export function courseSlot(course: Pick<InstructionCourse, "startTime" | "endTime">): string {
  return `${formatDate(course.startTime)}, ${courseHours(course)}`
}

// Courses still to come, the nearest first.
export function upcomingCourses<T extends Pick<InstructionCourse, "startTime" | "status">>(
  courses: T[] | null | undefined,
  now: Date = new Date(),
): T[] {
  return (courses ?? [])
    .filter((course) => {
      const status = (course.status ?? "").toUpperCase()
      if (status === "IN_PROGRESS") return true
      return status === "SCHEDULED" && new Date(course.startTime).getTime() >= now.getTime()
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
}
