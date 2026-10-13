"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@apollo/client"
import { ArrowLeft, BookOpen, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useLessonCompletion } from "@/components/hooks/useLessonCompletion"
import { CourseOutline } from "@/components/e-learning/CourseOutline"
import { GET_COURSE_DETAILS, GET_COURSE_PROGRESS } from "@/graphql/instruction"
import { GET_USER_EVALUATION_RESULTS } from "@/graphql/evaluation"
import type { Course } from "@/interfaces/learning"
import { learningRoutes } from "@/lib/learning-navigation"
import {
  courseLessonIds,
  latestEvaluationAttempts,
  nextLessonId,
  percentage,
  type EvaluationAttempt,
} from "@/lib/learning-progress"

function CourseSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function CourseDetailPage() {
  const { t } = useTranslation("instruction")
  const params = useParams()
  const courseId = params.courseId as string
  const numericCourseId = Number.parseFloat(courseId)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null

  const { data, loading, error, refetch } = useQuery<{ getCourseById: Course | null }>(GET_COURSE_DETAILS, {
    variables: { id: numericCourseId, userId },
    skip: !courseId,
  })

  const { data: progressData } = useQuery<{ getCourseProgress: number }>(GET_COURSE_PROGRESS, {
    variables: { userId, courseId: numericCourseId },
    skip: !courseId || userId === null,
    fetchPolicy: "cache-and-network",
  })

  const { data: attemptsData } = useQuery<{ getUserEvaluationResults: EvaluationAttempt[] }>(
    GET_USER_EVALUATION_RESULTS,
    {
      variables: { userId },
      skip: userId === null,
      fetchPolicy: "cache-and-network",
    },
  )

  const course = data?.getCourseById ?? null
  const lessonIds = useMemo(() => courseLessonIds(course), [course])
  const {
    completedLessonIds,
    loading: completionLoading,
    unavailable: completionUnavailable,
  } = useLessonCompletion(userId, lessonIds)
  const latestAttempts = useMemo(
    () => latestEvaluationAttempts(attemptsData?.getUserEvaluationResults),
    [attemptsData],
  )

  const totalLessons = lessonIds.length
  const completedCount = lessonIds.filter((lessonId) => completedLessonIds.has(lessonId)).length
  // Lesson by lesson when it could be read, otherwise the figure of the course itself.
  const progressKnown = !completionUnavailable || progressData !== undefined
  const progressPercent = completionUnavailable
    ? Math.round(progressData?.getCourseProgress ?? 0)
    : percentage(completedCount, totalLessons)
  const completionPending = userId === null || completionLoading
  const resumeLessonId = nextLessonId(course, completedLessonIds)
  const resumeLabel =
    completedCount === 0
      ? t("eLearning.course.resumeStart")
      : completedCount >= totalLessons
        ? t("eLearning.course.resumeReview")
        : t("common:actions.continue")
  const evaluationCount = (course?.modules ?? []).reduce((count, module) => count + (module.evaluations?.length ?? 0), 0)

  const resumeButton =
    course && resumeLessonId !== null ? (
      completionPending ? (
        <Skeleton className="h-10 w-40" />
      ) : (
        <Button asChild>
          <Link href={learningRoutes.lesson(course.id, resumeLessonId)}>
            <Play className="h-4 w-4" />
            {resumeLabel}
          </Link>
        </Button>
      )
    ) : undefined

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 text-muted-foreground">
          <Link href={learningRoutes.eLearning}>
            <ArrowLeft className="h-4 w-4" />
            {t("eLearning.title")}
          </Link>
        </Button>
        <PageHeader
          className="mb-0"
          title={course?.title ?? t("eLearning.course.titleFallback")}
          description={course?.description || undefined}
          actions={resumeButton}
        />
      </div>

      {loading && !course ? (
        <CourseSkeleton />
      ) : !course ? (
        <ErrorState
          title={t("eLearning.course.notFound.title")}
          description={
            error
              ? t("eLearning.course.notFound.error")
              : t("eLearning.course.notFound.missing")
          }
          onRetry={() => refetch()}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {course.category && <Badge variant="neutral">{course.category}</Badge>}
            {course.required_license && <Badge variant="outline">
                {t("eLearning.course.requiredLicence", { licence: course.required_license })}
              </Badge>}
            <span className="text-sm text-muted-foreground">
              {[
                t("eLearning.course.modulesCount", { count: course.modules.length }),
                t("eLearning.course.lessonsCount", { count: totalLessons }),
                ...(evaluationCount > 0 ? [t("eLearning.course.evaluationsCount", { count: evaluationCount })] : []),
              ].join(" · ")}
            </span>
          </div>

          {totalLessons > 0 && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{t("eLearning.course.progressTitle")}</p>
                  {completionPending ? (
                    <Skeleton className="h-4 w-32" />
                  ) : !progressKnown ? (
                    <p className="text-sm text-muted-foreground">{t("eLearning.course.progressUnavailable")}</p>
                  ) : (
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {!completionUnavailable &&
                        `${t("eLearning.course.lessonsDone", { done: completedCount, total: totalLessons })} · `}
                      <span className="font-medium text-foreground">
                        {t("shared.percent", { value: progressPercent })}
                      </span>
                    </p>
                  )}
                </div>
                <Progress
                  value={completionPending || !progressKnown ? 0 : progressPercent}
                  className="h-2"
                  aria-label={t("eLearning.course.progressAria")}
                />
              </CardContent>
            </Card>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("eLearning.course.outlineTitle")}</h2>
            {course.modules.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title={t("eLearning.course.emptyTitle")}
                description={t("eLearning.course.emptyDescription")}
              />
            ) : (
              <CourseOutline
                // Opened on the module to resume once the completed lessons are known.
                key={completionPending ? "pending" : "ready"}
                course={course}
                completedLessonIds={completedLessonIds}
                resumeLessonId={resumeLessonId}
                latestAttempts={latestAttempts}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
