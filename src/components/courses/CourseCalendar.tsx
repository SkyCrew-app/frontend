"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { format, isSameDay, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarX, ChevronRight } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/EmptyState"
import { learningRoutes } from "@/lib/learning-navigation"
import {
  courseCounterpart,
  courseHours,
  courseStatus,
  personName,
  type InstructionCourse,
} from "./course-helpers"

type CourseCalendarProps = {
  courses: InstructionCourse[]
  userId: number | null
}

export default function CourseCalendar({ courses, userId }: CourseCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [month, setMonth] = useState<Date>(new Date())

  const courseDays = useMemo(() => courses.map((course) => parseISO(course.startTime)), [courses])
  const coursesOfDay = useMemo(
    () =>
      courses
        .filter((course) => isSameDay(parseISO(course.startTime), selectedDay))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [courses, selectedDay],
  )

  const goToToday = () => {
    const today = new Date()
    setSelectedDay(today)
    setMonth(today)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <Card className="mx-auto w-full max-w-sm lg:mx-0">
        <CardContent className="p-3">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={(day) => day && setSelectedDay(day)}
            month={month}
            onMonthChange={setMonth}
            locale={fr}
            modifiers={{ hasCourse: courseDays }}
            modifiersClassNames={{ hasCourse: "font-semibold underline decoration-2 underline-offset-4" }}
          />
          <div className="flex items-center justify-between gap-3 border-t px-3 pt-3">
            <p className="text-xs text-muted-foreground">Les jours soulignés ont un cours.</p>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Aujourd'hui
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg first-letter:uppercase">
            {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coursesOfDay.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="Aucun cours ce jour-là"
              description="Choisissez un jour souligné dans le calendrier."
            />
          ) : (
            <ul className="divide-y">
              {coursesOfDay.map((course) => {
                const { person, role } = courseCounterpart(course, userId)
                const status = courseStatus(course.status)
                const validated = course.competencies.filter((competency) => competency.validated).length
                return (
                  <li key={course.id}>
                    <Link
                      href={learningRoutes.course(course.id)}
                      className="flex flex-wrap items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="w-28 shrink-0 text-sm font-medium tabular-nums">{courseHours(course)}</p>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{personName(person)}</p>
                        <p className="text-xs text-muted-foreground">
                          {role}
                          {course.competencies.length > 0 &&
                            ` · ${validated} / ${course.competencies.length} compétences validées`}
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
        </CardContent>
      </Card>
    </div>
  )
}
