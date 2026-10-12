import Link from "next/link"
import { CalendarClock, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import {
  courseCounterpart,
  courseSlot,
  courseStatus,
  personName,
  type InstructionCourse,
} from "@/components/courses/course-helpers"
import { learningRoutes } from "@/lib/learning-navigation"
import { SectionCard } from "./section-card"

interface UpcomingCoursesCardProps {
  courses: InstructionCourse[]
  userId: number | null
  error?: boolean
  onRetry?: () => void
}

export function UpcomingCoursesCard({ courses, userId, error = false, onRetry }: UpcomingCoursesCardProps) {
  return (
    <SectionCard
      title="Prochains cours"
      description="Vos cours planifiés avec un instructeur ou un élève."
      href={learningRoutes.courses}
      linkLabel="Tous mes cours"
    >
      {error ? (
        <ErrorState onRetry={onRetry} />
      ) : courses.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucun cours à venir" description="Vos prochains cours apparaîtront ici." />
      ) : (
        <ul className="divide-y">
          {courses.map((course) => {
            const { person, role } = courseCounterpart(course, userId)
            const status = courseStatus(course.status)
            return (
              <li key={course.id}>
                <Link
                  href={learningRoutes.course(course.id)}
                  className="flex min-h-[3.5rem] items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{courseSlot(course)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {role} : {personName(person)}
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
