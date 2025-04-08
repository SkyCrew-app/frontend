"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useMutation } from "@apollo/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Stepper } from "@/components/ui/stepper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AirportSearch } from "@/components/my-plan/airport-search"
import { WaypointSearch } from "@/components/my-plan/waypoint-search"
import { RouteMap } from "@/components/my-plan/route-map"
import { Spinner } from "@/components/ui/spinner"
import { Sparkles, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CREATE_FLIGHT, GENERATE_FLIGHT_PLAN } from "@/graphql/flights"
import { toast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { aviationAPI, calculateDistance, calculateEstimatedTime } from "@/lib/aviation-api"
import type { Airport, Waypoint } from "@/lib/aviation-api"

enum FlightCategory {
  VFR = "VFR",
  IFR = "IFR",
  SVFR = "SVFR",
}

const steps = ["Informations de base", "Route", "Détails du vol", "Confirmation"]

export default function CreateCustomFlightPlan() {
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  const [currentStep, setCurrentStep] = useState(0)
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

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const handleNext = () => {
    if (currentStep === 0) {
      if (!flightPlan.origin_icao || !flightPlan.destination_icao) {
        toast({
          variant: "destructive",
          title: "Erreur de validation",
          description: "Veuillez sélectionner les aéroports de départ et d'arrivée.",
        })
        return
      }
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
    try {
      const { data } = await createFlight({
        variables: {
          createFlightInput: {
            ...flightPlan,
            user_id: userId,
            reservation_id: reservationId ? Number.parseInt(reservationId) : null,
          },
        },
      })

      if (data && data.createFlight) {
        toast({
          title: "Plan de vol créé",
          description: "Votre plan de vol a été créé avec succès.",
        })
        router.push(`/flight-plans/${data.createFlight.id}`)
      }
    } catch (error) {
      console.error("Error creating flight:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du plan de vol.",
      })
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-10 text-center">Créer un Plan de Vol Personnalisé</h1>

      <Tabs defaultValue="manual" className="mb-10">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Création Manuelle</TabsTrigger>
          <TabsTrigger value="ai">Génération IA</TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Création Manuelle du Plan de Vol</CardTitle>
            </CardHeader>
            <CardContent>
              <Stepper steps={steps} currentStep={currentStep} />

              <div className="mt-6 space-y-6">
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Aéroport de départ</Label>
                      <AirportSearch
                        value={flightPlan.origin_icao}
                        onChange={(value) => setFlightPlan((prev) => ({ ...prev, origin_icao: value }))}
                        label="Sélectionner l'aéroport de départ"
                        placeholder="Rechercher par OACI, nom ou ville..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Aéroport d'arrivée</Label>
                      <AirportSearch
                        value={flightPlan.destination_icao}
                        onChange={(value) => setFlightPlan((prev) => ({ ...prev, destination_icao: value }))}
                        label="Sélectionner l'aéroport d'arrivée"
                        placeholder="Rechercher par OACI, nom ou ville..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Type de vol</Label>
                      <Select
                        value={flightPlan.flight_type}
                        onValueChange={(value) =>
                          setFlightPlan((prev) => ({ ...prev, flight_type: value as FlightCategory }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type de vol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={FlightCategory.VFR}>VFR</SelectItem>
                          <SelectItem value={FlightCategory.IFR}>IFR</SelectItem>
                          <SelectItem value={FlightCategory.SVFR}>SVFR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <RouteMap
                      departure={departureAirport}
                      arrival={arrivalAirport}
                      waypoints={routeWaypoints}
                      className="mb-4"
                    />

                    <div className="space-y-2">
                      <Label>Waypoints</Label>
                      <WaypointSearch
                        waypoints={flightPlan.waypoints}
                        onChange={(waypoints) => setFlightPlan((prev) => ({ ...prev, waypoints }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Vitesse de croisière (kts)</Label>
                        <Input
                          type="number"
                          value={flightPlan.cruise_speed}
                          onChange={(e) =>
                            setFlightPlan((prev) => ({
                              ...prev,
                              cruise_speed: Number(e.target.value),
                            }))
                          }
                          min={60}
                          max={500}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Altitude de croisière (ft)</Label>
                        <Input
                          type="number"
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
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Distance totale: {flightPlan.distance_km} km
                          <br />
                          Temps de vol estimé: {Math.floor(flightPlan.estimated_flight_time / 60)}h{" "}
                          {flightPlan.estimated_flight_time % 60}min
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre de passagers</Label>
                      <Input
                        type="number"
                        value={flightPlan.number_of_passengers}
                        onChange={(e) =>
                          setFlightPlan((prev) => ({
                            ...prev,
                            number_of_passengers: Number(e.target.value),
                          }))
                        }
                        min={1}
                        max={20}
                      />
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Résumé du plan de vol</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">Départ:</p>
                        <p>{departureAirport?.name || flightPlan.origin_icao}</p>
                      </div>
                      <div>
                        <p className="font-medium">Arrivée:</p>
                        <p>{arrivalAirport?.name || flightPlan.destination_icao}</p>
                      </div>
                      <div>
                        <p className="font-medium">Type de vol:</p>
                        <p>{flightPlan.flight_type}</p>
                      </div>
                      <div>
                        <p className="font-medium">Passagers:</p>
                        <p>{flightPlan.number_of_passengers}</p>
                      </div>
                      <div>
                        <p className="font-medium">Distance:</p>
                        <p>{flightPlan.distance_km} km</p>
                      </div>
                      <div>
                        <p className="font-medium">Temps estimé:</p>
                        <p>
                          {Math.floor(flightPlan.estimated_flight_time / 60)}h {flightPlan.estimated_flight_time % 60}
                          min
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Vitesse de croisière:</p>
                        <p>{flightPlan.cruise_speed} kts</p>
                      </div>
                      <div>
                        <p className="font-medium">Altitude de croisière:</p>
                        <p>{flightPlan.cruise_altitude} ft</p>
                      </div>
                    </div>

                    {routeWaypoints.length > 0 && (
                      <div>
                        <p className="font-medium">Waypoints:</p>
                        <p>{routeWaypoints.map((w) => w.ident).join(" → ")}</p>
                      </div>
                    )}

                    <RouteMap departure={departureAirport} arrival={arrivalAirport} waypoints={routeWaypoints} />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button onClick={handlePrevious} disabled={currentStep === 0} variant="outline">
                Précédent
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>Suivant</Button>
              ) : (
                <Button onClick={handleSubmit} disabled={createLoading} className="bg-green-500 hover:bg-green-600">
                  {createLoading ? (
                    <>
                      <Spinner className="mr-2" />
                      Création en cours...
                    </>
                  ) : (
                    "Créer le plan de vol"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Génération IA du Plan de Vol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Aéroport de départ</Label>
                  <AirportSearch
                    value={flightPlan.origin_icao}
                    onChange={(value) => setFlightPlan((prev) => ({ ...prev, origin_icao: value }))}
                    label="Sélectionner l'aéroport de départ"
                    placeholder="Rechercher par OACI, nom ou ville..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Aéroport d'arrivée</Label>
                  <AirportSearch
                    value={flightPlan.destination_icao}
                    onChange={(value) => setFlightPlan((prev) => ({ ...prev, destination_icao: value }))}
                    label="Sélectionner l'aéroport d'arrivée"
                    placeholder="Rechercher par OACI, nom ou ville..."
                  />
                </div>

                <Button
                  onClick={async () => {
                    if (!flightPlan.origin_icao || !flightPlan.destination_icao) {
                      toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Veuillez sélectionner les aéroports de départ et d'arrivée.",
                      })
                      return
                    }

                    try {
                      const { data } = await generateFlightPlan({
                        variables: {
                          origin_icao: flightPlan.origin_icao,
                          destination_icao: flightPlan.destination_icao,
                          user_id: Number.parseInt(userId || "0", 10),
                          reservation_id: reservationId ? Number.parseInt(reservationId) : null,
                        },
                      })

                      if (data && data.generateFlightPlan) {
                        toast({
                          title: "Plan de vol généré",
                          description: "Votre plan de vol a été généré avec succès.",
                        })
                        router.push(`/reservations/flight-plans/${data.generateFlightPlan.id}`)
                      }
                    } catch (error) {
                      console.error("Error generating flight plan:", error)
                      toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Une erreur est survenue lors de la génération du plan de vol.",
                      })
                    }
                  }}
                  disabled={generateLoading}
                  className="w-full"
                >
                  {generateLoading ? (
                    <>
                    <div className="flex justify-center items-center mt-4">
                      <Spinner />
                      <span className="ml-2">Génération du plan de vol en cours...</span>
                    </div>
                    </>
                  ) : (
                    "Générer un plan de vol"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
