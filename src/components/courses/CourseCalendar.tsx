"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, isSameDay, isWithinInterval, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { Star, Clock, BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import type { DateRange } from "react-day-picker"

type Course = {
  id: number
  instructor: { id: number; first_name: string; last_name: string }
  student: { id: number; first_name: string; last_name: string }
  startTime: string
  endTime: string | null
  status: string
  rating: number | null
  description?: string
  competencies: { id: number; name: string; description: string; validated: boolean }[]
}

type CourseCalendarProps = {
  courses: Course[]
  userId: number
  userRole: "instructor" | "student"
}

export default function CourseCalendar({ courses, userId, userRole }: CourseCalendarProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  })

  const coursesByDate = courses.reduce(
    (acc, course) => {
      const date = format(parseISO(course.startTime), "yyyy-MM-dd")
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(course)
      return acc
    },
    {} as Record<string, Course[]>,
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "Planifié"
      case "IN_PROGRESS":
        return "En cours"
      case "COMPLETED":
        return "Terminé"
      case "CANCELLED":
        return "Annulé"
      default:
        return status
    }
  }

  const filteredCourses = courses.filter((course) =>
    dateRange?.to && dateRange.from
      ? isWithinInterval(parseISO(course.startTime), { start: dateRange.from, end: dateRange.to })
      : dateRange?.from
        ? isSameDay(parseISO(course.startTime), dateRange.from)
        : false,
  )

  const getDayHasEvents = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return !!coursesByDate[dateStr] && coursesByDate[dateStr].length > 0
  }

  return (
    <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
      <div className="lg:w-1/3">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newDate = new Date()
                  setDateRange({ from: newDate, to: undefined })
                }}
              >
                Aujourd'hui
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const prevMonth = new Date(dateRange?.from || new Date())
                    prevMonth.setMonth(prevMonth.getMonth() - 1)
                    setDateRange({ from: prevMonth, to: undefined })
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const nextMonth = new Date(dateRange?.from || new Date())
                    nextMonth.setMonth(nextMonth.getMonth() + 1)
                    setDateRange({ from: nextMonth, to: undefined })
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Calendar
              mode="single"
              selected={dateRange?.from}
              onSelect={(date) => setDateRange({ from: date || new Date(), to: undefined })}
              locale={fr}
              className="rounded-md"
              modifiers={{
                hasEvents: (date) => getDayHasEvents(date),
              }}
              modifiersStyles={{
                hasEvents: {
                  fontWeight: "bold",
                  color: "var(--primary)",
                  textDecoration: "underline",
                },
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex-grow">
        <Card className="h-full">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-foreground">
                {dateRange?.from && format(dateRange.from, "dd MMMM yyyy", { locale: fr })}
              </h3>
            </div>

            <ScrollArea className="h-[calc(100vh-400px)] max-h-[500px]">
              {filteredCourses.length > 0 ? (
                <div className="space-y-4">
                  {filteredCourses.map((course) => (
                    <Card key={course.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <h4 className="text-base font-medium text-foreground">
                            {userRole === "instructor" ? course.student.first_name : course.instructor.first_name}{" "}
                            {userRole === "instructor" ? course.student.last_name : course.instructor.last_name}
                          </h4>
                          {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
                        </div>
                        <Badge className={getStatusColor(course.status)}>{getStatusLabel(course.status)}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>Début: {format(parseISO(course.startTime), "HH:mm", { locale: fr })}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>
                            Fin:{" "}
                            {course.endTime ? format(parseISO(course.endTime), "HH:mm", { locale: fr }) : "Non défini"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground mb-3">
                        <BookOpen className="w-4 h-4 mr-1" />
                        <span>
                          {course.competencies.length} compétence{course.competencies.length > 1 ? "s" : ""}
                        </span>
                        {course.competencies.length > 0 && (
                          <Badge variant="outline" className="ml-2">
                            {course.competencies.filter((c) => c.validated).length} validée
                            {course.competencies.filter((c) => c.validated).length > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-2">
                        {course.rating ? (
                          <div className="flex items-center">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium">{course.rating}/5</span>
                          </div>
                        ) : (
                          <div></div>
                        )}
                        <Link href={`/instruction/courses/${course.id}`}>
                          <Button variant="outline" size="sm">
                            Détails
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <p className="text-lg">Aucun cours prévu pour cette date</p>
                  <p className="text-sm">Sélectionnez une autre date ou créez un nouveau cours</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
