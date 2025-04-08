"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { GET_COURSE_DETAILS } from "@/graphql/instruction"
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
import { motion, AnimatePresence } from "framer-motion"
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  Clock,
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

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
}

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const CourseDetailSkeleton = () => (
  <div className="container mx-auto p-4 space-y-8">
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

const getRandomAviationImage = () => {
  const randomIndex = Math.floor(Math.random() * aviationImages.length)
  return aviationImages[randomIndex]
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [selectedTab, setSelectedTab] = useState<string>("modules")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const [processedCourse, setProcessedCourse] = useState<Course | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error } = useQuery<{ getCourseById: Course }>(GET_COURSE_DETAILS, {
    variables: { id: Number.parseFloat(courseId), userId: userId ? Number.parseFloat(userId) : null },
    skip: !courseId,
  })

  useEffect(() => {
    if (data?.getCourseById) {
      const course = data.getCourseById

      const totalLessons = course.modules.reduce((total, module) => total + module.lessons.length, 0)

      const completedLessons = Math.floor(totalLessons * 0.3)

      const modulesWithProgress = course.modules.map((module, index) => {
        const lessons = module.lessons.map((lesson, i) => ({
          ...lesson,
          completed: i < index + 1,
          duration: 15 + i * 5,
        }))

        const evaluations = module.evaluations
          ? module.evaluations.map((evaluation, i) => ({
              ...evaluation,
              completed: index > 1,
              score: index > 1 ? Math.floor(70 + Math.random() * 30) : undefined,
            }))
          : []

        const moduleProgress =
          lessons.length > 0 ? (lessons.filter((l) => l.completed).length / lessons.length) * 100 : 0

        return {
          ...module,
          lessons,
          evaluations,
          progress: moduleProgress,
        }
      })

      setProcessedCourse({
        ...course,
        modules: modulesWithProgress,
        totalLessons,
        totalDuration: totalLessons * 20,
        progress: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
        coverImage: getRandomAviationImage(),
      })
    }
  }, [data])

  useEffect(() => {
    if (((processedCourse?.modules) ?? []).length > 0 && !selectedModule) {
      setSelectedModule(processedCourse!.modules[0].id)
    }
  }, [processedCourse, selectedModule])

  if (loading) return <CourseDetailSkeleton />
  if (error)
    return (
      <div className="container mx-auto p-4">
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <Info className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Erreur</h2>
            </div>
            <p className="text-red-600">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/instruction/e-learning")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Retour aux cours
            </Button>
          </CardContent>
        </Card>
      </div>
    )

  if (!processedCourse) return <CourseDetailSkeleton />

  const currentModule = processedCourse.modules.find((m) => m.id === selectedModule) || processedCourse.modules[0]

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}min` : ""}`
    }
    return `${mins} min`
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="container mx-auto p-4 space-y-6">
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
            <span className="font-medium">{Math.round(processedCourse.progress || 0)}%</span>
          </div>
          <Progress value={processedCourse.progress} className="w-full h-2" />
        </div>
      </div>

      {/* En-tête du cours */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: processedCourse.coverImage
              ? `url(${processedCourse.coverImage})`
              : "linear-gradient(to right, rgb(59, 130, 246), rgb(37, 99, 235))",
            opacity: 0.2,
          }}
        />
        <div className="relative bg-black/30 p-6 md:p-8 text-white">
          <div className="max-w-3xl">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{processedCourse.title}</h1>
            <p className="mb-4 text-white/80">{processedCourse.description}</p>

            <div className="flex flex-wrap gap-3 mb-4">
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{processedCourse.category}</Badge>
              {processedCourse.required_license && (
                <Badge className="bg-purple-600 hover:bg-purple-700 text-white">
                  Licence requise: {processedCourse.required_license}
                </Badge>
              )}
              <Badge variant="outline" className="border-white/30 text-white">
                <Clock className="mr-1 h-3 w-3" />
                {formatDuration(processedCourse.totalDuration || 0)}
              </Badge>
              <Badge variant="outline" className="border-white/30 text-white">
                <FileText className="mr-1 h-3 w-3" />
                {processedCourse.totalLessons} leçons
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Play className="mr-2 h-4 w-4" />
                Continuer le cours
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne de gauche - Modules et informations */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <h2 className="text-xl font-semibold flex items-center">
                <ListChecks className="mr-2 h-5 w-5 text-blue-500" />
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
                    {processedCourse.modules.map((module, index) => (
                      <AccordionItem key={module.id} value={module.id.toString()}>
                        <AccordionTrigger
                          className="hover:bg-muted/50 px-3 rounded-lg"
                          onClick={() => setSelectedModule(module.id)}
                        >
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center">
                              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs font-medium">
                                {index + 1}
                              </div>
                              <span className="text-left">{module.title}</span>
                            </div>
                            {module.progress === 100 && (
                              <CheckCircle className="h-4 w-4 text-green-500 ml-2 shrink-0" />
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
                                  lesson.completed
                                    ? "text-green-600 dark:text-green-400 font-medium"
                                    : "text-muted-foreground"
                                }`}
                                onClick={() =>
                                  router.push(`/instruction/e-learning/${processedCourse.id}/${lesson.id}`)
                                }
                              >
                                {lesson.completed ? (
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                ) : (
                                  <PlayCircle className="mr-2 h-4 w-4 text-blue-500" />
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
                                      evaluation.completed
                                        ? "text-amber-600 dark:text-amber-400 font-medium"
                                        : "text-muted-foreground"
                                    }`}
                                    onClick={() => router.push(`/instruction/evaluations/${evaluation.id}`)}
                                  >
                                    <ClipboardCheck className="mr-2 h-4 w-4 text-amber-500" />
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
                        <span>{processedCourse.category}</span>
                      </li>
                      {processedCourse.required_license && (
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Licence requise</span>
                          <span>{processedCourse.required_license}</span>
                        </li>
                      )}
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Durée totale</span>
                        <span>{formatDuration(processedCourse.totalDuration || 0)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Nombre de leçons</span>
                        <span>{processedCourse.totalLessons}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Progression</span>
                        <span>{Math.round(processedCourse.progress || 0)}%</span>
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-sm font-medium mb-2">Structure du cours</h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Modules</span>
                        <span>{processedCourse.modules.length}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Évaluations</span>
                        <span>
                          {processedCourse.modules.reduce(
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
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{currentModule.title}</h2>
                  <p className="text-muted-foreground text-sm">{currentModule.description}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
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
                          lesson.completed
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30"
                            : "bg-white dark:bg-card hover:bg-muted/50 dark:hover:bg-muted/10"
                        } transition-colors`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                lesson.completed
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              }`}
                            >
                              {lesson.completed ? <CheckCircle className="h-5 w-5" /> : <span>{index + 1}</span>}
                            </div>
                          </div>
                          <div className="flex-grow">
                            <h3 className="font-medium">{lesson.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
                            {lesson.duration && (
                              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3 mr-1"/>
                                <span>{formatDuration(lesson.duration)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              variant={lesson.completed ? "outline" : "default"}
                              className={
                                lesson.completed
                                  ? "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
                                  : ""
                              }
                              onClick={() => router.push(`/instruction/e-learning/${processedCourse.id}/${lesson.id}`)}
                            >
                              {lesson.completed ? (
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
                          <ClipboardCheck className="mr-2 h-5 w-5 text-amber-500" />
                          Évaluations du module
                        </h3>

                        {currentModule.evaluations.map((evaluation, evalIndex) => (
                          <div
                            key={evaluation.id}
                            className={`p-4 rounded-lg border ${
                              evaluation.completed
                                ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30"
                                : "bg-white dark:bg-card hover:bg-muted/50 dark:hover:bg-muted/10 border-amber-100"
                            } transition-colors`}
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    evaluation.completed
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
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
                                {evaluation.completed && evaluation.score && (
                                  <div className="flex items-center mt-2 text-xs font-medium">
                                    <span
                                      className={
                                        evaluation.score >= evaluation.pass_score
                                          ? "text-green-600 dark:text-green-400"
                                          : "text-red-600 dark:text-red-400"
                                      }
                                    >
                                      Votre score: {evaluation.score}%
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                <Button
                                  size="sm"
                                  variant={evaluation.completed ? "outline" : "default"}
                                  className={
                                    evaluation.completed
                                      ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                      : "bg-amber-600 hover:bg-amber-700 text-white"
                                  }
                                  onClick={() => router.push(`/instruction/evaluations/${evaluation.id}`)}
                                >
                                  {evaluation.completed ? (
                                    <>
                                      <CheckCircle className="mr-1 h-4 w-4" />
                                      Voir résultats
                                    </>
                                  ) : (
                                    <>
                                      <ClipboardCheck className="mr-1 h-4 w-4" />
                                      Passer l'évaluation
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-between">
              <div className="text-sm text-muted-foreground">
                <GraduationCap className="inline-block mr-1 h-4 w-4" />
                Progression du module: {Math.round(currentModule.progress || 0)}%
              </div>
              <Progress value={currentModule.progress} className="w-1/2 h-2" />
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
