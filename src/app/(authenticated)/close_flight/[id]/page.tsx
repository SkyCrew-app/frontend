"use client"

import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format, parseISO } from "date-fns"
import { fr } from "date-fns/locale"
import { AlertTriangle, CheckCircle, RotateCw, FileIcon as FilePdf, Plane, User, Calendar, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import FlightDetailsForm from "@/components/close_flight/FlightDetailsForm"
import IncidentForm from "@/components/close_flight/IncidentForm"
import FlightNotesForm from "@/components/close_flight/FlightNotesForm"
import { useMutation, useQuery, gql } from "@apollo/client"
import { useParams, useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

const GET_FLIGHT = gql`
  query GetFlight($id: Int!) {
    getFlightById(id: $id) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      weather_conditions
      number_of_passengers
      encoded_polyline
      distance_km
      estimated_flight_time
      waypoints
      detailed_waypoints
      reservation {
        id
        start_time
        end_time
        purpose
        aircraft {
          id
          registration_number
          model
          image_url
        }
      }
      user {
        id
        first_name
        last_name
        role {
          role_name
        }
      }
    }
  }
`

const UPDATE_FLIGHT = gql`
  mutation UpdateFlight($updateFlightInput: UpdateFlightInput!) {
    updateFlight(updateFlightInput: $updateFlightInput) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      weather_conditions
      number_of_passengers
      encoded_polyline
      distance_km
      estimated_flight_time
      waypoints
      detailed_waypoints
    }
  }
`

const CREATE_INCIDENT = gql`
  mutation CreateIncident($incident: IncidentInput!) {
    createIncident(incident: $incident) {
      id
      date
      severity_level
      description
      damage_report
      corrective_actions
      status
      priority
      category
    }
  }
`

const flightRecapSchema = z.object({
  flight_hours: z.number().min(0, "Les heures de vol ne peuvent pas être négatives"),
  flight_type: z.string().min(1, "Le type de vol est requis"),
  origin_icao: z.string().length(4, "Le code ICAO doit avoir 4 caractères"),
  destination_icao: z.string().length(4, "Le code ICAO doit avoir 4 caractères"),
  weather_conditions: z.string().optional(),
  number_of_passengers: z.number().int().min(0).optional(),
  encoded_polyline: z.string().optional(),
  distance_km: z.number().min(0, "La distance ne peut pas être négative"),
  estimated_flight_time: z.number().nullable(),
  waypoints: z.string().optional(),
  detailed_waypoints: z.array(z.string()).optional(),
  incidentOccurred: z.boolean().default(false),
  incident_date: z.date().optional(),
  severity_level: z.enum(["low", "medium", "high"]).optional(),
  incident_description: z.string().optional(),
  damage_report: z.string().optional(),
  corrective_actions: z.string().optional(),
  incident_status: z.string().optional(),
  incident_priority: z.enum(["low", "medium", "high"]).optional(),
  incident_category: z.enum(["mechanical", "electrical", "weather", "human_error", "other"]).optional(),
  flightNotes: z.string().optional(),
})

type FlightRecapFormValues = z.infer<typeof flightRecapSchema>

export default function FlightRecap() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { loading, error, data } = useQuery(GET_FLIGHT, {
    variables: { id: Number.parseInt(id) },
    skip: !id,
  })

  const [updateFlight] = useMutation(UPDATE_FLIGHT)
  const [createIncident] = useMutation(CREATE_INCIDENT)

  const methods = useForm<FlightRecapFormValues>({
    resolver: zodResolver(flightRecapSchema),
    defaultValues: {
      flight_hours: 0,
      flight_type: "",
      origin_icao: "",
      destination_icao: "",
      weather_conditions: "",
      number_of_passengers: 0,
      encoded_polyline: "",
      distance_km: 0,
      estimated_flight_time: null,
      waypoints: "",
      detailed_waypoints: [],
      incidentOccurred: false,
    },
  })

  useEffect(() => {
    if (data?.getFlightById) {
      const flight = data.getFlightById
      methods.reset({
        flight_hours: flight.flight_hours,
        flight_type: flight.flight_type,
        origin_icao: flight.origin_icao,
        destination_icao: flight.destination_icao,
        weather_conditions: flight.weather_conditions || "",
        number_of_passengers: flight.number_of_passengers || 0,
        encoded_polyline: flight.encoded_polyline || "",
        distance_km: flight.distance_km || 0,
        estimated_flight_time: flight.estimated_flight_time,
        waypoints: flight.waypoints || "",
        detailed_waypoints: flight.detailed_waypoints || [],
      })
    }
  }, [data, methods])

  const onSubmit = async (formData: FlightRecapFormValues) => {
    setIsSubmitting(true)
    try {
      const { data: flightData } = await updateFlight({
        variables: {
          updateFlightInput: {
            id: Number.parseInt(id),
            flight_hours: formData.flight_hours,
            flight_type: formData.flight_type,
            origin_icao: formData.origin_icao,
            destination_icao: formData.destination_icao,
            weather_conditions: formData.weather_conditions,
            number_of_passengers: formData.number_of_passengers,
            encoded_polyline: formData.encoded_polyline,
            distance_km: formData.distance_km,
            estimated_flight_time: formData.estimated_flight_time,
            waypoints: formData.waypoints,
            detailed_waypoints: formData.detailed_waypoints,
          },
        },
      })

      console.log("Flight updated:", flightData.updateFlight)

      if (formData.incidentOccurred) {
        const { data: incidentData } = await createIncident({
          variables: {
            incident: {
              date: formData.incident_date,
              severity_level: formData.severity_level,
              description: formData.incident_description,
              damage_report: formData.damage_report,
              corrective_actions: formData.corrective_actions,
              status: formData.incident_status,
              priority: formData.incident_priority,
              category: formData.incident_category,
              flight_id: Number.parseInt(id),
            },
          },
        })

        console.log("Incident created:", incidentData.createIncident)
      }

      setIsSubmitted(true)
    } catch (error) {
      console.error("Error submitting flight recap:", error)
      // Handle error (e.g., show error message to user)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportPDF = () => {
    // Logique pour exporter en PDF
    console.log("Exporting to PDF...")
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p>Erreur : {error.message}</p>

  const flight = data?.getFlightById

  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            <CardTitle>Vol clôturé avec succès</CardTitle>
          </div>
          <CardDescription>Le vol a été clôturé et enregistré dans le système.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Durée du vol:</span>
              <span>{methods.getValues("flight_hours")} heures</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Distance parcourue:</span>
              <span>{methods.getValues("distance_km")} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Statut:</span>
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Terminé
              </Badge>
            </div>
            {methods.getValues("incidentOccurred") && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Incident signalé</AlertTitle>
                <AlertDescription>{methods.getValues("incident_description")}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
            Retour au tableau de bord
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <ScrollArea className="h-[calc(100vh-4rem)] px-4 py-6">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clôture de vol</h1>
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            En cours
          </Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Résumé du vol</CardTitle>
            <CardDescription>Informations générales sur le vol</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aéronef</p>
                    <p className="font-semibold">{flight?.reservation?.aircraft?.registration_number || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">{flight?.reservation?.aircraft?.model || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pilote</p>
                    <p className="font-semibold">{`${flight?.user?.first_name || ""} ${flight?.user?.last_name || ""}`}</p>
                    <p className="text-sm text-muted-foreground">Rôle: {flight?.user?.role?.role_name || "N/A"}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date et heure</p>
                    <p className="font-semibold">
                      {flight?.reservation?.start_time
                        ? format(parseISO(flight.reservation.start_time), "dd MMMM yyyy", { locale: fr })
                        : "Date inconnue"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {flight?.reservation?.start_time
                        ? format(parseISO(flight.reservation.start_time), "HH:mm", { locale: fr })
                        : "Heure inconnue"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Trajet</p>
                    <p className="font-semibold">{`${flight?.origin_icao || "N/A"} → ${flight?.destination_icao || "N/A"}`}</p>
                    <p className="text-sm text-muted-foreground">{flight?.distance_km?.toFixed(2) || "N/A"} km</p>
                  </div>
                </div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type de vol</p>
                <p className="font-semibold">{flight?.flight_type || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Durée estimée</p>
                <p className="font-semibold">
                  {flight?.estimated_flight_time ? `${flight.estimated_flight_time} h` : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Passagers</p>
                <p className="font-semibold">{flight?.number_of_passengers || "0"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <FlightDetailsForm />
            <IncidentForm />
            <FlightNotesForm />

            <div className="flex justify-between items-center">
              <Button type="button" variant="outline" onClick={handleExportPDF}>
                <FilePdf className="mr-2 h-4 w-4" />
                Exporter en PDF
              </Button>
              <div className="space-x-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    "Clôturer le vol"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </ScrollArea>
  )
}

