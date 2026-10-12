"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, FileText, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { lessonHtml, lessonSections } from "@/components/e-learning/lesson-content"
import { COMPLETE_LESSON, GET_COURSE_DETAILS, GET_LESSON_CONTENT, GET_LESSON_PROGRESS } from "@/graphql/instruction"
import { adjacentLessons, learningRoutes, videoEmbedUrl } from "@/lib/learning-navigation"

interface Lesson {
  id: number
  title: string
  description: string | null
  content: unknown
  video_url: string | null
  attachments: string[] | null
}

// "guide-meteo.pdf" out of the address of an attachment.
const attachmentName = (url: string, index: number) => {
  const last = url.split(/[?#]/)[0].split("/").filter(Boolean).pop()
  if (!last) return `Document ${index + 1}`
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

function LessonSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}

export default function LessonPage() {
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const numericLessonId = Number.parseFloat(lessonId)
  const [isCompleting, setIsCompleting] = useState(false)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const { data, loading, error, refetch } = useQuery<{ getLessonContent: Lesson | null }>(GET_LESSON_CONTENT, {
    variables: { lessonId: numericLessonId, userId: userId ?? 0 },
    skip: !lessonId || userId === null,
  })

  const {
    data: progressData,
    loading: progressLoading,
    refetch: refetchProgress,
  } = useQuery<{ getUserProgress: boolean | null }>(GET_LESSON_PROGRESS, {
    variables: { lessonId: numericLessonId, userId: userId ?? 0 },
    skip: !lessonId || userId === null,
  })

  const isCompleted = progressData?.getUserProgress === true

  // Same variables as the course page, so its outline is read from the cache.
  const { data: courseData } = useQuery(GET_COURSE_DETAILS, {
    variables: { id: Number.parseFloat(courseId), userId },
    skip: !courseId || userId === null,
  })
  const course = courseData?.getCourseById
  const { previous, next, position, total } = adjacentLessons(course, lessonId)
  const isLastLesson = !!course && next === null

  const [completeLesson] = useMutation(COMPLETE_LESSON)

  const handleComplete = async () => {
    if (isCompleted || userId === null) return
    setIsCompleting(true)
    try {
      await completeLesson({ variables: { lessonId: numericLessonId, userId } })
      await refetchProgress()
      toast({ title: "Leçon terminée", description: "Votre progression a été enregistrée." })
    } catch {
      toast({
        title: "Leçon non enregistrée",
        description: "La leçon n'a pas pu être marquée comme terminée. Réessayez dans un instant.",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }

  const lesson = data?.getLessonContent ?? null
  const isLoading = userId === null || loading || progressLoading
  const sections = lessonSections(lesson?.content)
  const html = lessonHtml(lesson?.content)
  const videoUrl = videoEmbedUrl(lesson?.video_url)
  const attachments = lesson?.attachments ?? []
  const courseHref = learningRoutes.eLearningCourse(courseId)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 max-w-full text-muted-foreground">
          <Link href={courseHref}>
            <ArrowLeft className="h-4 w-4" />
            <span className="truncate">{course?.title ?? "Retour au cours"}</span>
          </Link>
        </Button>
        <PageHeader
          className="mb-0"
          title={lesson?.title ?? "Leçon"}
          description={lesson?.description || undefined}
          actions={
            lesson && isCompleted ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Terminée
              </Badge>
            ) : undefined
          }
        />
        {lesson && position !== null && (
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">
            Leçon {position} sur {total}
          </p>
        )}
      </div>

      {isLoading && !lesson ? (
        <LessonSkeleton />
      ) : !lesson ? (
        <ErrorState
          title="Leçon introuvable"
          description={
            error
              ? "Cette leçon n'a pas pu être chargée. Vérifiez votre connexion puis réessayez."
              : "Cette leçon n'existe pas ou n'est plus publiée."
          }
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {videoUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border bg-muted">
              <iframe
                src={videoUrl}
                title={`Vidéo : ${lesson.title}`}
                className="h-full w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {sections.length > 0 ? (
            <Card>
              <CardContent className="space-y-6 p-6">
                {sections.map((section, index) => (
                  <section key={index} className="space-y-2">
                    {section.heading && <h2 className="text-lg font-semibold">{section.heading}</h2>}
                    {section.body && <p className="whitespace-pre-line text-sm leading-relaxed">{section.body}</p>}
                  </section>
                ))}
              </CardContent>
            </Card>
          ) : html ? (
            <Card>
              <CardContent className="p-6">
                {/* Rich text written by an administrator in the lesson editor. */}
                <div
                  className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-blockquote:text-muted-foreground prose-code:text-foreground prose-img:rounded-lg"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </CardContent>
            </Card>
          ) : (
            !videoUrl && (
              <EmptyState
                icon={FileText}
                title="Cette leçon n'a pas encore de contenu"
                description="Le texte de la leçon apparaîtra ici dès sa publication."
              />
            )
          )}

          {attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ressources</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {attachments.map((url, index) => (
                    <li key={`${url}-${index}`}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-[2.75rem] items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate">{attachmentName(url, index)}</span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Ouvre un nouvel onglet" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <nav
            className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
            aria-label="Navigation entre les leçons"
          >
            {previous !== null ? (
              <Button variant="outline" asChild>
                <Link href={learningRoutes.lesson(courseId, previous)}>
                  <ArrowLeft className="h-4 w-4" />
                  Leçon précédente
                </Link>
              </Button>
            ) : (
              // Keeps the actions on the right on the first lesson.
              <span className="hidden sm:block" />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {!isCompleted && (
                <Button onClick={handleComplete} disabled={isCompleting}>
                  {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Marquer comme terminée
                </Button>
              )}
              {isLastLesson ? (
                // Nothing after the last lesson: once it is done, the way on is the course.
                isCompleted && (
                  <Button asChild>
                    <Link href={courseHref}>
                      Revenir au cours
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )
              ) : (
                next !== null && (
                  <Button variant={isCompleted ? "default" : "outline"} asChild>
                    <Link href={learningRoutes.lesson(courseId, next)}>
                      Leçon suivante
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  )
}
