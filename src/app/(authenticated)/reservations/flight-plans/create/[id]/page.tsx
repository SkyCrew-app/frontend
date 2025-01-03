"use client"

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useMutation, useQuery } from '@apollo/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Stepper } from "@/components/ui/stepper"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WaypointSearch } from "@/components/flight/WaypointSearch"
import { Spinner } from "@/components/ui/spinner"
import { Sparkles } from 'lucide-react'
import { CREATE_FLIGHT, GENERATE_FLIGHT_PLAN } from '@/graphql/flights'
import { GET_USER_BY_EMAIL } from '@/graphql/user'
import { toast } from '@/components/hooks/use-toast'
import { jwtDecode } from 'jwt-decode'

enum FlightCategory {
  VFR = "VFR",
  IFR = "IFR"
}

const steps = [
  "Informations de base",
  "Détails du vol",
  "Waypoints",
  "Confirmation"
]

interface TokenPayload {
  email: string;
}

export default function CreateCustomFlightPlan() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decodedToken = jwtDecode<TokenPayload>(token);
        setUserEmail(decodedToken.email);
      } catch (error) {
        console.log('Erreur lors du décodage du token:', error);
      }
    } else {
      console.log('Aucun token trouvé dans le localStorage.');
    }
  }, []);

  const { data: userData, error: errorUser } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: userEmail || '' },
    skip: !userEmail,
  });

  useEffect(() => {
    if (userData && userData.userByEmail) {
      setUserId(userData.userByEmail.id);
    }

    if (errorUser) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la récupération des données",
        description: "Une erreur est survenue lors de la récupération des informations de l'utilisateur.",
      });
    }
  }, [userData, errorUser, toast]);

  const [currentStep, setCurrentStep] = useState(0)
  const [flightPlan, setFlightPlan] = useState({
    flight_hours: 0,
    flight_type: FlightCategory.VFR,
    origin_icao: "",
    destination_icao: "",
    number_of_passengers: 0,
    encoded_polyline: "",
    distance_km: 0,
    estimated_flight_time: 0,
    waypoints: [] as string[]
  })
  const params = useParams()
  const reservationId = params.id as string
  const [aiPrompt, setAiPrompt] = useState({
    origin_icao: "",
    destination_icao: "",
    user_id: userId || 0,
    reservation_id: reservationId ? parseInt(reservationId) : null
  })
  const router = useRouter()

  const [createFlight, { loading: createLoading }] = useMutation(CREATE_FLIGHT)
  const [generateFlightPlan, { loading: generateLoading }] = useMutation(GENERATE_FLIGHT_PLAN)

  useEffect(() => {
    if (reservationId) {
      // Here you can add logic to load reservation details
      // and pre-fill some flight plan fields if necessary
      console.log(`Reservation ID: ${reservationId}`)
    }
  }, [reservationId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFlightPlan(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFlightPlan(prev => ({ ...prev, [name]: value }))
  }

  const handleAIInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setAiPrompt(prev => ({ ...prev, [name]: value }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      const { data } = await createFlight({
        variables: {
          createFlightInput: {
            ...flightPlan,
            flight_hours: parseFloat(flightPlan.flight_hours.toString()),
            number_of_passengers: parseInt(flightPlan.number_of_passengers.toString()),
            distance_km: parseFloat(flightPlan.distance_km.toString()),
            estimated_flight_time: parseInt(flightPlan.estimated_flight_time.toString()),
            reservation_id: reservationId ? parseInt(reservationId) : null
          }
        }
      })
      if (data && data.createFlight) {
        localStorage.setItem('generatedFlightPlan', JSON.stringify(data.createFlight))
        toast({ title: 'Succès', description: 'Plan de vol créé avec succès!' })
        router.push('/result')
      }
    } catch (error) {
      console.error("Error creating flight:", error)
      toast({ title: 'Erreur', description: 'Erreur lors de la création du plan de vol. Veuillez réessayer.' })
    }
  }

  const handleAIGenerate = async () => {
    try {
      const { data } = await generateFlightPlan({
        variables: {
          ...aiPrompt,
          user_id: parseInt(aiPrompt.user_id.toString()),
          reservation_id: aiPrompt.reservation_id
        }
      })
      if (data && data.generateFlightPlan) {
        toast({ title: 'Succès', description: 'Plan de vol généré avec succès!' })
        router.push('flight-plans/' + data.generateFlightPlan.id)
      }
    } catch (error) {
      console.error("Error generating flight plan:", error)
      toast({ title: 'Erreur', description: 'Erreur lors de la génération du plan de vol. Veuillez réessayer.' })
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
              <div className="mt-6 space-y-4">
                {currentStep === 0 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="origin_icao">Aéroport de départ (ICAO)</Label>
                      <Input
                        id="origin_icao"
                        name="origin_icao"
                        value={flightPlan.origin_icao}
                        onChange={handleInputChange}
                        placeholder="Ex: LFPG"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination_icao">Aéroport d'arrivée (ICAO)</Label>
                      <Input
                        id="destination_icao"
                        name="destination_icao"
                        value={flightPlan.destination_icao}
                        onChange={handleInputChange}
                        placeholder="Ex: LFBO"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flight_type">Type de vol</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("flight_type", value)}
                        defaultValue={flightPlan.flight_type}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez le type de vol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={FlightCategory.VFR}>VFR</SelectItem>
                          <SelectItem value={FlightCategory.IFR}>IFR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {currentStep === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="flight_hours">Heures de vol</Label>
                      <Input
                        id="flight_hours"
                        name="flight_hours"
                        type="number"
                        value={flightPlan.flight_hours}
                        onChange={handleInputChange}
                        min="0"
                        step="0.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="number_of_passengers">Nombre de passagers</Label>
                      <Input
                        id="number_of_passengers"
                        name="number_of_passengers"
                        type="number"
                        value={flightPlan.number_of_passengers}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="distance_km">Distance (km)</Label>
                      <Input
                        id="distance_km"
                        name="distance_km"
                        type="number"
                        value={flightPlan.distance_km}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated_flight_time">Temps de vol estimé (minutes)</Label>
                      <Input
                        id="estimated_flight_time"
                        name="estimated_flight_time"
                        type="number"
                        value={flightPlan.estimated_flight_time}
                        onChange={handleInputChange}
                        min="0"
                      />
                    </div>
                  </>
                )}
                {currentStep === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="waypoints">Waypoints</Label>
                    <WaypointSearch
                      waypoints={flightPlan.waypoints}
                      setWaypoints={(value) => setFlightPlan(prev => ({ ...prev, waypoints: typeof value === 'function' ? value(prev.waypoints) : value }))}
                    />
                  </div>
                )}
                {currentStep === 3 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-semibold">Résumé du plan de vol</h3>
                    <p><strong>Départ:</strong> {flightPlan.origin_icao}</p>
                    <p><strong>Arrivée:</strong> {flightPlan.destination_icao}</p>
                    <p><strong>Type de vol:</strong> {flightPlan.flight_type}</p>
                    <p><strong>Heures de vol:</strong> {flightPlan.flight_hours}</p>
                    <p><strong>Nombre de passagers:</strong> {flightPlan.number_of_passengers}</p>
                    <p><strong>Distance (km):</strong> {flightPlan.distance_km}</p>
                    <p><strong>Temps de vol estimé (min):</strong> {flightPlan.estimated_flight_time}</p>
                    <p><strong>Waypoints:</strong> {flightPlan.waypoints.join(", ")}</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                variant="outline"
              >
                Précédent
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>
                  Suivant
                </Button>
              ) : (
                <Button onClick={handleSubmit} className="bg-green-500 hover:bg-green-600" disabled={createLoading}>
                  {createLoading ? 'Soumission...' : 'Soumettre le plan de vol'}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6" />
                <span>Génération IA du Plan de Vol</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_origin_icao">Aéroport de départ (ICAO)</Label>
                  <Input
                    id="ai_origin_icao"
                    name="origin_icao"
                    value={aiPrompt.origin_icao}
                    onChange={handleAIInputChange}
                    placeholder="Ex: LFPG"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai_destination_icao">Aéroport d'arrivée (ICAO)</Label>
                  <Input
                    id="ai_destination_icao"
                    name="destination_icao"
                    value={aiPrompt.destination_icao}
                    onChange={handleAIInputChange}
                    placeholder="Ex: LFBO"
                  />
                </div>
                <Button onClick={handleAIGenerate} disabled={generateLoading}>
                  {generateLoading ? 'Génération en cours...' : 'Générer un plan de vol'}
                </Button>
                {generateLoading && (
                  <div className="flex justify-center items-center mt-4">
                    <Spinner />
                    <span className="ml-2">Génération du plan de vol en cours...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
