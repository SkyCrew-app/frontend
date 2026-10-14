import { useMemo } from "react"
import { useQuery } from "@apollo/client"
import { GET_COMPLETED_LESSONS } from "@/graphql/instruction"

interface LessonCompletion {
  completedLessonIds: Set<number>
  loading: boolean
  // True when the completion of the lessons could not be read.
  unavailable: boolean
}

// Which of the given lessons the user has completed: one request for the whole list.
export function useLessonCompletion(userId: number | null, lessonIds: number[]): LessonCompletion {
  const skip = userId === null || lessonIds.length === 0
  const { data, loading, error } = useQuery<{ getCompletedLessons: number[] }>(GET_COMPLETED_LESSONS, {
    variables: { userId, lessonIds },
    skip,
    fetchPolicy: "network-only",
  })
  const completed = data?.getCompletedLessons
  const completedLessonIds = useMemo(() => new Set((completed ?? []).map(Number)), [completed])

  if (skip) return { completedLessonIds: new Set(), loading: false, unavailable: false }
  return { completedLessonIds, loading, unavailable: Boolean(error) && !data }
}
