"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@apollo/client"
import { COMPUTE_FLIGHT_PLAN } from "@/graphql/navplan"
import { toFlightPlanInput, type FlightPlanDraft } from "@/lib/navplan/draft"
import type { FlightPlanInput, FlightPlanResult } from "@/lib/navplan/types"

export const COMPUTE_DEBOUNCE_MS = 400

/**
 * The builder state and its live preview: every change is sent to computeFlightPlan once the
 * pilot pauses for 400 ms. The previous result stays on screen (marked as updating) meanwhile.
 */
export function useFlightPlanDraft(initial: FlightPlanDraft) {
  const [draft, setDraft] = useState<FlightPlanDraft>(initial)
  const input = useMemo(() => toFlightPlanInput(draft), [draft])
  const inputKey = input ? JSON.stringify(input) : null
  const [sentKey, setSentKey] = useState<string | null>(inputKey)

  useEffect(() => {
    if (inputKey === sentKey) return
    const timer = setTimeout(() => setSentKey(inputKey), COMPUTE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inputKey, sentKey])

  const sentInput = useMemo(() => (sentKey ? (JSON.parse(sentKey) as FlightPlanInput) : null), [sentKey])

  const { data, previousData, loading, error, refetch } = useQuery<{ computeFlightPlan: FlightPlanResult }>(
    COMPUTE_FLIGHT_PLAN,
    {
      variables: { input: sentInput },
      skip: !sentInput,
      fetchPolicy: "no-cache",
      notifyOnNetworkStatusChange: true,
    },
  )

  const update = useCallback((change: (current: FlightPlanDraft) => FlightPlanDraft) => setDraft(change), [])

  const result = sentInput ? (data?.computeFlightPlan ?? previousData?.computeFlightPlan ?? null) : null

  return {
    draft,
    setDraft,
    update,
    /** What would be saved now (null while something blocking is missing). */
    input,
    result,
    /** The result on screen does not match the latest entries yet. */
    pending: loading || inputKey !== sentKey,
    error: sentInput ? error : undefined,
    retry: () => void refetch(),
  }
}
