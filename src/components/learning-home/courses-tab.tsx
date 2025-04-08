"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { BookOpen, Calendar, Clock, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import type { InstructionSummary } from "@/interfaces/instruction"
import { CourseCard } from "./course-card"

interface CoursesTabProps {
  data: InstructionSummary
}

export function CoursesTab({ data }: CoursesTabProps) {
  const router = useRouter()

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
        <CardTitle>Mes Cours</CardTitle>
        <CardDescription>Tous vos cours planifiés et passés</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-blue-500" />
              Cours à venir
            </h3>
            <Button variant="outline" size="sm" onClick={() => router.push("/instruction/courses")}>
              Voir tous
            </Button>
          </div>
          <ScrollArea className="h-[250px] sm:h-[300px] pr-4 overflow-hidden">
            {data.upcomingCourses.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => router.push(`/instruction/courses/${course.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>Aucun cours à venir</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator className="my-6" />

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium flex items-center">
              <Clock className="mr-2 h-5 w-5 text-green-500" />
              Historique des cours
            </h3>
            <Button variant="outline" size="sm" onClick={() => router.push("/instruction/courses?filter=completed")}>
              Voir l'historique
            </Button>
          </div>
          <ScrollArea className="h-[250px] sm:h-[300px] pr-4 overflow-hidden">
            {data.recentCourses.length > 0 ? (
              <div className="space-y-3">
                {data.recentCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onClick={() => router.push(`/instruction/courses/${course.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 mb-2 opacity-20" />
                <p>Aucun cours complété</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between bg-muted/30 pt-3">
        <Button onClick={() => router.push("/instruction/courses")}>
          <Calendar className="mr-2 h-4 w-4" />
          Gérer mes cours
        </Button>
      </CardFooter>
    </Card>
  )
}
