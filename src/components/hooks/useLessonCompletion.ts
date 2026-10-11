import { useEffect, useState } from "react"
import { useApolloClient } from "@apollo/client"
import { GET_LESSON_PROGRESS } from "@/graphql/instruction"

interface LessonCompletion {
  completedLessonIds: Set<number>
  loading: boolean
  // True when the completion of at least one lesson could not be read.
  unavailable: boolean
}

const EMPTY: LessonCompletion = { completedLessonIds: new Set(), loading: false, unavailable: false }

// Which of the given lessons the user has completed. The API answers one
// lesson at a time, and with an error for a lesson that was never opened:
// such a lesson is simply not completed.
export function useLessonCompletion(userId: number | null, lessonIds: number[]): LessonCompletion {
  const client = useApolloClient()
  const [state, setState] = useState<LessonCompletion>(EMPTY)
  const lessonKey = lessonIds.join(",")

  useEffect(() => {
    const ids = lessonKey ? lessonKey.split(",").map(Number) : []
    if (userId === null || ids.length === 0) {
      setState(EMPTY)
      return
    }

    let cancelled = false
    setState((previous) => ({ ...previous, loading: true }))

    // allSettled never rejects: each lesson is judged on its own result.
    void Promise.allSettled(
      ids.map((lessonId) =>
        client.query<{ getUserProgress: boolean | null }>({
          query: GET_LESSON_PROGRESS,
          variables: { userId, lessonId },
          fetchPolicy: "network-only",
          errorPolicy: "all",
        }),
      ),
    ).then((results) => {
      if (cancelled) return
      const completedLessonIds = new Set<number>()
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.data?.getUserProgress === true) {
          completedLessonIds.add(ids[index])
        }
      })
      setState({
        completedLessonIds,
        loading: false,
        unavailable: results.some((result) => result.status === "rejected"),
      })
    })

    return () => {
      cancelled = true
    }
  }, [client, userId, lessonKey])

  return state
}
