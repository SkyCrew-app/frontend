"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  ListChecks,
  Play,
  Star,
  Sparkles,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { InstructionSummary } from "@/interfaces/instruction"
import { motion } from "framer-motion"
import { CourseCard } from "./course-card"
import { ELearningCard } from "./e-learning-card"
import { lessonTotals, percentage } from "@/lib/learning-progress"
import { learningRoutes } from "@/lib/learning-navigation"

interface OverviewTabProps {
  data: InstructionSummary
  setActiveTab: (tab: string) => void
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const cardVariant = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100 },
  },
}

export function OverviewTab({ data }: OverviewTabProps) {
  const router = useRouter()
  // Counted from the e-learning courses: the summary's own lesson counter stays at zero.
  const lessons = lessonTotals(data.eLearningCourses)

  return (
    <div className="space-y-6 overflow-hidden">
      {/* Cartes de statistiques */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <motion.div variants={cardVariant}>
          <Card className="h-full hover:shadow-md transition-shadow border-t-4 border-t-primary flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-info" />
                Progression d'apprentissage
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Cours complétés</span>
                    <span className="font-medium">
                      {data.learningProgress.completedCourses}/{data.learningProgress.totalCourses}
                    </span>
                  </div>
                  <Progress
                    value={(data.learningProgress.completedCourses / data.learningProgress.totalCourses) * 100 || 0}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Leçons complétées</span>
                    <span className="font-medium">
                      {lessons.completed}/{lessons.total}
                    </span>
                  </div>
                  <Progress
                    value={percentage(lessons.completed, lessons.total)}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              <Button variant="ghost" size="sm" className="w-full group" onClick={() => router.push(learningRoutes.eLearning)}>
                <span>Voir tous les cours</span>
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={cardVariant}>
          <Card className="h-full hover:shadow-md transition-shadow border-t-4 border-t-warning">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-warning" />
                Évaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Score moyen</span>
                  <div className="flex items-center bg-warning/10 px-2 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-warning text-warning mr-1" />
                    <span className="font-medium">{data.evaluations.averageScore.toFixed(2)}%</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Évaluations complétées</span>
                  <Badge
                    variant="secondary"
                    className="bg-success/15 text-success"
                  >
                    {data.evaluations.completed}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Évaluations à venir</span>
                  <Badge
                    variant="outline"
                    className="border-info/30 text-info"
                  >
                    {data.evaluations.upcoming}
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              <Button variant="ghost" size="sm" className="w-full group" onClick={() => router.push(learningRoutes.evaluations)}>
                <span>Voir les évaluations</span>
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>

      {/* Prochains cours */}
      <motion.div variants={cardVariant} initial="hidden" animate="visible">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="bg-info/10 rounded-t-lg">
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Prochains cours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <h3 className="text-sm font-medium flex items-center">
                  <Sparkles className="mr-2 h-4 w-4 text-info" />À venir
                </h3>
                <Separator className="flex-1 mx-4" />
              </div>
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
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p>Aucun cours à venir</p>
                </div>
              )}

              <div className="flex items-center pt-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-success" />
                  Récemment complétés
                </h3>
                <Separator className="flex-1 mx-4" />
              </div>
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
                <div className="text-center py-4 text-muted-foreground">
                  <BookOpen className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  <p>Aucun cours récemment complété</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 pt-2">
            <Button variant="outline" className="w-full" onClick={() => router.push("/instruction/courses")}>
              <Calendar className="mr-2 h-4 w-4" />
              Voir tous mes cours
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Accès rapides */}
        <motion.div variants={cardVariant} initial="hidden" animate="visible" className="col-span-1">
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardHeader className="bg-primary/10 rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" />
                Accès rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-info/10 hover:text-info transition-colors"
                onClick={() => router.push(learningRoutes.eLearning)}
                disabled
              >
                <Play className="mr-2 h-4 w-4 text-info" />
                Continuer mon apprentissage
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-warning/10 hover:text-warning transition-colors"
                onClick={() => router.push(learningRoutes.evaluations)}
              >
                <ListChecks className="mr-2 h-4 w-4 text-warning" />
                Passer une évaluation
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-success/10 hover:text-success transition-colors"
                onClick={() => router.push("/instruction/courses")}
              >
                <Calendar className="mr-2 h-4 w-4 text-success" />
                Planifier un cours
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* E-Learning Courses */}
        <motion.div variants={cardVariant} initial="hidden" animate="visible" className="col-span-1 md:col-span-2">
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardHeader className="bg-info/10 rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-info" />
                Cours E-Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {data.eLearningCourses && data.eLearningCourses.length > 0 ? (
                  data.eLearningCourses
                    .slice(0, 3)
                    .map((course) => (
                      <ELearningCard
                        key={course.id}
                        course={course}
                        onClick={() => router.push(learningRoutes.eLearningCourse(course.id))}
                        compact
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
            <CardFooter className="bg-muted/30 pt-2">
              <Button variant="ghost" size="sm" className="w-full group" onClick={() => router.push(learningRoutes.eLearning)}>
                <span>Voir tous les cours e-learning</span>
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
