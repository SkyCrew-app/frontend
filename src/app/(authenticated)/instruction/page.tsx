"use client"

import { useMemo } from "react"
import { useQuery } from "@apollo/client"
import { Award, BookOpen, CalendarClock, ClipboardList } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { ErrorState } from "@/components/layout/ErrorState"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { UpcomingCoursesCard } from "@/components/learning-home/upcoming-courses-card"
import { ELearningProgressCard } from "@/components/learning-home/e-learning-progress-card"
import { EvaluationsCard, type EvaluationToTake } from "@/components/learning-home/evaluations-card"
import { upcomingCourses, type InstructionCourse } from "@/components/courses/course-helpers"
import { GET_COURSE_BY_USER_ID } from "@/graphql/course"
import { GET_EVALUATIONS, GET_USER_EVALUATION_RESULTS, GET_USER_INSTRUCTION_SUMMARY } from "@/graphql/evaluation"
import type { InstructionSummary } from "@/interfaces/instruction"
import { formatDate } from "@/lib/format"
import {
  averageScore,
  evaluationsToTake,
  latestEvaluationAttempts,
  lessonTotals,
  percentage,
  type EvaluationAttempt,
} from "@/lib/learning-progress"

function OverviewSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function InstructionHome() {
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null
  const skip = userId === null

  // The progress changes on other pages: always ask again on arrival.
  const summaryQuery = useQuery<{ getUserInstructionSummary: InstructionSummary }>(GET_USER_INSTRUCTION_SUMMARY, {
    variables: { userId },
    skip,
    fetchPolicy: "cache-and-network",
  })
  const coursesQuery = useQuery<{ getCoursesByUserId: InstructionCourse[] }>(GET_COURSE_BY_USER_ID, {
    variables: { userId },
    skip,
    fetchPolicy: "cache-and-network",
  })
  const evaluationsQuery = useQuery<{ getEvaluations: EvaluationToTake[] }>(GET_EVALUATIONS, { skip })
  const attemptsQuery = useQuery<{ getUserEvaluationResults: EvaluationAttempt[] }>(GET_USER_EVALUATION_RESULTS, {
    variables: { userId },
    skip,
    fetchPolicy: "cache-and-network",
  })

  const summary = summaryQuery.data?.getUserInstructionSummary
  const nextCourses = useMemo(
    () => upcomingCourses(coursesQuery.data?.getCoursesByUserId),
    [coursesQuery.data],
  )
  const latestAttempts = useMemo(
    () => latestEvaluationAttempts(attemptsQuery.data?.getUserEvaluationResults),
    [attemptsQuery.data],
  )
  const toTake = useMemo(
    () => evaluationsToTake(evaluationsQuery.data?.getEvaluations, latestAttempts),
    [evaluationsQuery.data, latestAttempts],
  )

  const loading =
    skip ||
    (summaryQuery.loading && !summary) ||
    (coursesQuery.loading && !coursesQuery.data) ||
    (evaluationsQuery.loading && !evaluationsQuery.data) ||
    (attemptsQuery.loading && !attemptsQuery.data)

  const lessons = lessonTotals(summary?.eLearningCourses)
  const evaluationsError = Boolean(evaluationsQuery.error || attemptsQuery.error)
  const passedCount = [...latestAttempts.values()].filter((attempt) => attempt.passed).length
  const average = averageScore(latestAttempts.values())

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title="Centre d'instruction"
        description="Vos prochains cours, votre progression en ligne et vos évaluations."
      />

      {loading ? (
        <OverviewSkeleton />
      ) : summaryQuery.error && !summary ? (
        <ErrorState onRetry={() => summaryQuery.refetch()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Leçons terminées"
              value={`${lessons.completed} / ${lessons.total}`}
              hint={lessons.total > 0 ? `${percentage(lessons.completed, lessons.total)} % des cours en ligne` : "Aucune leçon publiée"}
              icon={BookOpen}
              tone="primary"
            />
            <StatCard
              label="Cours à venir"
              value={coursesQuery.error ? "—" : nextCourses.length}
              hint={nextCourses[0] ? `Prochain le ${formatDate(nextCourses[0].startTime)}` : "Aucun cours planifié"}
              icon={CalendarClock}
              tone="info"
            />
            <StatCard
              label="Évaluations à passer"
              value={evaluationsError ? "—" : toTake.length}
              hint={`${passedCount} réussie${passedCount > 1 ? "s" : ""}`}
              icon={ClipboardList}
              tone="warning"
            />
            <StatCard
              label="Score moyen"
              value={average === null ? "—" : `${average} %`}
              hint="Sur vos évaluations passées"
              icon={Award}
              tone="success"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingCoursesCard
              courses={nextCourses.slice(0, 5)}
              userId={userId}
              error={Boolean(coursesQuery.error) && !coursesQuery.data}
              onRetry={() => coursesQuery.refetch()}
            />
            <ELearningProgressCard courses={summary?.eLearningCourses ?? []} />
            <EvaluationsCard
              evaluations={toTake}
              latestAttempts={latestAttempts}
              error={evaluationsError}
              onRetry={() => {
                evaluationsQuery.refetch()
                attemptsQuery.refetch()
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
