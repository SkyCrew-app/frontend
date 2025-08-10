"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/hooks/use-toast"
import { GET_USER_FLIGHT_PLANS, UPDATE_FLIGHT_PLAN } from "@/graphql/flights"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { FlightPlanCard } from "@/components/flight-plan/flight-plan-card"
import { FlightPlanFilters } from "@/components/flight-plan/flight-plan-filters"
import { FlightPlanEditDialog } from "@/components/flight-plan/flight-plan-edit-dialog"
import { EmptyState } from "@/components/flight-plan/empty-state"
import { StatsCards } from "@/components/flight-plan/stats-cards"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Flight } from "@/interfaces/flight"
import { useTranslations } from "next-intl"

export default function MyFlightPlans() {
  const t = useTranslations("reservation")

  const flightTypeTranslations = {
    VFR: "VFR",
    IFR: "IFR",
    SVFR: "SVFR",
    training: t('training'),
    "Generated via AI": t('generatedByAI'),
  }

  const reservationStatusTranslations = {
    PENDING: t('pending'),
    CONFIRMED: t('confirmated'),
    CANCELLED: t('cancelled'),
  }

  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [flightTypeFilter, setFlightTypeFilter] = useState("ALL")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data, loading, error, refetch } = useQuery(GET_USER_FLIGHT_PLANS, {
    variables: { userId },
    skip: !userId,
  })

  const [updateFlightPlan] = useMutation(UPDATE_FLIGHT_PLAN)

  const resetFilters = () => {
    setSearchTerm("")
    setFlightTypeFilter("ALL")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm !== "" || flightTypeFilter !== "ALL"

  const filteredFlightPlans =
    data?.getFlightsByUser
      ?.filter((flight: Flight) => {
        const searchTermLower = searchTerm.toLowerCase()
        const originLower = flight.origin_icao.toLowerCase()
        const destinationLower = flight.destination_icao.toLowerCase()

        return (
          (originLower.includes(searchTermLower) || destinationLower.includes(searchTermLower)) &&
          (flightTypeFilter === "ALL" || flight.flight_type === flightTypeFilter)
        )
      })
      .sort((a: Flight, b: Flight) => {
        if (sortOrder === "newest") {
          return new Date(b.reservation?.start_time || 0).getTime() - new Date(a.reservation?.start_time || 0).getTime()
        } else {
          return new Date(a.reservation?.start_time || 0).getTime() - new Date(b.reservation?.start_time || 0).getTime()
        }
      }) || []

  const totalPages = Math.ceil(filteredFlightPlans.length / itemsPerPage)
  const paginatedFlightPlans = filteredFlightPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleEdit = (flight: Flight) => {
    setSelectedFlight(flight)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async (
    flightType: string,
    weatherConditions: string,
    numberOfPassengers: number | undefined,
  ) => {
    if (!selectedFlight) return

    try {
      await updateFlightPlan({
        variables: {
          input: {
            id: selectedFlight.id,
            flight_type: flightType,
            weather_conditions: weatherConditions,
            number_of_passengers: numberOfPassengers,
          },
        },
        refetchQueries: [{ query: GET_USER_FLIGHT_PLANS, variables: { userId } }],
      })

      setIsEditDialogOpen(false)
      toast({
        title: t('updatedFlightPlan'),
        description: t('updatedFlightPlanSuccess', {airport1: selectedFlight.origin_icao, airport2: selectedFlight.destination_icao}),
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('errorUpdatingFlightPlan'),
        description: t('errorUpdatingFlightPlanUnknown'),
      })
    }
  }

  const renderPageNumbers = () => {
    const pageNumbers = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => setCurrentPage(i)} isActive={i === currentPage}>
            {i}
          </PaginationLink>
        </PaginationItem>,
      )
    }

    return pageNumbers
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('myFlightPlans')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{t('myFlightPlans')}</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {t('errorLoadingFlightPlans')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const allFlightPlans = data?.getFlightsByUser || []

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">{t('myFlightPlans')}</h1>
      </div>

      {allFlightPlans.length > 0 && <StatsCards flights={allFlightPlans} />}

      <FlightPlanFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        flightTypeFilter={flightTypeFilter}
        setFlightTypeFilter={setFlightTypeFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        flightTypeTranslations={flightTypeTranslations}
        resetFilters={resetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {paginatedFlightPlans.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {paginatedFlightPlans.map((flight: Flight) => (
              <FlightPlanCard
                key={flight.id}
                flight={flight}
                onEdit={handleEdit}
                flightTypeTranslations={flightTypeTranslations}
                reservationStatusTranslations={reservationStatusTranslations}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} />
                  </PaginationItem>
                )}

                {renderPageNumbers()}

                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <EmptyState
          message={
            hasActiveFilters
              ? t('noFlightPlansByFilter')
              : t('noFlightPlans')
          }
          hasFilters={hasActiveFilters}
          onResetFilters={resetFilters}
        />
      )}

      <FlightPlanEditDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        flight={selectedFlight}
        onSave={handleSaveEdit}
        flightTypeTranslations={flightTypeTranslations}
      />
    </div>
  )
}
