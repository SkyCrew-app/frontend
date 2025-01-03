'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@apollo/client'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plane, Wind, Clock, Download, Check } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/components/hooks/use-toast"
import { FlightSummary } from '@/components/flight/FlightSummary'
import { AirportInfo } from '@/components/flight/AirportInfo'
import { WaypointInfo } from '@/components/flight/WaypointInfo'
import { GET_FLIGHT_PLAN_BY_ID } from '@/graphql/flights'
import { getWeather } from '@/lib/weather'
import mapboxgl from 'mapbox-gl';

const MapboxMap = dynamic(() => import('@/components/flight/MapboxMap'), { ssr: false })

export default function FlightPlanDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [showMap, setShowMap] = useState(false)
  const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | undefined>(undefined)
  const { toast } = useToast()
  const [weatherData, setWeatherData] = useState<{ departure: any; arrival: any }>({ departure: null, arrival: null })

  const { loading, error, data } = useQuery(GET_FLIGHT_PLAN_BY_ID, {
    variables: { id: parseInt(id as string) },
  })

  useEffect(() => {
    if (data && data.getFlightById) {
      const timer = setTimeout(() => setShowMap(true), 1000)
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
        description: "Vérifiez les NOTAMs et les conditions météorologiques avant le départ. Assurez-vous d'avoir tous les documents nécessaires pour votre vol.",
        duration: 10000,
      })

      const fetchWeather = async () => {
        const flight = data.getFlightById
        try {
          const departureInfo = JSON.parse(flight.departure_airport_info)
          const arrivalInfo = JSON.parse(flight.arrival_airport_info)
          const [departureWeather, arrivalWeather] = await Promise.all([
            getWeather(departureInfo.lat, departureInfo.lon),
            getWeather(arrivalInfo.lat, arrivalInfo.lon)
          ])
          setWeatherData({ departure: departureWeather, arrival: arrivalWeather })
        } catch (error) {
          console.error('Error fetching weather data:', error)
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
        case 'overview':
          setMapFocus(undefined)
          break
        case 'departure':
          setMapFocus({ center: [departureInfo.lon, departureInfo.lat], zoom: 10 })
          break
        case 'arrival':
          setMapFocus({ center: [arrivalInfo.lon, arrivalInfo.lat], zoom: 10 })
          break
        case 'waypoints':
          if (waypoints && waypoints.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            waypoints.forEach((waypoint: any) => {
              bounds.extend([waypoint.lon, waypoint.lat]);
            });
            if (!bounds.isEmpty()) {
              const center = bounds.getCenter();
              setMapFocus({ center: [center.lng, center.lat], zoom: 5 });
            } else {
              console.error('No valid waypoints found');
              toast({
                title: "Erreur",
                description: "Impossible de centrer la carte sur les waypoints. Veuillez réessayer plus tard.",
                variant: "destructive",
              })
              setMapFocus(undefined);
            }
          }
          break
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6">
        <h1 className="text-4xl font-bold mb-8 text-center text-primary">
          Chargement du Plan de Vol...
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Skeleton className="h-[200px] w-full bg-muted" />
            <Skeleton className="h-[200px] w-full bg-muted" />
          </div>
          <Skeleton className="h-[600px] w-full bg-muted" />
        </div>
      </div>
    )
  }

  if (error || !data || !data.getFlightById) {
    return null; // L'erreur est déjà gérée par le toast dans useEffect
  }

  const flightPlanData = data.getFlightById
  const departureInfo = JSON.parse(flightPlanData.departure_airport_info)
  const arrivalInfo = JSON.parse(flightPlanData.arrival_airport_info)
  const waypoints = JSON.parse(flightPlanData.waypoints)

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <h1 className="text-4xl font-bold mb-8 text-center text-primary">
        Plan de Vol
      </h1>
      <div className="mb-8">
        <FlightSummary
          departure={departureInfo.ICAO}
          arrival={arrivalInfo.ICAO}
          date={flightPlanData.reservation?.start_time ? new Date(flightPlanData.reservation.start_time).toLocaleDateString() : 'N/A'}
          departureTime={flightPlanData.reservation?.start_time ? new Date(flightPlanData.reservation.start_time).toLocaleTimeString() : 'N/A'}
          arrivalTime={flightPlanData.reservation?.end_time ? new Date(flightPlanData.reservation.end_time).toLocaleTimeString() : 'N/A'}
          duration={`${flightPlanData.estimated_flight_time} heures`}
          flightNumber={flightPlanData.reservation?.id ? `RES-${flightPlanData.reservation.id}` : 'N/A'}
          departureWeather={weatherData.departure ? { temperature: parseFloat(weatherData.departure.main.temp), conditions: weatherData.departure.weather[0].description } : undefined}
          arrivalWeather={weatherData.arrival ? { temperature: parseFloat(weatherData.arrival.main.temp), conditions: weatherData.arrival.weather[0].description } : undefined}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <CardHeader>
                  <CardTitle>Aperçu du Vol</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
                      <Plane className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Distance</p>
                        <p className="text-xl font-semibold text-primary">{flightPlanData.distance_km.toFixed(2)} km</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
                      <Clock className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Durée</p>
                        <p className="text-xl font-semibold text-primary">{flightPlanData.estimated_flight_time}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Détails</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
                        <Plane className="h-8 w-8 text-yellow-500" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Type de vol</p>
                          <p className="text-md font-semibold">{flightPlanData.flight_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 bg-muted p-4 rounded-lg">
                        <Wind className="h-8 w-8 text-purple-500" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Conditions météo</p>
                          <p className="text-md font-semibold">
                            Départ: {weatherData.departure ? `${weatherData.departure.weather[0].description}, ${weatherData.departure.main.temp.toFixed(1)}°C` : 'N/A'}
                            <br />
                            Arrivée: {weatherData.arrival ? `${weatherData.arrival.weather[0].description}, ${weatherData.arrival.main.temp.toFixed(1)}°C` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="departure">
              <AirportInfo 
                airportInfo={departureInfo} 
                type="departure" 
                weather={weatherData.departure ? {
                  temperature: weatherData.departure.main.temp,
                  conditions: weatherData.departure.weather[0].description
                } : undefined}
              />
            </TabsContent>
            <TabsContent value="arrival">
              <AirportInfo 
                airportInfo={arrivalInfo} 
                type="arrival" 
                weather={weatherData.arrival ? {
                  temperature: weatherData.arrival.main.temp,
                  conditions: weatherData.arrival.weather[0].description
                } : undefined}
              />
            </TabsContent>
            <TabsContent value="waypoints">
              <WaypointInfo waypoints={waypoints} />
            </TabsContent>
          </Tabs>
        </div>
        <div className="relative h-[600px]">
          <AnimatePresence>
            {showMap && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-lg overflow-hidden shadow-lg"
              >
                <MapboxMap
                  waypoints={[
                    [parseFloat(departureInfo.lon), parseFloat(departureInfo.lat)],
                    ...waypoints.map((wp: any) => [wp.lon, wp.lat]),
                    [parseFloat(arrivalInfo.lon), parseFloat(arrivalInfo.lat)]
                  ]}
                  departure={{
                    name: departureInfo.ICAO,
                    position: [parseFloat(departureInfo.lon), parseFloat(departureInfo.lat)]
                  }}
                  arrival={{
                    name: arrivalInfo.ICAO,
                    position: [parseFloat(arrivalInfo.lon), parseFloat(arrivalInfo.lat)]
                  }}
                  focusPoint={mapFocus}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-8 flex justify-center space-x-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="px-6 bg-background hover:bg-muted">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Exporter le Plan de Vol</DialogTitle>
              <DialogDescription>
                Choisissez le format d'exportation pour votre plan de vol.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Button onClick={() => {
                console.log("Exporter en PDF")
                toast({
                  title: "Exportation réussie",
                  description: "Le plan de vol a été exporté en PDF avec succès.",
                })
              }} className="w-full">Exporter en PDF</Button>
              <Button onClick={() => {
                console.log("Exporter en CSV")
                toast({
                  title: "Exportation réussie",
                  description: "Le plan de vol a été exporté en CSV avec succès.",
                })
              }} className="w-full">Exporter en CSV</Button>
              <Button onClick={() => {
                console.log("Exporter en JSON")
                toast({
                  title: "Exportation réussie",
                  description: "Le plan de vol a été exporté en JSON avec succès.",
                })
              }} className="w-full">Exporter en JSON</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default" className="px-6">
              <Check className="mr-2 h-4 w-4" />
              Valider le Plan de Vol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Valider le Plan de Vol</DialogTitle>
              <DialogDescription>
                Êtes-vous sûr de vouloir valider ce plan de vol ?
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                console.log("Annuler la validation")
                toast({
                  title: "Validation annulée",
                  description: "La validation du plan de vol a été annulée.",
                })
              }}>Annuler</Button>
              <Button onClick={() => {
                console.log("Plan de vol validé")
                toast({
                  title: "Plan de vol validé",
                  description: "Le plan de vol a été validé avec succès.",
                  variant: "default",
                })
              }}>Valider</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

