"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/hooks/use-toast"
import { GET_USER_FLIGHT_PLANS, UPDATE_FLIGHT_PLAN } from "@/graphql/flights"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import { FlightPlanCard } from "@/components/flight-plan/flight-plan-card"
import { FlightPlanFilters, type FlightPlanSortOrder } from "@/components/flight-plan/flight-plan-filters"
import { FlightPlanEditDialog } from "@/components/flight-plan/flight-plan-edit-dialog"
import { EmptyState } from "@/components/flight-plan/empty-state"
import { StatsCards } from "@/components/flight-plan/stats-cards"
import { ListPager } from "@/components/reservation/list-pager"
import type { Flight } from "@/interfaces/flight"
import { flightTypeKey, flightTypeLabel } from "@/components/flight/flight-type"

const ITEMS_PER_PAGE = 6

const startTimeOf = (flight: Flight) => new Date(flight.reservation?.start_time || 0).getTime()

export default function MyFlightPlans() {
  const { t } = useTranslation("flights")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: string | number | null = userData?.id ?? null
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [flightTypeFilter, setFlightTypeFilter] = useState("ALL")
  const [sortOrder, setSortOrder] = useState<FlightPlanSortOrder>("newest")
  const [currentPage, setCurrentPage] = useState(1)

  const { data, loading, error, refetch } = useQuery(GET_USER_FLIGHT_PLANS, {
    variables: { userId },
    skip: !userId,
  })

  const [updateFlightPlan] = useMutation(UPDATE_FLIGHT_PLAN)

  // Any change of filter or sort goes back to the first page.
  const onFilterChange =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setCurrentPage(1)
    }

  const resetFilters = () => {
    setSearchTerm("")
    setFlightTypeFilter("ALL")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== "" || flightTypeFilter !== "ALL"

  const allFlightPlans: Flight[] = useMemo(() => data?.getFlightsByUser ?? [], [data])

  // `flight_type` is the booking category: one option per category, whatever its stored case,
  // ordered by the label shown.
  const flightTypes = useMemo(
    () =>
      Array.from(new Set(allFlightPlans.map((flight) => flightTypeKey(flight.flight_type)).filter(Boolean))).sort((a, b) =>
        flightTypeLabel(a).localeCompare(flightTypeLabel(b)),
      ),
    [allFlightPlans],
  )

  const filteredFlightPlans = allFlightPlans
    .filter((flight) => {
      const search = searchTerm.trim().toLowerCase()
      const haystack = [flight.origin_icao, flight.destination_icao, flight.reservation?.aircraft?.registration_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return haystack.includes(search) && (flightTypeFilter === "ALL" || flightTypeKey(flight.flight_type) === flightTypeFilter)
    })
    .sort((a, b) => (sortOrder === "newest" ? startTimeOf(b) - startTimeOf(a) : startTimeOf(a) - startTimeOf(b)))

  const totalPages = Math.max(1, Math.ceil(filteredFlightPlans.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const paginatedFlightPlans = filteredFlightPlans.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleEdit = (flight: Flight) => {
    setSelectedFlight(flight)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async (
    flightType: string,
    weatherConditions: string | undefined,
    numberOfPassengers: number | undefined,
  ) => {
    if (!selectedFlight) return

    try {
      await updateFlightPlan({
        variables: {
          input: {
            id: selectedFlight.id,
            flight_type: flightType,
            // Left out when the list did not load the current value, so it is not overwritten.
            ...(weatherConditions !== undefined ? { weather_conditions: weatherConditions } : {}),
            number_of_passengers: numberOfPassengers,
          },
        },
        refetchQueries: [{ query: GET_USER_FLIGHT_PLANS, variables: { userId } }],
      })

      setIsEditDialogOpen(false)
      toast({
        title: t("plans.toast.updated.title"),
        description: t("plans.toast.updated.description", {
          origin: selectedFlight.origin_icao,
          destination: selectedFlight.destination_icao,
        }),
      })
    } catch {
      toast({
        variant: "destructive",
        title: t("plans.toast.updateFailed.title"),
        description: t("plans.toast.updateFailed.description"),
      })
    }
  }

  // The flight plans query waits for the signed-in user.
  const isLoading = loading || (!userId && !error)

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )
    }

    if (error) {
      return <ErrorState onRetry={() => refetch()} />
    }

    if (allFlightPlans.length === 0) {
      return <EmptyState />
    }

    return (
      <>
        <StatsCards flights={allFlightPlans} />

        <FlightPlanFilters
          searchTerm={searchTerm}
          setSearchTerm={onFilterChange(setSearchTerm)}
          flightTypeFilter={flightTypeFilter}
          setFlightTypeFilter={onFilterChange(setFlightTypeFilter)}
          sortOrder={sortOrder}
          setSortOrder={onFilterChange(setSortOrder)}
          flightTypes={flightTypes}
          resetFilters={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {paginatedFlightPlans.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {paginatedFlightPlans.map((flight) => (
                <FlightPlanCard key={flight.id} flight={flight} onEdit={handleEdit} />
              ))}
            </div>
            <ListPager
              page={page}
              pageCount={totalPages}
              onPageChange={setCurrentPage}
              total={filteredFlightPlans.length}
              noun={[t("plans.pagerNoun.one"), t("plans.pagerNoun.other")]}
            />
          </>
        ) : (
          <EmptyState hasFilters onResetFilters={resetFilters} />
        )}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("plans.title")}
        description={t("plans.description")}
        actions={
          <Button asChild>
            <Link href="/reservations/my">
              <Plus className="h-4 w-4" />
              {t("plans.new")}
            </Link>
          </Button>
        }
      />

      {renderContent()}

      <FlightPlanEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        flight={selectedFlight}
        onSave={handleSaveEdit}
      />
    </div>
  )
}
