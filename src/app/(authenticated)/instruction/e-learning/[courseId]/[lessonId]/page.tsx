"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "@apollo/client"
import { GET_LESSON_CONTENT, COMPLETE_LESSON, GET_LESSON_PROGRESS } from "@/graphql/instruction"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Paperclip,
  BookOpen,
  FileText,
  Video,
  ChevronLeft,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { motion, AnimatePresence } from "framer-motion"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/components/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Lesson {
  id: number
  title: string
  description: string
  content: any
  video_url: string | null
  attachments: string[]
}

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
}

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const LessonSkeleton = () => (
  <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-8 w-[100px]" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="shadow-md overflow-hidden border-t-4 border-t-blue-500">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
            <Skeleton className="h-12 w-full" />
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
          </CardContent>
          <CardFooter className="flex justify-between p-4 bg-muted/30">
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-8 w-[100px]" />
          </CardFooter>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="shadow-md border-t-4 border-t-amber-500">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <Skeleton className="h-8 w-full" />
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
          <CardFooter className="p-4">
            <Skeleton className="h-8 w-full" />
          </CardFooter>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <Skeleton className="h-8 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
)

const ErrorMessage = ({ message }: { message: string }) => (
  <Alert variant="destructive">
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
)

export default function LessonPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const [isCompleting, setIsCompleting] = useState(false)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("video")
  const [hasVideo, setHasVideo] = useState(true)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error } = useQuery(GET_LESSON_CONTENT, {
    variables: {
      lessonId: Number.parseFloat(lessonId),
      userId: userId ? Number.parseFloat(userId) : 0,
    },
    skip: !lessonId || !userId,
  })

  const {
    data: progressData,
    loading: progressLoading,
    refetch: refetchProgress,
  } = useQuery(GET_LESSON_PROGRESS, {
    variables: {
      lessonId: Number.parseFloat(lessonId),
      userId: userId ? Number.parseFloat(userId) : 0,
    },
    skip: !lessonId || !userId,
  })

  const isCompleted = progressData?.getUserProgress === true

  const [completeLesson] = useMutation(COMPLETE_LESSON, {
    onCompleted: () => {
      refetchProgress()
      toast({
        title: "Leçon terminée",
        description: "Félicitations ! Vous avez terminé cette leçon.",
        variant: "default",
      })
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Impossible de marquer la leçon comme terminée: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    if (data?.getLessonContent) {
      setHasVideo(!!data.getLessonContent.video_url)
      if (!data.getLessonContent.video_url) {
        setActiveTab("content")
      }
    }
  }, [data])

  if (loading || progressLoading) return <LessonSkeleton />
  if (error) return <ErrorMessage message={error.message} />
  if (!data || !data.getLessonContent) return <ErrorMessage message="Aucune donnée de leçon disponible." />

  const lesson: Lesson = data.getLessonContent

  const handleComplete = async () => {
    if (isCompleted) {
      toast({
        title: "Déjà terminée",
        description: "Cette leçon a déjà été marquée comme terminée.",
        variant: "default",
      })
      return
    }

    setIsCompleting(true)
    try {
      await completeLesson({
        variables: {
          lessonId: Number.parseFloat(lessonId),
          userId: userId ? Number.parseFloat(userId) : 0,
        },
      })
    } catch (error) {
      console.error("Error completing lesson:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleNavigation = (direction: "prev" | "next") => {
    const newLessonId = direction === "prev" ? Number.parseInt(lessonId, 10) - 1 : Number.parseInt(lessonId, 10) + 1
    router.push(`/instruction/e-learning/${courseId}/${newLessonId}`)
  }

  const attachments = lesson.attachments || []

  const contentSections =
    lesson.content && typeof lesson.content === "object" && lesson.content.sections ? lesson.content.sections : []

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl"
    >
      {/* Header avec navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            asChild
            className="p-0 h-auto font-medium text-muted-foreground hover:text-foreground"
          >
            <Link href={`/instruction/e-learning/${courseId}`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Retour au cours
            </Link>
          </Button>
        </div>
      </div>

      {/* Message de réussite */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
          >
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
              <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-300">Félicitations !</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-400">
                Vous avez terminé cette leçon avec succès.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <motion.div variants={slideUp} className="lg:col-span-2 space-y-6">
          <Card className="shadow-md overflow-hidden border-t-4 border-t-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">{lesson.title}</h1>
                  <p className="text-muted-foreground mt-1">{lesson.description}</p>
                </div>
                {isCompleted && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 flex items-center gap-1 px-3 py-1">
                    <CheckCircle className="h-4 w-4" />
                    Terminé
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs
                defaultValue={hasVideo ? "video" : "content"}
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                  <TabsTrigger
                    value="video"
                    disabled={!lesson.video_url}
                    className="flex items-center gap-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30"
                  >
                    <Video className="h-4 w-4" />
                    Vidéo
                  </TabsTrigger>
                  <TabsTrigger
                    value="content"
                    className="flex items-center gap-2 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30"
                  >
                    <FileText className="h-4 w-4" />
                    Contenu
                  </TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="video" className="p-2">
                      {lesson.video_url ? (
                        <div className="aspect-video w-full">
                          <iframe
                            src={lesson.video_url.replace("watch?v=", "embed/")}
                            title={lesson.title}
                            className="w-full h-full"
                            allowFullScreen
                          ></iframe>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          <Video className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>Aucune vidéo disponible pour cette leçon.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="content" className="m-0 p-6">
                      {contentSections && contentSections.length > 0 ? (
                        <div className="prose dark:prose-invert max-w-none">
                          {contentSections.map((section: any, index: any) => (
                            <div key={index} className="mb-6">
                              <h3 className="text-xl font-semibold mb-2">{section.heading}</h3>
                              <p className="text-muted-foreground">{section.body}</p>
                            </div>
                          ))}
                        </div>
                      ) : typeof lesson.content === "string" ? (
                        <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                          <p>Aucun contenu structuré disponible pour cette leçon.</p>
                        </div>
                      )}
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 p-4 bg-muted/30">
              <Button
                variant="outline"
                onClick={() => handleNavigation("prev")}
                disabled={Number.parseInt(lessonId, 10) === 1}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Leçon précédente
              </Button>

              <Button onClick={() => handleNavigation("next")} className="w-full sm:w-auto">
                Leçon suivante
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Colonne latérale */}
        <motion.div variants={slideUp} className="space-y-6">
          {/* Carte des ressources */}
          <Card className="shadow-md border-t-4 border-t-amber-500">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-amber-500" />
                Ressources
              </h2>
            </CardHeader>

            <CardContent className="p-0">
              {attachments && attachments.length > 0 ? (
                <ScrollArea className="h-[250px] p-4">
                  <ul className="space-y-2">
                    {attachments.map((attachmentUrl, index) => {
                      const fileName = attachmentUrl.split("/").pop() || `Document ${index + 1}`

                      return (
                        <li key={index}>
                          <Button
                            variant="outline"
                            asChild
                            className="w-full justify-between group hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/30 dark:hover:text-amber-300 transition-colors"
                          >
                            <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4" />
                                <span className="ml-2 truncate max-w-[180px]">{fileName}</span>
                              </div>
                            </a>
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </ScrollArea>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <Paperclip className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Aucune ressource disponible pour cette leçon.</p>
                </div>
              )}
            </CardContent>

            <Separator />

            <CardFooter className="p-4">
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className={`w-full ${isCompleted ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isCompleting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Validation en cours...
                  </span>
                ) : isCompleted ? (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Leçon déjà terminée
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-5 w-5" />
                    Marquer comme terminée
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Carte de navigation du cours */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold">Navigation rapide</h2>
            </CardHeader>

            <CardContent className="space-y-3">
              <Button
                variant="outline"
                asChild
                className="w-full justify-start hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300 transition-colors"
              >
                <Link href={`/instruction/e-learning/${courseId}`}>
                  <BookOpen className="mr-2 h-4 w-4 text-blue-500" />
                  Sommaire du cours
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
