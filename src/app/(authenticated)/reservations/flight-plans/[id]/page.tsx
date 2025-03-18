"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@apollo/client"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/hooks/use-toast"
import { FlightSummary } from "@/components/flight/FlightSummary"
import { AirportInfo } from "@/components/flight/AirportInfo"
import { WaypointInfo } from "@/components/flight/WaypointInfo"
import { FlightPlanActions } from "@/components/flight/flight-action-plans"
import { GET_FLIGHT_PLAN_BY_ID } from "@/graphql/flights"
import { getWeather } from "@/lib/weather"
import { AlertTriangle } from "lucide-react"
import type { Weather } from "@/interfaces/weather"

import "@/styles/print.css"

const MapboxMap = dynamic(() => import("@/components/flight/MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted rounded-lg">
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  ),
})

export default function FlightPlanDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState("overview")
  const [showMap, setShowMap] = useState(false)
  const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | undefined>(undefined)
  const { toast } = useToast()
  const [weatherData, setWeatherData] = useState<{
    departure: Weather | null
    arrival: Weather | null
  }>({
    departure: null,
    arrival: null,
  })

  const { loading, error, data } = useQuery(GET_FLIGHT_PLAN_BY_ID, {
    variables: { id: Number.parseInt(id as string) },
  })

  useEffect(() => {
    if (data && data.getFlightById) {
      const timer = setTimeout(() => setShowMap(true), 500)
      return () => clearTimeout(timer)
    }
  }, [data])

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du chargement du plan de vol. Veuillez réessayer plus tard.",
        variant: "destructive",
      })
    }
  }, [error, toast])

  useEffect(() => {
    if (data && data.getFlightById) {
      toast({
        title: "Avertissement",
        description:
          "Vérifiez les NOTAMs et les conditions météorologiques avant le départ. Assurez-vous d'avoir tous les documents nécessaires pour votre vol.",
        duration: 10000,
      })

      const fetchWeather = async () => {
        const flight = data.getFlightById
        try {
          const departureInfo = JSON.parse(flight.departure_airport_info)
          const arrivalInfo = JSON.parse(flight.arrival_airport_info)

          const [departureWeather, arrivalWeather] = await Promise.all([
            getWeather(departureInfo.lat, departureInfo.lon),
            getWeather(arrivalInfo.lat, arrivalInfo.lon),
          ])

          setWeatherData({
            departure: departureWeather
              ? {
                  temperature: Number.parseFloat(departureWeather.main.temp),
                  conditions: departureWeather.weather[0].description,
                  icon: departureWeather.weather[0].icon,
                  wind: {
                    speed: departureWeather.wind.speed,
                    direction: departureWeather.wind.deg,
                  },
                  humidity: departureWeather.main.humidity,
                  pressure: departureWeather.main.pressure,
                  visibility: departureWeather.visibility,
                }
              : null,
            arrival: arrivalWeather
              ? {
                  temperature: Number.parseFloat(arrivalWeather.main.temp),
                  conditions: arrivalWeather.weather[0].description,
                  icon: arrivalWeather.weather[0].icon,
                  wind: {
                    speed: arrivalWeather.wind.speed,
                    direction: arrivalWeather.wind.deg,
                  },
                  humidity: arrivalWeather.main.humidity,
                  pressure: arrivalWeather.main.pressure,
                  visibility: arrivalWeather.visibility,
                }
              : null,
          })
        } catch (error) {
          console.error("Error fetching weather data:", error)
          toast({
            title: "Erreur",
            description: "Impossible de récupérer les données météorologiques. Veuillez réessayer plus tard.",
            variant: "destructive",
          })
          setWeatherData({ departure: null, arrival: null })
        }
      }

      fetchWeather()
    }
  }, [data, toast])

  const updateActiveTab = (tab: string) => {
    setActiveTab(tab)

    if (data && data.getFlightById) {
      const flight = data.getFlightById
      const departureInfo = JSON.parse(flight.departure_airport_info)
      const arrivalInfo = JSON.parse(flight.arrival_airport_info)
      const waypoints = JSON.parse(flight.waypoints)

      switch (tab) {
        case "overview":
          setMapFocus(undefined)
          break
        case "departure":
          setMapFocus({
            center: [departureInfo.lon, departureInfo.lat],
            zoom: 10,
          })
          break
        case "arrival":
          setMapFocus({
            center: [arrivalInfo.lon, arrivalInfo.lat],
            zoom: 10,
          })
          break
        case "waypoints":
          if (waypoints && waypoints.length > 0) {
            const lats = waypoints.map((wp: any) => wp.lat)
            const lons = waypoints.map((wp: any) => wp.lon)
            const centerLat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length
            const centerLon = lons.reduce((a: number, b: number) => a + b, 0) / lons.length

            setMapFocus({
              center: [centerLon, centerLat],
              zoom: 5,
            })
          }
          break
      }
    }
  }

  const handleFocusWaypoint = (index: number) => {
    if (data && data.getFlightById) {
      const waypoints = JSON.parse(data.getFlightById.waypoints)
      if (waypoints && waypoints[index]) {
        setMapFocus({
          center: [waypoints[index].lon, waypoints[index].lat],
          zoom: 12,
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Chargement du Plan de Vol...</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.getFlightById) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Plan de Vol</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Une erreur s'est produite lors du chargement du plan de vol. Veuillez réessayer plus tard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const flightPlanData = data.getFlightById
  const departureInfo = JSON.parse(flightPlanData.departure_airport_info)
  const arrivalInfo = JSON.parse(flightPlanData.arrival_airport_info)
  const waypoints = JSON.parse(flightPlanData.waypoints)

  return (
    <div className="container mx-auto px-4 py-8" data-print-date={new Date().toLocaleString()}>
      <h1 className="text-3xl font-bold mb-8 text-center">
        Plan de Vol{" "}
        <span className="text-primary">
          {departureInfo.ICAO} → {arrivalInfo.ICAO}
        </span>
      </h1>

      <div className="mb-8">
        <FlightSummary
          departure={departureInfo.ICAO}
          arrival={arrivalInfo.ICAO}
          date={
            flightPlanData.reservation?.start_time
              ? new Date(flightPlanData.reservation.start_time).toLocaleDateString()
              : "N/A"
          }
          departureTime={
            flightPlanData.reservation?.start_time
              ? new Date(flightPlanData.reservation.start_time).toLocaleTimeString()
              : "N/A"
          }
          arrivalTime={
            flightPlanData.reservation?.end_time
              ? new Date(flightPlanData.reservation.end_time).toLocaleTimeString()
              : "N/A"
          }
          duration={`${flightPlanData.estimated_flight_time} heures`}
          flightNumber={flightPlanData.reservation?.id ? `RES-${flightPlanData.reservation.id}` : "N/A"}
          flightType={flightPlanData.flight_type}
          distance={flightPlanData.distance_km}
          passengers={flightPlanData.number_of_passengers}
          departureWeather={weatherData.departure ?? undefined}
          arrivalWeather={weatherData.arrival ?? undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={updateActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="departure">Départ</TabsTrigger>
              <TabsTrigger value="arrival">Arrivée</TabsTrigger>
              <TabsTrigger value="waypoints">Waypoints</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Détails du vol</h3>
                      <ul className="space-y-2">
                        <li>
                          <strong>Type de vol:</strong> {flightPlanData.flight_type}
                        </li>
                        <li>
                          <strong>Distance:</strong> {flightPlanData.distance_km.toFixed(2)} km
                        </li>
                        <li>
                          <strong>Durée estimée:</strong> {flightPlanData.estimated_flight_time} heures
                        </li>
                        <li>
                          <strong>Passagers:</strong> {flightPlanData.number_of_passengers || "Non spécifié"}
                        </li>
                      </ul>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Réservation</h3>
                      {flightPlanData.reservation ? (
                        <ul className="space-y-2">
                          <li>
                            <strong>ID:</strong> {flightPlanData.reservation.id}
                          </li>
                          <li>
                            <strong>Avion:</strong> {flightPlanData.reservation.aircraft.registration_number}
                          </li>
                          <li>
                            <strong>Statut:</strong> {flightPlanData.reservation.status}
                          </li>
                          <li>
                            <strong>But:</strong> {flightPlanData.reservation.purpose || "Non spécifié"}
                          </li>
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">Aucune réservation associée</p>
                      )}
                    </div>
                  </div>

                  {flightPlanData.weather_conditions && (
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-2">Conditions météorologiques</h3>
                      <p>{flightPlanData.weather_conditions}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departure">
              <AirportInfo airportInfo={departureInfo} type="departure" weather={weatherData.departure || undefined} />
            </TabsContent>

            <TabsContent value="arrival">
              <AirportInfo airportInfo={arrivalInfo} type="arrival" weather={weatherData.arrival ?? undefined} />
            </TabsContent>

            <TabsContent value="waypoints">
              <WaypointInfo waypoints={waypoints} onFocusWaypoint={handleFocusWaypoint} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="relative h-[600px] rounded-lg overflow-hidden shadow-lg">
          <AnimatePresence>
            {showMap && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                <MapboxMap
                  waypoints={[
                    [Number.parseFloat(departureInfo.lon), Number.parseFloat(departureInfo.lat)],
                    ...waypoints.map((wp: any) => [wp.lon, wp.lat]),
                    [Number.parseFloat(arrivalInfo.lon), Number.parseFloat(arrivalInfo.lat)],
                  ]}
                  departure={{
                    name: departureInfo.ICAO,
                    position: [Number.parseFloat(departureInfo.lon), Number.parseFloat(departureInfo.lat)],
                  }}
                  arrival={{
                    name: arrivalInfo.ICAO,
                    position: [Number.parseFloat(arrivalInfo.lon), Number.parseFloat(arrivalInfo.lat)],
                  }}
                  focusPoint={mapFocus}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-8">
        <FlightPlanActions
          flightPlanId={typeof id === "string" ? id : Array.isArray(id) ? id[0] : 0}
          flightDetails={{
            departure: departureInfo.ICAO,
            arrival: arrivalInfo.ICAO,
            date: flightPlanData.reservation?.start_time
              ? new Date(flightPlanData.reservation.start_time).toLocaleDateString()
              : "N/A",
          }}
        />
      </div>
    </div>
  )
}
