"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { GET_COURSE_DETAILS, GET_COURSE_PROGRESS } from "@/graphql/instruction"
import { GET_USER_EVALUATION_RESULTS } from "@/graphql/evaluation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useParams, useRouter } from "next/navigation"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useLessonCompletion } from "@/components/hooks/useLessonCompletion"
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  FileText,
  GraduationCap,
  Info,
  ListChecks,
  PlayCircle,
  Play,
  ClipboardCheck,
} from "lucide-react"
import Link from "next/link"
import type { Course } from "@/interfaces/learning"
import {
  courseLessonIds,
  latestEvaluationAttempts,
  moduleProgress,
  nextLessonId,
  stableIndex,
  type EvaluationAttempt,
} from "@/lib/learning-progress"

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
}

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const CourseDetailSkeleton = () => (
  <div className="space-y-8">
    <div className="space-y-4">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

const aviationImages = [
  "https://plus.unsplash.com/premium_photo-1679830513873-5f9163fcc04a?q=80&w=2727&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1499063078284-f78f7d89616a?q=80&w=2728&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1679830513886-e09cd6dc3137?q=80&w=2727&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1663039978729-6f6775725f89?q=80&w=2669&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1524592714635-d77511a4834d?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1663047758536-f23d444440a7?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1561101904-da649fcbf03f?q=80&w=2787&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1515424408177-7b2c508d6114?q=80&w=2806&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://plus.unsplash.com/premium_photo-1664302651203-197504f4d152?q=80&w=2668&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1641335403266-03bef889e60d?q=80&w=2748&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1562368370-cff10978a647?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
]

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const numericCourseId = Number.parseFloat(courseId)
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>("modules")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const { data, loading, error } = useQuery<{ getCourseById: Course }>(GET_COURSE_DETAILS, {
    variables: { id: numericCourseId, userId },
    skip: !courseId,
  })

  const { data: progressData, error: progressError } = useQuery<{ getCourseProgress: number }>(
    GET_COURSE_PROGRESS,
    {
      variables: { userId, courseId: numericCourseId },
      skip: !courseId || userId === null,
    },
  )

  const { data: attemptsData } = useQuery<{ getUserEvaluationResults: EvaluationAttempt[] }>(
    GET_USER_EVALUATION_RESULTS,
    {
      variables: { userId },
      skip: userId === null,
    },
  )

  const course = data?.getCourseById ?? null
  const lessonIds = useMemo(() => courseLessonIds(course), [course])
  const {
    completedLessonIds,
    loading: completionLoading,
    unavailable: completionUnavailable,
  } = useLessonCompletion(userId, lessonIds)
  const attempts = useMemo(
    () => latestEvaluationAttempts(attemptsData?.getUserEvaluationResults),
    [attemptsData],
  )

  useEffect(() => {
    if (course && course.modules.length > 0 && !selectedModule) {
      setSelectedModule(course.modules[0].id)
    }
  }, [course, selectedModule])

  if (loading && !course) return <CourseDetailSkeleton />
  if (error)
    return (
      <div className="w-full">
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <Info className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Erreur</h2>
            </div>
            <p className="text-destructive">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/instruction/e-learning")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Retour aux cours
            </Button>
          </CardContent>
        </Card>
      </div>
    )

  if (!course) return <CourseDetailSkeleton />

  const currentModule = course.modules.find((m) => m.id === selectedModule) || course.modules[0]
  const totalLessons = lessonIds.length
  const courseProgress = progressData ? Math.round(progressData.getCourseProgress) : null
  const progressLabel = courseProgress !== null ? `${courseProgress}%` : progressError ? "Indisponible" : "…"
  const coverImage = aviationImages[stableIndex(course.id, aviationImages.length)]
  const isLessonCompleted = (lesson: { id: number }) => completedLessonIds.has(lesson.id)
  const resumeLessonId = nextLessonId(course, completedLessonIds)
  const currentModuleProgress = currentModule ? moduleProgress(currentModule.lessons, completedLessonIds) : 0

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="space-y-6">
      {/* Header avec navigation et progression */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <Button variant="ghost" asChild className="p-0 h-auto font-medium text-muted-foreground hover:text-foreground">
          <Link href="/instruction/e-learning">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour aux cours
          </Link>
        </Button>

        <div className="flex flex-col items-end gap-1 w-full md:w-1/3">
          <div className="flex justify-between w-full text-sm">
            <span>Progression du cours</span>
            <span className="font-medium">{progressLabel}</span>
          </div>
          <Progress value={courseProgress ?? 0} className="w-full h-2" />
        </div>
      </div>

      {/* En-tête du cours */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: coverImage
              ? `url(${coverImage})`
              : "linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))",
            opacity: 0.2,
          }}
        />
        <div className="relative bg-black/30 p-6 md:p-8 text-white">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-2xl font-semibold tracking-tight">{course.title}</h1>
            <p className="mb-4 text-white/80">{course.description}</p>

            <div className="flex flex-wrap gap-3 mb-4">
              <Badge className="bg-info hover:bg-info/90 text-info-foreground">{course.category}</Badge>
              {course.required_license && (
                <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Licence requise: {course.required_license}
                </Badge>
              )}
              <Badge variant="outline" className="border-white/30 text-white">
                <FileText className="mr-1 h-3 w-3" />
                {totalLessons} leçons
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="bg-info hover:bg-info/90"
                disabled={resumeLessonId === null}
                onClick={() => router.push(`/instruction/e-learning/${course.id}/${resumeLessonId}`)}
              >
                <Play className="mr-2 h-4 w-4" />
                {completedLessonIds.size > 0 ? "Continuer le cours" : "Commencer le cours"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne de gauche - Modules et informations */}
        <div className="space-y-6">
          <Card >
            <CardHeader className="pb-2">
              <h2 className="text-xl font-semibold flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-info" />
                Contenu du cours
              </h2>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="modules" className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Modules</span>
                  </TabsTrigger>
                  <TabsTrigger value="info" className="flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    <span className="hidden sm:inline">Informations</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="modules" className="pt-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full"
                    value={selectedModule?.toString() || undefined}
                  >
                    {course.modules.map((module, index) => (
                      <AccordionItem key={module.id} value={module.id.toString()}>
                        <AccordionTrigger
                          className="hover:bg-muted/50 px-3 rounded-lg"
                          onClick={() => setSelectedModule(module.id)}
                        >
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center">
                              <div className="bg-info/15 text-info w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs font-medium">
                                {index + 1}
                              </div>
                              <span className="text-left">{module.title}</span>
                            </div>
                            {moduleProgress(module.lessons, completedLessonIds) === 100 && (
                              <CheckCircle className="h-4 w-4 text-success ml-2 shrink-0" />
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-11 pr-2">
                          <div className="space-y-1 py-1">
                            {module.lessons.map((lesson) => (
                              <Button
                                key={lesson.id}
                                variant="ghost"
                                className={`w-full justify-start text-sm h-auto py-2 ${
                                  isLessonCompleted(lesson)
                                    ? "text-success font-medium"
                                    : "text-muted-foreground"
                                }`}
                                onClick={() =>
                                  router.push(`/instruction/e-learning/${course.id}/${lesson.id}`)
                                }
                              >
                                {isLessonCompleted(lesson) ? (
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                ) : (
                                  <PlayCircle className="mr-2 h-4 w-4 text-info" />
                                )}
                                <span className="truncate">{lesson.title}</span>
                              </Button>
                            ))}

                            {/* Afficher les évaluations s'il y en a */}
                            {module.evaluations && module.evaluations.length > 0 && (
                              <>
                                <Separator className="my-2" />
                                <p className="text-xs text-muted-foreground pl-2 py-1">Évaluations</p>
                                {module.evaluations.map((evaluation, evalIndex) => (
                                  <Button
                                    key={evaluation.id}
                                    variant="ghost"
                                    className={`w-full justify-start text-sm h-auto py-2 ${
                                      attempts.has(evaluation.id)
                                        ? "text-warning font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                    onClick={() => router.push(`/instruction/evaluation/${evaluation.id}`)}
                                  >
                                    <ClipboardCheck className="mr-2 h-4 w-4 text-warning" />
                                    <span className="truncate">Évaluation de module {evalIndex + 1}</span>
                                  </Button>
                                ))}
                              </>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>

                <TabsContent value="info" className="pt-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Détails du cours</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Catégorie</span>
                        <span>{course.category}</span>
                      </li>
                      {course.required_license && (
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Licence requise</span>
                          <span>{course.required_license}</span>
                        </li>
                      )}
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Nombre de leçons</span>
                        <span>{totalLessons}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Progression</span>
                        <span>{progressLabel}</span>
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">Structure du cours</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Modules</span>
                        <span>{course.modules.length}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Évaluations</span>
                        <span>
                          {course.modules.reduce(
                            (total, module) => total + (module.evaluations?.length || 0),
                            0,
                          )}
                        </span>
                      </li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Colonne de droite - Contenu du module */}
        <motion.div variants={slideUp} className="lg:col-span-2 space-y-6">
          <Card >
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{currentModule.title}</h2>
                  <p className="text-muted-foreground text-sm">{currentModule.description}</p>
                </div>
                <Badge className="bg-info/15 text-info">
                  {currentModule.lessons.length} leçons
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentModule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-4">
                    {currentModule.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className={`p-4 rounded-lg border ${
                          isLessonCompleted(lesson)
                            ? "bg-success/10 border-success/30"
                            : "bg-card dark:bg-card hover:bg-muted/50 dark:hover:bg-muted/10"
                        } transition-colors`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isLessonCompleted(lesson)
                                  ? "bg-success/15 text-success"
                                  : "bg-info/15 text-info"
                              }`}
                            >
                              {isLessonCompleted(lesson) ? <CheckCircle className="h-5 w-5" /> : <span>{index + 1}</span>}
                            </div>
                          </div>
                          <div className="flex-grow">
                            <h3 className="font-medium">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              variant={isLessonCompleted(lesson) ? "outline" : "default"}
                              className={
                                isLessonCompleted(lesson)
                                  ? "border-success/30 text-success hover:bg-success/10"
                                  : ""
                              }
                              onClick={() => router.push(`/instruction/e-learning/${course.id}/${lesson.id}`)}
                            >
                              {isLessonCompleted(lesson) ? (
                                <>
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Revoir
                                </>
                              ) : (
                                <>
                                  <Play className="mr-1 h-4 w-4" />
                                  Commencer
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Afficher les évaluations s'il y en a */}
                    {currentModule.evaluations && currentModule.evaluations.length > 0 && (
                      <>
                        <Separator className="my-2" />
                        <h3 className="text-lg font-medium flex items-center">
                          <ClipboardCheck className="mr-2 h-5 w-5 text-warning" />
                          Évaluations du module
                        </h3>

                        {currentModule.evaluations.map((evaluation, evalIndex) => {
                          const attempt = attempts.get(evaluation.id)
                          const passed = attempt?.passed === true

                          return (
                          <div
                            key={evaluation.id}
                            className={`p-4 rounded-lg border ${
                              attempt
                                ? "bg-warning/10 border-warning/30"
                                : "bg-card dark:bg-card hover:bg-muted/50 dark:hover:bg-muted/10 border-warning/30"
                            } transition-colors`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    attempt
                                      ? "bg-warning/15 text-warning"
                                      : "bg-warning/10 text-warning"
                                  }`}
                                >
                                  <ClipboardCheck className="h-5 w-5" />
                                </div>
                              </div>
                              <div className="flex-grow">
                                <h3 className="font-medium">Évaluation de module {evalIndex + 1}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Score minimum requis: {evaluation.pass_score}%
                                </p>
                                {attempt && (
                                  <div className="flex items-center mt-2 text-xs font-medium">
                                    <span
                                      className={
                                        passed ? "text-success" : "text-destructive"
                                      }
                                    >
                                      {attempt.score !== null
                                        ? `Votre score: ${Math.round(attempt.score)}%`
                                        : passed
                                          ? "Évaluation réussie"
                                          : "Évaluation non réussie"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant={passed ? "outline" : "default"}
                                  className={
                                    passed
                                      ? "border-warning/30 text-warning hover:bg-warning/10"
                                      : "bg-warning hover:bg-warning/90 text-warning-foreground"
                                  }
                                  onClick={() =>
                                    router.push(
                                      passed ? "/instruction/evaluation" : `/instruction/evaluation/${evaluation.id}`,
                                    )
                                  }
                                >
                                  {passed ? (
                                    <>
                                      <CheckCircle className="mr-1 h-4 w-4" />
                                      Voir résultats
                                    </>
                                  ) : (
                                    <>
                                      <ClipboardCheck className="mr-1 h-4 w-4" />
                                      {attempt ? "Repasser l'évaluation" : "Passer l'évaluation"}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <div className="text-sm text-muted-foreground">
                <GraduationCap className="inline-block mr-1 h-4 w-4" />
                {completionUnavailable
                  ? "Progression du module indisponible"
                  : completionLoading
                    ? "Progression du module: …"
                    : `Progression du module: ${currentModuleProgress}%`}
              </div>
              <Progress value={currentModuleProgress} className="w-1/2 h-2" />
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
