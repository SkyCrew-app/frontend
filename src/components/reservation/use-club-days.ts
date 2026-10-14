"use client"

import { useMemo } from "react"
import { useQuery } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { GET_SETTINGS } from "@/graphql/settings"
import { toWeekday } from "@/lib/settings"
import { maintenanceClash } from "@/lib/weekly-maintenance"

const normalizeDayName = (day: string) =>
  day
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/**
 * The club settings a booking form needs: opening hours, a test for closure days and one
 * for the weekly maintenance.
 * Closure days come from the API as French or English day names: compared in French
 * whatever the language.
 */
export function useClubDays() {
  const { data, loading } = useQuery(GET_SETTINGS, { fetchPolicy: "cache-and-network" })
  const administration = data?.getAllAdministrations?.[0]
  const closedDays = useMemo(
    () => ((administration?.closureDays ?? []) as string[]).map(toWeekday).map(normalizeDayName),
    [administration],
  )
  const isClosedDay = (date: Date) => closedDays.includes(normalizeDayName(format(date, "EEEE", { locale: fr })))
  const clashesWithMaintenance = (start: Date, end: Date) => maintenanceClash(administration, start, end)
  return { administration, loading, isClosedDay, maintenanceClash: clashesWithMaintenance }
}
