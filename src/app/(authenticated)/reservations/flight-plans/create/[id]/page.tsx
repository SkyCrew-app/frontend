"use client"

import { Suspense, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowLeft, CalendarX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { FlightPlanBuilder } from "@/components/navplan/FlightPlanBuilder"
import { toast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { AIRCRAFT_FLIGHT_DATA, FLIGHT_PLANNING_SETTINGS } from "@/graphql/aircraft-data"
import { NAVDATA_INFO } from "@/graphql/navdata"
import { FLIGHT_PLAN, SAVE_FLIGHT_PLAN } from "@/graphql/navplan"
import { GET_USER_FLIGHT_PLANS } from "@/graphql/flights"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { GET_USER_RESERVATIONS } from "@/graphql/reservation"
import { apiRefusal } from "@/lib/api-refusal"
import { formatDate, formatTime } from "@/lib/format"
import { draftFromPlan, emptyDraft, type FlightPlanDraft } from "@/lib/navplan/draft"
import type {
  AircraftMassBalance,
  AircraftPerformance,
  FlightPlan,
  FlightPlanInput,
  FlightPlanningSettings,
  NavdataInfo,
} from "@/lib/navplan/types"
import { isAdministrator } from "@/lib/roles"
import type { Reservation } from "@/interfaces/reservation"

const BackButton = () => {
  const { t } = useTranslation("flights")
  return (
    <Button variant="outline" asChild>
      <Link href="/reservations/my">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("planCreate.backToReservations")}
      </Link>
    </Button>
  )
}

// useSearchParams needs a Suspense boundary.
export default function FlightPlanBuilderPage() {
  return (
    <Suspense>
      <FlightPlanBuilderScreen />
    </Suspense>
  )
}

function FlightPlanBuilderScreen() {
  const { t } = useTranslation("flights")
  const { t: tn } = useTranslation("navplan")
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const reservationId = Number.parseInt(String(params.id), 10)
  const planId = Number.parseInt(searchParams.get("plan") ?? "", 10) || null

  const me = useUserData(useCurrentUser())
  const userId: number | null = me?.id ? Number(me.id) : null

  const { data: reservationsData, loading: reservationsLoading } = useQuery(GET_USER_RESERVATIONS, {
    variables: { userId },
    skip: !userId,
  })
  const reservation: Reservation | undefined = reservationsData?.userReservations?.find(
    (candidate: Reservation) => Number(candidate.id) === reservationId,
  )

  const planQuery = useQuery<{ flightPlan: FlightPlan | null }>(FLIGHT_PLAN, { variables: { id: planId }, skip: !planId })
  const plan = planQuery.data?.flightPlan ?? null

  const aircraftId = plan?.input.aircraftId ?? (reservation ? Number(reservation.aircraft.id) : null)
  const fleetQuery = useQuery<{ getAircrafts: { id: number; registration_number: string }[] }>(GET_AIRCRAFTS, {
    skip: !plan || Boolean(reservation),
  })
  const registration =
    reservation?.aircraft.registration_number ??
    fleetQuery.data?.getAircrafts.find((aircraft) => Number(aircraft.id) === aircraftId)?.registration_number ??
    "—"

  const aircraftQuery = useQuery<{ aircraftPerformance: AircraftPerformance | null; aircraftMassBalance: AircraftMassBalance | null }>(
    AIRCRAFT_FLIGHT_DATA,
    { variables: { aircraftId }, skip: aircraftId === null },
  )
  const { data: settingsData } = useQuery<{ flightPlanningSettings: FlightPlanningSettings }>(FLIGHT_PLANNING_SETTINGS)
  const { data: navdataData } = useQuery<{ navdataInfo: NavdataInfo }>(NAVDATA_INFO)

  const [saveFlightPlan, { loading: saving }] = useMutation<{ saveFlightPlan: { id: number; flightId: number | null } }>(SAVE_FLIGHT_PLAN)

  const initialDraft = useMemo<FlightPlanDraft | null>(() => {
    if (plan) return draftFromPlan(plan)
    if (!reservation) return null
    return emptyDraft({
      aircraftId: Number(reservation.aircraft.id),
      reservationId: Number(reservation.id),
      departureTime: new Date(reservation.start_time).toISOString(),
    })
  }, [plan, reservation])

  const save = async (input: FlightPlanInput) => {
    try {
      const { data } = await saveFlightPlan({
        variables: { input, flightPlanId: planId },
        refetchQueries: userId
          ? [
              { query: GET_USER_RESERVATIONS, variables: { userId } },
              { query: GET_USER_FLIGHT_PLANS, variables: { userId } },
            ]
          : [],
      })
      const saved = data?.saveFlightPlan
      toast({ title: planId ? tn("builder.save.updated") : t("planCreate.toast.created.title") })
      router.push(saved?.flightId ? `/reservations/flight-plans/${saved.flightId}` : "/reservations/flight-plans")
    } catch (error) {
      // A refusal (someone else's booking, cancelled booking…) is explained by the API.
      toast({
        variant: "destructive",
        title: t("planCreate.toast.createFailed.title"),
        description: apiRefusal(error, t("planCreate.toast.createFailed.description")),
      })
    }
  }

  const header = (
    <PageHeader
      className="mb-0"
      title={planId ? tn("builder.editTitle") : t("planCreate.title")}
      description={
        reservation
          ? t("planCreate.descriptionForReservation", {
              aircraft: reservation.aircraft.registration_number,
              date: formatDate(reservation.start_time),
              start: formatTime(reservation.start_time),
              end: formatTime(reservation.end_time),
            })
          : t("planCreate.descriptionDefault")
      }
      actions={<BackButton />}
    />
  )

  const loading =
    (!me && !planId) || reservationsLoading || planQuery.loading || aircraftQuery.loading || (planId !== null && fleetQuery.loading)

  if (planQuery.error || aircraftQuery.error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState
          onRetry={() => {
            void planQuery.refetch()
            void aircraftQuery.refetch()
          }}
        />
      </div>
    )
  }

  if (loading || (aircraftId !== null && !aircraftQuery.data)) {
    return (
      <div className="space-y-6" aria-busy="true">
        {header}
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_25rem]">
          <Skeleton className="h-[28rem] w-full rounded-xl" />
          <Skeleton className="h-[28rem] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!initialDraft || aircraftId === null) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={CalendarX}
          title={tn("builder.notFound.title")}
          description={tn("builder.notFound.description")}
          action={<BackButton />}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}
      <FlightPlanBuilder
        initialDraft={initialDraft}
        aircraft={{
          id: aircraftId,
          registration,
          performance: aircraftQuery.data?.aircraftPerformance ?? null,
          massBalance: aircraftQuery.data?.aircraftMassBalance ?? null,
        }}
        settings={settingsData?.flightPlanningSettings ?? null}
        navdata={navdataData?.navdataInfo ?? null}
        isAdmin={isAdministrator(me)}
        pilotName={reservation?.user ? [reservation.user.first_name, reservation.user.last_name].filter(Boolean).join(" ") : undefined}
        saving={saving}
        onSave={save}
      />
    </div>
  )
}
