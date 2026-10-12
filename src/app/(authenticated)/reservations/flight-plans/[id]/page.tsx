"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@apollo/client"
import dynamic from "next/dynamic"
import Link from "next/link"
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
import { FlightSummary } from "@/components/flight/FlightSummary"
import { AirportInfo } from "@/components/flight/AirportInfo"
import { WaypointInfo } from "@/components/flight/WaypointInfo"
import { FuelBriefing, hasFuelBriefing } from "@/components/flight/FuelBriefing"
import { NavLog } from "@/components/flight/NavLog"
import { VerticalProfile } from "@/components/flight/VerticalProfile"
import { OFPExport } from "@/components/flight/OFPExport"
import { FlightPlanActions } from "@/components/flight/flight-action-plans"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { flightPlanState } from "@/components/flight-plan/flight-plan-state"
import { GET_FLIGHT_PLAN_BY_ID } from "@/graphql/flights"
import { getWeather } from "@/lib/weather"
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

const BackButton = () => (
  <Button variant="outline" asChild>
    <Link href="/reservations/flight-plans">
      <ArrowLeft className="h-4 w-4" />
      Mes plans de vol
    </Link>
  </Button>
)

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FlightPlanDetails() {
  const { id } = useParams()
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
        <PageHeader className="mb-0" title="Plan de vol" actions={<BackButton />} />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Skeleton className="h-[420px] rounded-xl lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl lg:col-span-3" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title="Plan de vol" actions={<BackButton />} />
        <ErrorState
          description="Le plan de vol n'a pas pu être chargé. Vérifiez votre connexion puis réessayez."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!fp) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title="Plan de vol" />
        <EmptyState
          icon={FileSearch}
          title="Plan de vol introuvable"
          description="Ce plan de vol n'existe pas ou vous n'y avez pas accès."
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
    { label: "Date", value: dateStr },
    { label: "Avion", value: aircraft ? `${aircraft.registration_number}${aircraft.model ? ` · ${aircraft.model}` : ""}` : "—" },
    {
      label: "Passagers",
      value: fp.number_of_passengers != null ? fp.number_of_passengers : "—",
    },
    fp.estimated_fuel_liters
      ? { label: "Carburant estimé", value: `${formatDecimal(fp.estimated_fuel_liters, 0)} L` }
      : { label: "Type de vol", value: typeLabel },
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
        description={[`Plan de vol ${typeLabel}`, fp.reservation?.id ? `réservation n° ${fp.reservation.id}` : null]
          .filter(Boolean)
          .join(" · ")}
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
            {!fp.closed_at && (
              <Button asChild>
                <Link href={`/close_flight/${fp.id}`}>Clôturer le vol</Link>
              </Button>
            )}
          </>
        }
      />

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
          <AlertTitle>Avant le départ</AlertTitle>
          <AlertDescription>
            Vérifiez les NOTAM et la météo, et assurez-vous d&apos;avoir à bord tous les documents nécessaires au vol.
          </AlertDescription>
        </Alert>
      )}

      {/* Panels stay mounted so the map is not rebuilt and printing shows every section. */}
      <Tabs value={section} onValueChange={setSection} className="space-y-6">
        <TabsList className="tabs-list">
          <TabsTrigger value="route">Route et aérodromes</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          {showFuelTab && <TabsTrigger value="fuel">Carburant et vent</TabsTrigger>}
        </TabsList>

        <TabsContent value="route" forceMount className="mt-0 data-[state=inactive]:hidden">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Tabs value={routePanel} onValueChange={handleRoutePanelChange}>
                <TabsList className="tabs-list w-full">
                  <TabsTrigger value="overview" className="flex-1">
                    Vol
                  </TabsTrigger>
                  <TabsTrigger value="departure" className="flex-1">
                    Départ
                  </TabsTrigger>
                  <TabsTrigger value="arrival" className="flex-1">
                    Arrivée
                  </TabsTrigger>
                  <TabsTrigger value="waypoints" className="flex-1">
                    Points
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Détails du vol</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4">
                        <Fact label="Type de vol" value={typeLabel} />
                        <Fact label="Passagers" value={fp.number_of_passengers ?? "—"} />
                        <Fact
                          label="Distance"
                          value={fp.distance_km ? `${formatDecimal(fp.distance_km)} km` : "—"}
                        />
                        <Fact label="Durée estimée" value={duration ?? "—"} />
                        {fp.performance_profile && (
                          <Fact label="Profil de performance" value={fp.performance_profile} />
                        )}
                        {fp.estimated_fuel_liters && (
                          <Fact label="Carburant estimé" value={`${formatDecimal(fp.estimated_fuel_liters)} L`} />
                        )}
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Avion et pilote</CardTitle>
                      {!aircraft && <CardDescription>Aucun avion n&apos;est associé à ce plan de vol.</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4">
                        {aircraft && (
                          <>
                            <Fact label="Immatriculation" value={aircraft.registration_number} />
                            <Fact label="Modèle" value={aircraft.model || "—"} />
                            {aircraft.cruiseSpeed && (
                              <Fact label="Vitesse de croisière" value={`${aircraft.cruiseSpeed} km/h`} />
                            )}
                            {aircraft.consumption && (
                              <Fact label="Consommation" value={`${aircraft.consumption} L/h`} />
                            )}
                            {aircraft.maxAltitude && <Fact label="Plafond" value={`${aircraft.maxAltitude} ft`} />}
                          </>
                        )}
                        <Fact label="Commandant de bord" value={pilotName || "—"} />
                      </dl>
                    </CardContent>
                  </Card>

                  {fp.weather_conditions && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Météo relevée (METAR)</CardTitle>
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
                    title="Carte indisponible"
                    description="Les coordonnées des aérodromes ne sont pas enregistrées pour ce plan de vol."
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
              title="Pas de journal de navigation"
              description="Le profil vertical et le journal de navigation sont calculés pour les plans de vol générés automatiquement à partir d'une réservation."
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
