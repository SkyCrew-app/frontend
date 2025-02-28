"use client"

import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, isSameDay, isWithinInterval } from "date-fns"
import { fr } from "date-fns/locale"
import { Star, Clock, BookOpen, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DateRange } from "react-day-picker"

type Course = {
  id: number
  instructor: { id: number; first_name: string }
  student: { id: number; first_name: string }
  startTime: string
  endTime: string | null
  status: string
  rating: number | null
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
      const date = format(new Date(course.startTime), "yyyy-MM-dd")
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
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    }
  }

  const filteredCourses = courses.filter((course) =>
    dateRange?.to && dateRange.from
      ? isWithinInterval(new Date(course.startTime), { start: dateRange.from, end: dateRange.to })
      : dateRange?.from
        ? isSameDay(new Date(course.startTime), dateRange.from)
        : false,
  )

  return (
    <div className="flex flex-col lg:flex-row space-y-6 lg:space-y-0 lg:space-x-6">
      <Card className="lg:w-1/3 h-fit">
        <CardContent className="p-3">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(newDateRange) => setDateRange(newDateRange)}
            locale={fr}
            className="rounded-md calendar-small"
            numberOfMonths={1}
          />
        </CardContent>
      </Card>
      <Card className="flex-grow">
        <CardContent className="p-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold text-foreground">
              {dateRange?.from && format(dateRange.from, "dd MMMM", { locale: fr })}
              {dateRange?.to && ` - ${format(dateRange.to, "dd MMMM", { locale: fr })}`}
              {dateRange?.from && format(dateRange.from, " yyyy", { locale: fr })}
            </h3>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setDateRange((prev) =>
                    prev?.from ? { ...prev, from: new Date(prev.from.getTime() - 86400000) } : prev,
                  )
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setDateRange((prev) =>
                    prev?.from ? { ...prev, from: new Date(prev.from.getTime() + 86400000) } : prev,
                  )
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-400px)] max-h-[500px]">
            {filteredCourses.length > 0 ? (
              <div className="space-y-4">
                {filteredCourses.map((course) => (
                  <Card key={course.id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-base font-medium text-foreground">
                        {userRole === "instructor" ? course.student.first_name : course.instructor.first_name}
                      </h4>
                      <Badge className={`${getStatusColor(course.status)} text-xs`}>{course.status}</Badge>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {format(new Date(course.startTime), "d MMM yyyy - HH:mm", { locale: fr })}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mb-1">
                      <BookOpen className="w-3 h-3 mr-1" />
                      {course.competencies.length} compétence{course.competencies.length > 1 ? "s" : ""}
                    </div>
                    {course.rating && (
                      <div className="flex items-center mt-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                        <span className="text-xs font-medium text-foreground">{course.rating}</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">Aucun cours prévu pour cette période.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
