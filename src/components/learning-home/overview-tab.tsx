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

export function OverviewTab({ data, setActiveTab }: OverviewTabProps) {
  const router = useRouter()

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
          <Card className="h-full shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-blue-500 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-blue-500" />
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
                      {data.learningProgress.completedLessons}/{data.learningProgress.totalLessons}
                    </span>
                  </div>
                  <Progress
                    value={(data.learningProgress.completedLessons / data.learningProgress.totalLessons) * 100 || 0}
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              <Button variant="ghost" size="sm" className="w-full group" onClick={() => router.push("instruction/e-learning")}>
                <span>Voir tous les cours</span>
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={cardVariant}>
          <Card className="h-full shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-amber-500" />
                Évaluations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Score moyen</span>
                  <div className="flex items-center bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 mr-1" />
                    <span className="font-medium">{data.evaluations.averageScore.toFixed(2)}%</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm">Évaluations complétées</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    {data.evaluations.completed}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Évaluations à venir</span>
                  <Badge
                    variant="outline"
                    className="border-blue-200 text-blue-800 dark:border-blue-700 dark:text-blue-200"
                  >
                    {data.evaluations.upcoming}
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              <Button variant="ghost" size="sm" className="w-full group" onClick={() => router.push("instruction/evaluation")}>
                <span>Voir les évaluations</span>
                <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>

      {/* Prochains cours */}
      <motion.div variants={cardVariant} initial="hidden" animate="visible">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Prochains cours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <h3 className="text-sm font-medium flex items-center">
                  <Sparkles className="mr-2 h-4 w-4 text-blue-500" />À venir
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
                  <Clock className="mr-2 h-4 w-4 text-green-500" />
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
          <Card className="h-full shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-purple-500" />
                Accès rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 transition-colors"
                onClick={() => router.push("instruction/e-learning")}
                disabled
              >
                <Play className="mr-2 h-4 w-4 text-blue-500" />
                Continuer mon apprentissage
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300 transition-colors"
                onClick={() => router.push("instruction/evaluation")}
              >
                <ListChecks className="mr-2 h-4 w-4 text-amber-500" />
                Passer une évaluation
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30 dark:hover:text-green-300 transition-colors"
                onClick={() => router.push("/instruction/courses")}
              >
                <Calendar className="mr-2 h-4 w-4 text-green-500" />
                Planifier un cours
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* E-Learning Courses */}
        <motion.div variants={cardVariant} initial="hidden" animate="visible" className="col-span-1 md:col-span-2">
          <Card className="h-full shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-t-lg">
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="mr-2 h-5 w-5 text-indigo-500" />
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
                        onClick={() => router.push(`instruction/e-learning/course/${course.id}`)}
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
              <Button variant="ghost" size="sm" className="w-full group" onClick={() => router.push("instruction/e-learning")}>
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
