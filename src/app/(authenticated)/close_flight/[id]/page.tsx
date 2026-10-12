"use client"

import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle, FileDown, FileSearch, Loader2 } from "lucide-react"
import { ApolloError, useMutation, useQuery } from "@apollo/client"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import FlightDetailsForm from "@/components/close_flight/FlightDetailsForm"
import IncidentForm from "@/components/close_flight/IncidentForm"
import FlightNotesForm from "@/components/close_flight/FlightNotesForm"
import { flightTypeLabel } from "@/components/flight/flight-type"
import {
  EXPORT_FLIGHT_RECAP_PDF,
  GET_FLIGHT_PLAN_BY_ID,
  GET_USER_FLIGHT_PLANS,
  UPDATE_FLIGHT,
} from "@/graphql/flights"
import { downloadBase64Pdf } from "@/lib/download"
import { CREATE_INCIDENT } from "@/graphql/incident"
import { useToast } from "@/components/hooks/use-toast"
import { flightRecapSchema, type FlightRecapFormValues } from "@/lib/flight-recap-schema"
import { toIntId } from "@/lib/graphql-inputs"
import { formatDateTime, formatDecimal, formatFlightDuration } from "@/lib/format"

// Refusals of the API are written for the pilot; anything else gets a plain message.
const apiMessage = (error: unknown, fallback: string) =>
  (error instanceof ApolloError ? error.graphQLErrors[0]?.message : undefined) || fallback

function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
      {hint && <dd className="truncate text-xs text-muted-foreground">{hint}</dd>}
    </div>
  )
}

export default function FlightRecap() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [pendingValues, setPendingValues] = useState<FlightRecapFormValues | null>(null)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()

  // Same query as the flight plan page: it carries `closed_at` and `remarks`, which this page relies on.
  const { loading, error, data, refetch } = useQuery(GET_FLIGHT_PLAN_BY_ID, {
    variables: { id: Number.parseInt(id) },
    skip: !id,
  })

  const [updateFlight] = useMutation(UPDATE_FLIGHT)
  const [createIncident] = useMutation(CREATE_INCIDENT)
  const [exportRecap, { loading: isExporting }] = useMutation(EXPORT_FLIGHT_RECAP_PDF)

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
        // The API computes distances with many decimals.
        distance_km: Math.round((flight.distance_km || 0) * 10) / 10,
        estimated_flight_time: flight.estimated_flight_time,
        waypoints: flight.waypoints || "",
        flightNotes: flight.remarks || "",
      })
    }
  }, [data, methods])

  const flight = data?.getFlightById
  const aircraftId = toIntId(flight?.reservation?.aircraft?.id)

  // Closing cannot be undone by the pilot: ask once before sending.
  const requestClose = (formData: FlightRecapFormValues) => {
    // `aircraft_id` est obligatoire (Int!) : sans aéronef connu (vol sans réservation),
    // l'incident ne peut pas être créé, on n'envoie donc rien.
    if (formData.incidentOccurred && aircraftId === null) {
      toast({
        variant: "destructive",
        title: "Incident impossible à enregistrer",
        description:
          "Ce vol n'est rattaché à aucun aéronef : l'incident ne peut pas être associé à un aéronef. Le vol n'a pas été clôturé.",
      })
      return
    }
    setPendingValues(formData)
  }

  const onSubmit = async (formData: FlightRecapFormValues) => {
    setIsSubmitting(true)
    try {
      const pilotId = flight?.user?.id
      await updateFlight({
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
            remarks: formData.flightNotes?.trim() || undefined,
            closed: true,
            // `waypoints` n'est qu'affiché sur cette page : il n'est pas renvoyé à l'API.
          },
        },
        // "Mes plans de vol" must show the flight as closed.
        refetchQueries: [
          { query: GET_FLIGHT_PLAN_BY_ID, variables: { id: Number.parseInt(id) } },
          ...(pilotId != null ? [{ query: GET_USER_FLIGHT_PLANS, variables: { userId: pilotId } }] : []),
        ],
      })

      if (formData.incidentOccurred) {
        await createIncident({
          variables: {
            incident: {
              incident_date: formData.incident_date,
              aircraft_id: aircraftId,
              user_id: Number(flight?.user?.id),
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
      }

      setIsSubmitted(true)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Le vol n'a pas été clôturé",
        description: apiMessage(error, "Une erreur est survenue pendant la clôture. Réessayez dans un instant."),
      })
    } finally {
      setIsSubmitting(false)
      setPendingValues(null)
    }
  }

  // The PDF shows the flight as it is recorded, not what is being typed.
  const handleExportPDF = async () => {
    try {
      const { data: exported } = await exportRecap({ variables: { flightId: Number.parseInt(id) } })
      if (exported?.exportFlightRecapPDF) {
        downloadBase64Pdf(exported.exportFlightRecapPDF, `vol-${id}.pdf`)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export impossible",
        description: apiMessage(error, "Le PDF n'a pas pu être généré. Réessayez dans un instant."),
      })
    }
  }

  const exportButton = (label: string) => (
    <Button type="button" variant="outline" onClick={handleExportPDF} disabled={isExporting}>
      {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {label}
    </Button>
  )

  const backButton = (
    <Button variant="outline" asChild>
      <Link href={`/reservations/flight-plans/${id}`}>
        <ArrowLeft className="h-4 w-4" />
        Plan de vol
      </Link>
    </Button>
  )

  const route = flight ? `${flight.origin_icao} → ${flight.destination_icao}` : undefined

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader className="mb-0" title="Clôturer le vol" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader className="mb-0" title="Clôturer le vol" />
        <ErrorState
          description="Le vol n'a pas pu être chargé. Vérifiez votre connexion puis réessayez."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!flight) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader className="mb-0" title="Clôturer le vol" />
        <EmptyState
          icon={FileSearch}
          title="Vol introuvable"
          description="Ce vol n'existe pas ou vous n'y avez pas accès."
          action={
            <Button variant="outline" asChild>
              <Link href="/reservations/flight-plans">Mes plans de vol</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // A flight is closed once: afterwards only an administrator can amend it.
  if (flight.closed_at && !isSubmitted) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader className="mb-0" title="Clôturer le vol" description={route} actions={backButton} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              Vol déjà clôturé
            </CardTitle>
            <CardDescription>
              Ce vol a été clôturé le {formatDateTime(flight.closed_at)}. Il figure dans votre carnet de vol ; seul un
              administrateur peut encore le modifier.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            {exportButton("Récapitulatif PDF")}
            <Button onClick={() => router.push("/logbook")}>Voir le carnet de vol</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader className="mb-0" title="Clôturer le vol" description={route} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              Vol clôturé
            </CardTitle>
            <CardDescription>Le vol est enregistré dans votre carnet de vol.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Temps de vol" value={formatFlightDuration(methods.getValues("flight_hours"))} />
              <Fact label="Distance parcourue" value={`${formatDecimal(methods.getValues("distance_km"))} km`} />
            </dl>
            {methods.getValues("incidentOccurred") && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Incident signalé au club</AlertTitle>
                <AlertDescription>{methods.getValues("incident_description")}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Tableau de bord
            </Button>
            {exportButton("Récapitulatif PDF")}
            <Button onClick={() => router.push("/logbook")}>Voir le carnet de vol</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const aircraft = flight.reservation?.aircraft
  const pilotName = [flight.user?.first_name, flight.user?.last_name].filter(Boolean).join(" ")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        className="mb-0"
        title="Clôturer le vol"
        description="Confirmez ce qui a réellement été volé : le vol sera inscrit dans votre carnet de vol."
        actions={
          <>
            {backButton}
            {exportButton("Récapitulatif PDF")}
          </>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{route}</CardTitle>
          <CardDescription>Plan de vol prévu</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Fact label="Avion" value={aircraft?.registration_number || "—"} hint={aircraft?.model} />
            <Fact label="Pilote" value={pilotName || "—"} />
            <Fact label="Départ prévu" value={formatDateTime(flight.reservation?.start_time)} />
            <Fact label="Type de vol" value={flightTypeLabel(flight.flight_type)} />
            <Fact label="Distance prévue" value={flight.distance_km ? `${formatDecimal(flight.distance_km)} km` : "—"} />
            <Fact
              label="Durée estimée"
              value={flight.estimated_flight_time ? formatFlightDuration(flight.estimated_flight_time) : "—"}
            />
            <Fact label="Passagers" value={flight.number_of_passengers ?? 0} />
          </dl>
        </CardContent>
      </Card>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(requestClose)} className="space-y-6" noValidate>
          <FlightDetailsForm />
          <IncidentForm />
          <FlightNotesForm />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Clôturer le vol
            </Button>
          </div>
        </form>
      </FormProvider>

      <AlertDialog open={pendingValues !== null} onOpenChange={(open) => !open && !isSubmitting && setPendingValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer ce vol ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le vol {route} sera inscrit dans votre carnet avec{" "}
              {formatFlightDuration(pendingValues?.flight_hours ?? 0)} de vol
              {pendingValues?.incidentOccurred ? ", et l'incident sera signalé au club" : ""}. Après la clôture, seul un
              administrateur pourra le modifier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault()
                if (pendingValues) void onSubmit(pendingValues)
              }}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Clôturer le vol
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
