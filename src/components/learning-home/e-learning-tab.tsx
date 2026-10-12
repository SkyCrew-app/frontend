"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import type { InstructionSummary } from "@/interfaces/instruction"
import { ELearningCard } from "./e-learning-card"
import { learningRoutes } from "@/lib/learning-navigation"

interface ELearningTabProps {
  data: InstructionSummary
}

export function ELearningTab({ data }: ELearningTabProps) {
  const router = useRouter()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="bg-info/10 rounded-t-lg">
        <CardTitle>Mes cours E-Learning</CardTitle>
        <CardDescription>Suivez votre progression dans les cours en ligne</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {data.eLearningCourses && data.eLearningCourses.length > 0 ? (
            data.eLearningCourses.map((course) => (
              <ELearningCard
                key={course.id}
                course={course}
                onClick={() => router.push(learningRoutes.eLearningCourse(course.id))}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-2 opacity-20" />
              <p>Aucun cours e-learning disponible</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 pt-3">
        <Button className="w-full" onClick={() => router.push(learningRoutes.eLearning)}>
          <BookOpen className="mr-2 h-4 w-4" />
          Explorer tous les cours
        </Button>
      </CardFooter>
    </Card>
  )
}
