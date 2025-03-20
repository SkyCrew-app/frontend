"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Book, AlertCircle } from "lucide-react"
import type { ApolloError } from "@apollo/client"

interface CourseListItem {
  id: string
  title: string
  required_license: string
}

interface CourseListProps {
  courses: CourseListItem[]
  selectedCourseId: string | null
  setSelectedCourseId: (id: string) => void
  coursesLoading: boolean
  coursesError: ApolloError | undefined
}

export function CourseList({
  courses,
  selectedCourseId,
  setSelectedCourseId,
  coursesLoading,
  coursesError,
}: CourseListProps) {
  if (coursesLoading) {
    return (
      <div className="p-3 space-y-2" suppressHydrationWarning>
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (coursesError) {
    return (
      <div className="p-3" suppressHydrationWarning>
        <div className="text-red-600 dark:text-red-400 text-sm p-3">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          {coursesError.message}
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="p-3 text-center" suppressHydrationWarning>
        <p className="text-gray-500 dark:text-gray-400 text-sm py-4">Aucun cours trouvé</p>
      </div>
    )
  }

  const sortedCourses = [...courses].sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id))

  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="p-2">
        {sortedCourses.map((course: CourseListItem) => (
          <Button
            key={course.id}
            variant={selectedCourseId === course.id ? "secondary" : "ghost"}
            className={`w-full justify-start text-left p-2 h-auto flex items-center rounded-md text-sm mb-1 ${
              selectedCourseId === course.id ? "bg-primary/10" : ""
            }`}
            onClick={() => setSelectedCourseId(course.id)}
          >
            <Book
              className={`h-4 w-4 mr-2 flex-shrink-0 ${
                selectedCourseId === course.id ? "text-primary" : "text-gray-500 dark:text-gray-400"
              }`}
            />
            <div className="flex flex-col items-start">
              <span className="font-medium truncate max-w-[180px]">{course.title}</span>
              <Badge variant="outline" className="mt-1 text-xs font-normal px-1 h-5">
                {course.required_license}
              </Badge>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  )
}
