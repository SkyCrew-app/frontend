"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@apollo/client"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowLeft, FileSearch, Info, MapPinOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { isAccessRefusal } from "@/lib/api-refusal"
import { FlightSummary } from "@/components/flight/FlightSummary"
import { AirportInfo } from "@/components/flight/AirportInfo"
import { WaypointInfo } from "@/components/flight/WaypointInfo"
import { FuelBriefing, hasFuelBriefing } from "@/components/flight/FuelBriefing"
import { NavLog } from "@/components/flight/NavLog"
import { VerticalProfile } from "@/components/flight/VerticalProfile"
import { OFPExport } from "@/components/flight/OFPExport"
import { FlightPlanActions } from "@/components/flight/flight-action-plans"
import { ClosedFlightAdmin } from "@/components/flight/closed-flight-admin"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { isAdministrator } from "@/lib/roles"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { flightPlanState } from "@/components/flight-plan/flight-plan-state"
import { GET_FLIGHT_PLAN_BY_ID } from "@/graphql/flights"
import { getWeather } from "@/lib/weather"
import { closeBlocker } from "@/lib/flight-closing"
import { formatDate, formatDateTime, formatDecimal, formatFlightDuration, formatTime } from "@/lib/format"
import type { Weather } from "@/interfaces/weather"

import "@/styles/print.css"

const MapboxMap = dynamic(() => import("@/components/flight/MapboxMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null
  if (typeof raw === "object") return raw as T
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const isCoordinate = (value: unknown) => Number.isFinite(typeof value === "string" ? Number.parseFloat(value) : value)

// Plans created by hand only store waypoint identifiers: keep the points that can be drawn and listed.
const detailedWaypoints = (raw: string | null | undefined): any[] =>
  (safeJsonParse<any[]>(raw) ?? []).filter(
    (wp) => wp && typeof wp === "object" && typeof wp.lat === "number" && typeof wp.lon === "number",
  )

const toWeather = (raw: any): Weather | null =>
  raw
    ? {
        temperature: Number.parseFloat(raw.main.temp),
        conditions: raw.weather[0].description,
        icon: raw.weather[0].icon,
        wind: { speed: raw.wind.speed, direction: raw.wind.deg },
        humidity: raw.main.humidity,
        pressure: raw.main.pressure,
        visibility: raw.visibility,
      }
    : null

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}

const BackButton = () => {
  const { t } = useTranslation("flights")
  return (
    <Button variant="outline" asChild>
      <Link href="/reservations/flight-plans">
        <ArrowLeft className="h-4 w-4" />
        {t("plans.title")}
      </Link>
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FlightPlanDetails() {
  const { t } = useTranslation("flights")
  const { id } = useParams()
  const router = useRouter()
  const me = useUserData(useCurrentUser())
  const isAdmin = isAdministrator(me)
  const flightId = Array.isArray(id) ? id[0] : (id as string)
  const [section, setSection] = useState("route")
  const [routePanel, setRoutePanel] = useState("overview")
  const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | undefined>(undefined)
  const [weatherData, setWeatherData] = useState<{ departure: Weather | null; arrival: Weather | null }>({
    departure: null,
    arrival: null,
  })

  const { loading, error, data, refetch } = useQuery(GET_FLIGHT_PLAN_BY_ID, {
    variables: { id: Number.parseInt(flightId) },
  })

  const fp = data?.getFlightById

  // Current weather at both ends, when their coordinates are known.
  useEffect(() => {
    if (!fp) return
    const depInfo = safeJsonParse<any>(fp.departure_airport_info)
    const arrInfo = safeJsonParse<any>(fp.arrival_airport_info)
    if (!depInfo || !arrInfo) return

    let cancelled = false
    Promise.all([getWeather(depInfo.lat, depInfo.lon), getWeather(arrInfo.lat, arrInfo.lon)])
      .then(([departureWeather, arrivalWeather]) => {
        if (!cancelled) setWeatherData({ departure: toWeather(departureWeather), arrival: toWeather(arrivalWeather) })
      })
      .catch(() => {
        // The weather is a bonus: the page stays usable without it.
        if (!cancelled) setWeatherData({ departure: null, arrival: null })
      })
    return () => {
      cancelled = true
    }
  }, [fp])

  /* ---- Parse enriched OFP data ---- */
  const fuelPolicy = useMemo(() => safeJsonParse<any>(fp?.fuel_policy), [fp])
  const windSummary = useMemo(() => safeJsonParse<any>(fp?.wind_summary), [fp])
  const waypoints = useMemo(() => detailedWaypoints(fp?.waypoints), [fp])
  const parsedDeparture = useMemo(() => safeJsonParse<any>(fp?.departure_airport_info), [fp])
  const parsedArrival = useMemo(() => safeJsonParse<any>(fp?.arrival_airport_info), [fp])

  const handleRoutePanelChange = (panel: string) => {
    setRoutePanel(panel)

    switch (panel) {
      case "overview":
        setMapFocus(undefined)
        break
      case "departure":
        if (parsedDeparture) setMapFocus({ center: [parsedDeparture.lon, parsedDeparture.lat], zoom: 10 })
        break
      case "arrival":
        if (parsedArrival) setMapFocus({ center: [parsedArrival.lon, parsedArrival.lat], zoom: 10 })
        break
      case "waypoints":
        if (waypoints.length > 0) {
          const lats = waypoints.map((wp) => wp.lat)
          const lons = waypoints.map((wp) => wp.lon)
          setMapFocus({
            center: [
              lons.reduce((a: number, b: number) => a + b, 0) / lons.length,
              lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
            ],
            zoom: 5,
          })
        }
        break
    }
  }

  const handleFocusWaypoint = (index: number) => {
    const waypoint = waypoints[index]
    if (waypoint) setMapFocus({ center: [waypoint.lon, waypoint.lat], zoom: 12 })
  }

  /* ================================================================== */
  /*  Loading, error, not found                                          */
  /* ================================================================== */
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("planDetail.title")} actions={<BackButton />} />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl lg:col-span-3" />
        </div>
      </div>
    )
  }

  // Not found or not the member's: say so, rather than suggest a connection problem.
  if (error && !isAccessRefusal(error)) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("planDetail.title")} actions={<BackButton />} />
        <ErrorState
          description={t("planDetail.loadError")}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!fp) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("planDetail.title")} />
        <EmptyState
          icon={FileSearch}
          title={t("planDetail.notFound.title")}
          description={t("planDetail.notFound.description")}
          action={<BackButton />}
        />
      </div>
    )
  }

  /* ================================================================== */
  /*  Derived data                                                       */
  /* ================================================================== */
  const departureInfo = parsedDeparture || { ICAO: fp.origin_icao, name: fp.origin_icao, city: "" }
  const arrivalInfo = parsedArrival || { ICAO: fp.destination_icao, name: fp.destination_icao, city: "" }
  const hasMapData = [departureInfo.lat, departureInfo.lon, arrivalInfo.lat, arrivalInfo.lon].every(isCoordinate)

  const aircraft = fp.reservation?.aircraft
    ? {
        registration_number: fp.reservation.aircraft.registration_number,
        model: fp.reservation.aircraft.model,
        cruiseSpeed: fp.reservation.aircraft.cruiseSpeed,
        consumption: fp.reservation.aircraft.consumption,
        maxAltitude: fp.reservation.aircraft.maxAltitude,
        total_flight_hours: fp.reservation.aircraft.total_flight_hours,
        image_url: fp.reservation.aircraft.image_url,
      }
    : null

  const pilotName = fp.user ? [fp.user.first_name, fp.user.last_name].filter(Boolean).join(" ") : undefined
  const pilotEmail = fp.user?.email
  const flightNumber = fp.reservation?.id ? `RES-${fp.reservation.id}` : "—"

  const departureAt = fp.departure_time ?? fp.reservation?.start_time
  const arrivalAt = fp.arrival_time ?? fp.reservation?.end_time
  const departureTimeStr = formatTime(departureAt)
  const arrivalTimeStr = formatTime(arrivalAt)
  const dateStr = formatDate(departureAt)
  const duration = fp.estimated_flight_time ? formatFlightDuration(fp.estimated_flight_time) : undefined
  const typeLabel = flightTypeLabel(fp.flight_type)
  const state = flightPlanState(fp)
  const showFuelTab = hasFuelBriefing(fuelPolicy, windSummary)
  const hasNavigation = waypoints.length >= 2

  const summaryFacts = [
    { label: t("common:labels.date"), value: dateStr },
    { label: t("common:labels.aircraft"), value: aircraft ? `${aircraft.registration_number}${aircraft.model ? ` · ${aircraft.model}` : ""}` : "—" },
    {
      label: t("plans.labels.passengers"),
      value: fp.number_of_passengers != null ? fp.number_of_passengers : "—",
    },
    fp.estimated_fuel_liters
      ? { label: t("plans.labels.estimatedFuel"), value: `${formatDecimal(fp.estimated_fuel_liters, 0)} L` }
      : { label: t("plans.labels.flightType"), value: typeLabel },
  ]

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  return (
    <div className="space-y-6" data-print-date={formatDateTime(new Date())}>
      <PageHeader
        className="mb-0"
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {departureInfo.ICAO} → {arrivalInfo.ICAO}
            <Badge variant={state.variant}>{state.label}</Badge>
          </span>
        }
        description={
          // Someone else's flight (an administrator or an instructor reading it) names its pilot.
          fp.user && pilotName && me && String(fp.user.id) !== String(me.id)
            ? t("planDetail.descriptionWithPilot", { type: typeLabel, pilot: pilotName })
            : t("planDetail.description", { type: typeLabel })
        }
        actions={
          <>
            <BackButton />
            <FlightPlanActions
              flightPlanId={flightId}
              flightDetails={{ departure: departureInfo.ICAO, arrival: arrivalInfo.ICAO, date: dateStr }}
            />
            <OFPExport
              departureInfo={departureInfo}
              arrivalInfo={arrivalInfo}
              waypoints={waypoints}
              aircraft={aircraft}
              pilotName={pilotName}
              pilotEmail={pilotEmail}
              flightType={fp.flight_type}
              flightNumber={flightNumber}
              departureTime={departureTimeStr}
              arrivalTime={arrivalTimeStr}
              totalDistanceKm={fp.distance_km}
              totalTimeHours={fp.estimated_flight_time}
              fuelPolicy={fuelPolicy}
              windSummary={windSummary}
              performanceProfile={fp.performance_profile}
              weatherConditions={fp.weather_conditions}
              passengers={fp.number_of_passengers}
            />
            {closeBlocker(fp) === null && (
              <Button asChild>
                <Link href={`/close_flight/${fp.id}`}>{t("plans.actions.closeFlight")}</Link>
              </Button>
            )}
          </>
        }
      />

      {isAdmin && fp.closed_at && (
        <ClosedFlightAdmin
          flight={fp}
          onChanged={() => refetch()}
          // The flight no longer exists: back to where the administrator came from.
          onDeleted={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
        />
      )}

      <FlightSummary
        departure={{
          icao: departureInfo.ICAO,
          name: departureInfo.name || departureInfo.city,
          time: departureTimeStr,
          weather: weatherData.departure ?? undefined,
        }}
        arrival={{
          icao: arrivalInfo.ICAO,
          name: arrivalInfo.name || arrivalInfo.city,
          time: arrivalTimeStr,
          weather: weatherData.arrival ?? undefined,
        }}
        duration={duration}
        distanceKm={fp.distance_km}
        facts={summaryFacts}
      />

      {!fp.closed_at && (
        <Alert className="no-print">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("planDetail.beforeDeparture.title")}</AlertTitle>
          <AlertDescription>{t("planDetail.beforeDeparture.description")}</AlertDescription>
        </Alert>
      )}

      {/* Panels stay mounted so the map is not rebuilt and printing shows every section. */}
      <Tabs value={section} onValueChange={setSection} className="space-y-6">
        <TabsList className="tabs-list">
          <TabsTrigger value="route">{t("planDetail.tabs.route")}</TabsTrigger>
          <TabsTrigger value="navigation">{t("planDetail.tabs.navigation")}</TabsTrigger>
          {showFuelTab && <TabsTrigger value="fuel">{t("planDetail.tabs.fuel")}</TabsTrigger>}
        </TabsList>

        <TabsContent value="route" forceMount className="mt-0 data-[state=inactive]:hidden">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Tabs value={routePanel} onValueChange={handleRoutePanelChange}>
                <TabsList className="tabs-list w-full">
                  <TabsTrigger value="overview" className="flex-1">
                    {t("planDetail.routeTabs.overview")}
                  </TabsTrigger>
                  <TabsTrigger value="departure" className="flex-1">
                    {t("plans.labels.departure")}
                  </TabsTrigger>
                  <TabsTrigger value="arrival" className="flex-1">
                    {t("plans.labels.arrival")}
                  </TabsTrigger>
                  <TabsTrigger value="waypoints" className="flex-1">
                    {t("planDetail.routeTabs.waypoints")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t("planDetail.flightDetails.title")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4">
                        <Fact label={t("plans.labels.flightType")} value={typeLabel} />
                        <Fact label={t("plans.labels.passengers")} value={fp.number_of_passengers ?? "—"} />
                        <Fact
                          label={t("common:labels.distance")}
                          value={fp.distance_km ? `${formatDecimal(fp.distance_km)} km` : "—"}
                        />
                        <Fact label={t("planDetail.flightDetails.estimatedDuration")} value={duration ?? "—"} />
                        {fp.performance_profile && (
                          <Fact label={t("planDetail.flightDetails.performanceProfile")} value={fp.performance_profile} />
                        )}
                        {fp.estimated_fuel_liters && (
                          <Fact label={t("plans.labels.estimatedFuel")} value={`${formatDecimal(fp.estimated_fuel_liters)} L`} />
                        )}
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t("planDetail.aircraftAndPilot.title")}</CardTitle>
                      {!aircraft && <CardDescription>{t("planDetail.aircraftAndPilot.noAircraft")}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4">
                        {aircraft && (
                          <>
                            <Fact label={t("planDetail.aircraftAndPilot.registration")} value={aircraft.registration_number} />
                            <Fact label={t("planDetail.aircraftAndPilot.model")} value={aircraft.model || "—"} />
                            {aircraft.cruiseSpeed && (
                              <Fact label={t("plans.labels.cruiseSpeed")} value={`${aircraft.cruiseSpeed} km/h`} />
                            )}
                            {aircraft.consumption && (
                              <Fact label={t("planDetail.aircraftAndPilot.consumption")} value={`${aircraft.consumption} L/h`} />
                            )}
                            {aircraft.maxAltitude && <Fact label={t("planDetail.aircraftAndPilot.ceiling")} value={`${formatDecimal(aircraft.maxAltitude, 0)} ft`} />}
                          </>
                        )}
                        <Fact label={t("planDetail.aircraftAndPilot.pilotInCommand")} value={pilotName || "—"} />
                      </dl>
                    </CardContent>
                  </Card>

                  {fp.weather_conditions && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{t("planDetail.weather.title")}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="break-words rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                          {fp.weather_conditions}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="departure" className="mt-4">
                  <AirportInfo airportInfo={departureInfo} type="departure" weather={weatherData.departure ?? undefined} />
                </TabsContent>

                <TabsContent value="arrival" className="mt-4">
                  <AirportInfo airportInfo={arrivalInfo} type="arrival" weather={weatherData.arrival ?? undefined} />
                </TabsContent>

                <TabsContent value="waypoints" className="mt-4">
                  <WaypointInfo waypoints={waypoints} onFocusWaypoint={handleFocusWaypoint} />
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:col-span-3">
              <div className="map-container relative h-[420px] overflow-hidden rounded-xl border bg-muted lg:h-[600px]">
                {hasMapData ? (
                  <MapboxMap
                    waypoints={waypoints}
                    departure={{
                      icao: departureInfo.ICAO,
                      name: departureInfo.name,
                      lat: Number.parseFloat(departureInfo.lat),
                      lon: Number.parseFloat(departureInfo.lon),
                    }}
                    arrival={{
                      icao: arrivalInfo.ICAO,
                      name: arrivalInfo.name,
                      lat: Number.parseFloat(arrivalInfo.lat),
                      lon: Number.parseFloat(arrivalInfo.lon),
                    }}
                    focusPoint={mapFocus}
                  />
                ) : (
                  <EmptyState
                    className="h-full rounded-none border-0"
                    icon={MapPinOff}
                    title={t("planDetail.map.unavailableTitle")}
                    description={t("planDetail.map.unavailableDescription")}
                  />
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="navigation" forceMount className="mt-0 space-y-6 data-[state=inactive]:hidden">
          {hasNavigation ? (
            <>
              <VerticalProfile waypoints={waypoints} maxAltitude={aircraft?.maxAltitude} />
              <NavLog
                waypoints={waypoints}
                aircraft={aircraft}
                pilotName={pilotName}
                flightType={fp.flight_type}
                totalDistanceKm={fp.distance_km}
                totalTimeHours={fp.estimated_flight_time}
                departureIcao={departureInfo.ICAO}
                arrivalIcao={arrivalInfo.ICAO}
              />
            </>
          ) : (
            <EmptyState
              icon={FileSearch}
              title={t("planDetail.navigation.emptyTitle")}
              description={t("planDetail.navigation.emptyDescription")}
            />
          )}
        </TabsContent>

        {showFuelTab && (
          <TabsContent value="fuel" forceMount className="mt-0 data-[state=inactive]:hidden">
            <FuelBriefing
              fuelPolicy={fuelPolicy}
              windSummary={windSummary}
              performanceProfile={fp.performance_profile}
              flightType={fp.flight_type}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
