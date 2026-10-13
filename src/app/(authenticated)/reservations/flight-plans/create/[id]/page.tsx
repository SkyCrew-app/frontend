"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/layout/PageHeader"
import { AirportSearch } from "@/components/my-plan/airport-search"
import { WaypointSearch } from "@/components/my-plan/waypoint-search"
import { RouteMap } from "@/components/my-plan/route-map"
import { CREATE_FLIGHT, GENERATE_FLIGHT_PLAN, GET_USER_FLIGHT_PLANS } from "@/graphql/flights"
import { GET_USER_RESERVATIONS } from "@/graphql/reservation"
import { toast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { aviationAPI, calculateDistance, calculateEstimatedTime } from "@/lib/aviation-api"
import type { Airport, Waypoint } from "@/lib/aviation-api"
import { buildCreateFlightInput } from "@/lib/graphql-inputs"
import { formatDate, formatFlightDuration, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Reservation } from "@/interfaces/reservation"

enum FlightCategory {
  VFR = "VFR",
  IFR = "IFR",
  SVFR = "SVFR",
}

// Step identifiers; their labels are planCreate.steps.<id>.
const steps = ["journey", "route", "summary"] as const

const RequiredMark = () => (
  <span className="text-destructive" aria-hidden="true">
    *
  </span>
)

function StepIndicator({ currentStep }: { currentStep: number }) {
  const { t } = useTranslation("flights")

  return (
    <ol className="flex items-center gap-2 text-sm" aria-label={t("common:panel.steps")}>
      {steps.map((step, index) => (
        <li key={step} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
          <span
            aria-current={index === currentStep ? "step" : undefined}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
              index < currentStep && "border-primary bg-primary text-primary-foreground",
              index === currentStep && "border-primary text-primary",
              index > currentStep && "border-border text-muted-foreground",
            )}
          >
            {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
          </span>
          <span className={cn("truncate", index === currentStep ? "font-medium" : "text-muted-foreground")}>
            {t(`planCreate.steps.${step}`)}
          </span>
          {index < steps.length - 1 && <span className="h-px min-w-4 flex-1 bg-border" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  )
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default function CreateCustomFlightPlan() {
  const { t } = useTranslation("flights")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: string | number | null = userData?.id ?? null

  const [currentStep, setCurrentStep] = useState(0)
  const [showAirportErrors, setShowAirportErrors] = useState(false)
  const [departureAirport, setDepartureAirport] = useState<Airport | null>(null)
  const [arrivalAirport, setArrivalAirport] = useState<Airport | null>(null)
  const [routeWaypoints, setRouteWaypoints] = useState<Waypoint[]>([])
  const [flightPlan, setFlightPlan] = useState({
    flight_hours: 0,
    flight_type: FlightCategory.VFR,
    origin_icao: "",
    destination_icao: "",
    number_of_passengers: 1,
    encoded_polyline: "",
    distance_km: 0,
    // Minutes while the route is being built; converted to hours when the plan is saved.
    estimated_flight_time: 0,
    waypoints: [] as string[],
    cruise_speed: 120,
    cruise_altitude: 3000,
  })

  const params = useParams()
  const reservationId = params.id as string
  const router = useRouter()

  const [createFlight, { loading: createLoading }] = useMutation(CREATE_FLIGHT)
  const [generateFlightPlan, { loading: generateLoading }] = useMutation(GENERATE_FLIGHT_PLAN)

  // Only used to remind which reservation the plan is for.
  const { data: reservationsData } = useQuery(GET_USER_RESERVATIONS, { variables: { userId }, skip: !userId })
  const reservation: Reservation | undefined = reservationsData?.userReservations?.find(
    (r: Reservation) => String(r.id) === String(reservationId),
  )

  // The lists the pilot comes back to must show the new plan.
  const refetchLists = userId
    ? [
        { query: GET_USER_RESERVATIONS, variables: { userId } },
        { query: GET_USER_FLIGHT_PLANS, variables: { userId } },
      ]
    : []

  useEffect(() => {
    const loadAirports = async () => {
      if (flightPlan.origin_icao) {
        const airport = await aviationAPI.getAirportByICAO(flightPlan.origin_icao)
        setDepartureAirport(airport)
      }
      if (flightPlan.destination_icao) {
        const airport = await aviationAPI.getAirportByICAO(flightPlan.destination_icao)
        setArrivalAirport(airport)
      }
    }
    loadAirports()
  }, [flightPlan.origin_icao, flightPlan.destination_icao])

  useEffect(() => {
    const loadWaypoints = async () => {
      const waypoints = await Promise.all(flightPlan.waypoints.map((id) => aviationAPI.getWaypointById(id)))
      setRouteWaypoints(waypoints.filter((w): w is Waypoint => w !== null))
    }
    loadWaypoints()
  }, [flightPlan.waypoints])

  useEffect(() => {
    if (departureAirport && arrivalAirport) {
      let totalDistance = 0
      const points: [number, number][] = [[departureAirport.lon, departureAirport.lat]]

      routeWaypoints.forEach((waypoint) => {
        points.push([waypoint.lon, waypoint.lat])
      })

      points.push([arrivalAirport.lon, arrivalAirport.lat])

      for (let i = 0; i < points.length - 1; i++) {
        totalDistance += calculateDistance(points[i][1], points[i][0], points[i + 1][1], points[i + 1][0])
      }

      const estimatedTime = calculateEstimatedTime(totalDistance, flightPlan.cruise_speed)

      setFlightPlan((prev) => ({
        ...prev,
        distance_km: Math.round(totalDistance),
        estimated_flight_time: Math.round(estimatedTime),
        flight_hours: Math.ceil(estimatedTime / 60),
      }))
    }
  }, [departureAirport, arrivalAirport, routeWaypoints, flightPlan.cruise_speed])

  const airportsMissing = !flightPlan.origin_icao || !flightPlan.destination_icao
  const estimatedDuration = formatFlightDuration(flightPlan.estimated_flight_time / 60)

  const handleNext = () => {
    if (currentStep === 0 && airportsMissing) {
      setShowAirportErrors(true)
      return
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    const createFlightInput = buildCreateFlightInput(
      // The API stores the estimated time in hours, like the generated plans.
      { ...flightPlan, estimated_flight_time: Math.round((flightPlan.estimated_flight_time / 60) * 100) / 100 },
      userId,
      reservationId,
    )
    if (!createFlightInput) {
      toast({
        variant: "destructive",
        title: t("planCreate.toast.createFailed.title"),
        description: t("planCreate.toast.createFailed.accountNotLoaded"),
      })
      return
    }

    try {
      const { data } = await createFlight({
        variables: { createFlightInput },
        refetchQueries: refetchLists,
      })

      if (data && data.createFlight) {
        toast({
          title: t("planCreate.toast.created.title"),
          description: `${flightPlan.origin_icao} → ${flightPlan.destination_icao}`,
        })
        router.push(`/reservations/flight-plans/${data.createFlight.id}`)
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("planCreate.toast.createFailed.title"),
        description: t("planCreate.toast.createFailed.description"),
      })
    }
  }

  const handleGenerate = async () => {
    if (airportsMissing) {
      setShowAirportErrors(true)
      return
    }

    try {
      const { data } = await generateFlightPlan({
        variables: {
          input: {
            origin_icao: flightPlan.origin_icao,
            destination_icao: flightPlan.destination_icao,
            reservation_id: reservationId ? Number.parseInt(reservationId) : null,
          },
        },
        refetchQueries: refetchLists,
      })

      if (data && data.generateFlightPlan) {
        toast({
          title: t("planCreate.toast.generated.title"),
          description: `${flightPlan.origin_icao} → ${flightPlan.destination_icao}`,
        })
        router.push(`/reservations/flight-plans/${data.generateFlightPlan.id}`)
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("planCreate.toast.generateFailed.title"),
        description: t("planCreate.toast.generateFailed.description"),
      })
    }
  }

  // Both tabs share the two airports, so what is chosen in one is kept in the other.
  const airportFields = (idPrefix: string) => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-origin`}>
          {t("planCreate.airports.departure")} <RequiredMark />
        </Label>
        <AirportSearch
          id={`${idPrefix}-origin`}
          invalid={showAirportErrors && !flightPlan.origin_icao}
          value={flightPlan.origin_icao}
          onChange={(value) => setFlightPlan((prev) => ({ ...prev, origin_icao: value }))}
          label={t("planCreate.airports.chooseDeparture")}
        />
        {showAirportErrors && !flightPlan.origin_icao && (
          <p className="text-sm text-destructive">{t("planCreate.airports.departureRequired")}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-destination`}>
          {t("planCreate.airports.arrival")} <RequiredMark />
        </Label>
        <AirportSearch
          id={`${idPrefix}-destination`}
          invalid={showAirportErrors && !flightPlan.destination_icao}
          value={flightPlan.destination_icao}
          onChange={(value) => setFlightPlan((prev) => ({ ...prev, destination_icao: value }))}
          label={t("planCreate.airports.chooseArrival")}
        />
        {showAirportErrors && !flightPlan.destination_icao && (
          <p className="text-sm text-destructive">{t("planCreate.airports.arrivalRequired")}</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        className="mb-0"
        title={t("planCreate.title")}
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
        actions={
          <Button variant="outline" asChild>
            <Link href="/reservations/my">
              <ArrowLeft className="h-4 w-4" />
              {t("planCreate.backToReservations")}
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="auto" className="space-y-6">
        <TabsList>
          <TabsTrigger value="auto">{t("planCreate.auto.title")}</TabsTrigger>
          <TabsTrigger value="manual">{t("planCreate.manual.title")}</TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("planCreate.auto.title")}</CardTitle>
              <CardDescription>{t("planCreate.auto.description")}</CardDescription>
            </CardHeader>
            <CardContent>{airportFields("auto")}</CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleGenerate} disabled={generateLoading}>
                {generateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generateLoading ? t("planCreate.auto.generating") : t("planCreate.auto.generate")}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-0">
          <Card>
            <CardHeader className="space-y-4">
              <div>
                <CardTitle className="text-lg">{t("planCreate.manual.title")}</CardTitle>
                <CardDescription>{t("planCreate.manual.description")}</CardDescription>
              </div>
              <StepIndicator currentStep={currentStep} />
            </CardHeader>
            <CardContent className="space-y-6">
              {currentStep === 0 && (
                <>
                  {airportFields("manual")}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="flight-rule">{t("planCreate.manual.flightRules")}</Label>
                      <Select
                        value={flightPlan.flight_type}
                        onValueChange={(value) =>
                          setFlightPlan((prev) => ({ ...prev, flight_type: value as FlightCategory }))
                        }
                      >
                        <SelectTrigger id="flight-rule">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={FlightCategory.VFR}>{t("planCreate.manual.rules.VFR")}</SelectItem>
                          <SelectItem value={FlightCategory.IFR}>{t("planCreate.manual.rules.IFR")}</SelectItem>
                          <SelectItem value={FlightCategory.SVFR}>{t("planCreate.manual.rules.SVFR")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="passengers">{t("planCreate.manual.passengerCount")}</Label>
                      <Input
                        id="passengers"
                        type="number"
                        inputMode="numeric"
                        value={flightPlan.number_of_passengers}
                        onChange={(e) =>
                          setFlightPlan((prev) => ({
                            ...prev,
                            number_of_passengers: Number(e.target.value),
                          }))
                        }
                        min={1}
                        max={20}
                        step={1}
                      />
                    </div>
                  </div>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <RouteMap departure={departureAirport} arrival={arrivalAirport} waypoints={routeWaypoints} />

                  <div className="space-y-2">
                    <Label htmlFor="waypoints">{t("planCreate.manual.waypoints")}</Label>
                    <WaypointSearch
                      id="waypoints"
                      waypoints={flightPlan.waypoints}
                      onChange={(waypoints) => setFlightPlan((prev) => ({ ...prev, waypoints }))}
                    />
                    <p className="text-xs text-muted-foreground">{t("planCreate.manual.waypointsHint")}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cruise-speed">{t("planCreate.manual.cruiseSpeedKt")}</Label>
                      <Input
                        id="cruise-speed"
                        type="number"
                        inputMode="numeric"
                        value={flightPlan.cruise_speed}
                        onChange={(e) =>
                          setFlightPlan((prev) => ({
                            ...prev,
                            cruise_speed: Number(e.target.value),
                          }))
                        }
                        min={60}
                        max={500}
                        step={5}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cruise-altitude">{t("planCreate.manual.cruiseAltitudeFt")}</Label>
                      <Input
                        id="cruise-altitude"
                        type="number"
                        inputMode="numeric"
                        value={flightPlan.cruise_altitude}
                        onChange={(e) =>
                          setFlightPlan((prev) => ({
                            ...prev,
                            cruise_altitude: Number(e.target.value),
                          }))
                        }
                        min={0}
                        max={45000}
                        step={500}
                      />
                    </div>
                  </div>

                  {flightPlan.distance_km > 0 && (
                    <dl className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                      <SummaryItem label={t("plans.labels.totalDistance")} value={`${flightPlan.distance_km} km`} />
                      <SummaryItem label={t("planCreate.manual.estimatedFlightTime")} value={estimatedDuration} />
                    </dl>
                  )}
                </>
              )}

              {currentStep === 2 && (
                <>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <SummaryItem label={t("plans.labels.departure")} value={departureAirport?.name || flightPlan.origin_icao} />
                    <SummaryItem label={t("plans.labels.arrival")} value={arrivalAirport?.name || flightPlan.destination_icao} />
                    <SummaryItem label={t("planCreate.manual.flightRules")} value={flightPlan.flight_type} />
                    <SummaryItem label={t("plans.labels.passengers")} value={flightPlan.number_of_passengers} />
                    <SummaryItem label={t("common:labels.distance")} value={`${flightPlan.distance_km} km`} />
                    <SummaryItem label={t("planCreate.manual.estimatedFlightTime")} value={estimatedDuration} />
                    <SummaryItem label={t("plans.labels.cruiseSpeed")} value={`${flightPlan.cruise_speed} kt`} />
                    <SummaryItem label={t("planCreate.manual.cruiseAltitude")} value={`${flightPlan.cruise_altitude} ft`} />
                    {routeWaypoints.length > 0 && (
                      <div className="col-span-2 sm:col-span-4">
                        <dt className="text-xs text-muted-foreground">{t("planCreate.manual.waypoints")}</dt>
                        <dd className="text-sm font-medium">{routeWaypoints.map((w) => w.ident).join(" → ")}</dd>
                      </div>
                    )}
                  </dl>

                  <RouteMap departure={departureAirport} arrival={arrivalAirport} waypoints={routeWaypoints} />
                </>
              )}
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <Button onClick={handlePrevious} disabled={currentStep === 0} variant="outline">
                {t("common:actions.previous")}
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>{t("common:actions.next")}</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={createLoading || userId === null}>
                  {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {createLoading ? t("planCreate.manual.creating") : t("planCreate.manual.create")}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
