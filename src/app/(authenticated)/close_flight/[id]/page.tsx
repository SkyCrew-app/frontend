"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, CheckCircle, FileDown, FileSearch, Loader2 } from "lucide-react"
import { useMutation, useQuery } from "@apollo/client"
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
import WaypointsDisplay from "@/components/close_flight/WaypointDisplay"
import { StepIndicator } from "@/components/close_flight/StepIndicator"
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
import { buildFlightRecapSchema, type FlightRecapFormValues } from "@/lib/flight-recap-schema"
import { toIntId } from "@/lib/graphql-inputs"
import { closeBlocker, groundsAircraft } from "@/lib/flight-closing"
import { apiRefusal } from "@/lib/api-refusal"
import { isAdministrator } from "@/lib/roles"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { formatDateTime, formatDecimal, formatFlightDuration } from "@/lib/format"

// Refusals of the API are written for the pilot; anything else gets a plain message.
const apiMessage = apiRefusal

// The form is filled in three short steps; each one only checks its own fields.
const STEPS: { key: "flight" | "incident" | "remarks"; fields: (keyof FlightRecapFormValues)[] }[] = [
  {
    key: "flight",
    fields: [
      "flight_hours",
      "distance_km",
      "origin_icao",
      "destination_icao",
      "flight_type",
      "number_of_passengers",
      "weather_conditions",
    ],
  },
  {
    key: "incident",
    fields: [
      "incidentOccurred",
      "incident_date",
      "incident_category",
      "severity_level",
      "incident_priority",
      "incident_description",
      "damage_report",
      "corrective_actions",
    ],
  },
  { key: "remarks", fields: ["flightNotes"] },
]

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
  const [step, setStep] = useState(0)
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const { t } = useTranslation("flights")
  const isAdmin = isAdministrator(useUserData(useCurrentUser()))
  // The incident is sent before the closing: it must not be sent twice when the closing is retried.
  const incidentRecorded = useRef(false)

  // Rebuilt when the language changes so validation messages follow it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schema = useMemo(() => buildFlightRecapSchema(), [t])
  const stepTitles = STEPS.map(({ key }) => t(`closeFlight.steps.${key}`))

  // Same query as the flight plan page: it carries `closed_at` and `remarks`, which this page relies on.
  const { loading, error, data, refetch } = useQuery(GET_FLIGHT_PLAN_BY_ID, {
    variables: { id: Number.parseInt(id) },
    skip: !id,
  })

  const [updateFlight] = useMutation(UPDATE_FLIGHT)
  const [createIncident] = useMutation(CREATE_INCIDENT)
  const [exportRecap, { loading: isExporting }] = useMutation(EXPORT_FLIGHT_RECAP_PDF)

  const methods = useForm<FlightRecapFormValues>({
    resolver: zodResolver(schema),
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

  const isLastStep = step === STEPS.length - 1

  const goToNextStep = async () => {
    if (await methods.trigger(STEPS[step].fields)) setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  // An error left on an earlier step must be seen: go back to the first step that has one.
  const showFirstInvalidStep = (errors: object) => {
    const invalid = STEPS.findIndex(({ fields }) => fields.some((field) => field in errors))
    if (invalid >= 0) setStep(invalid)
  }

  // Closing cannot be undone by the pilot: ask once before sending.
  const requestClose = (formData: FlightRecapFormValues) => {
    // `aircraft_id` is required (Int!): without a known aircraft (flight without a booking)
    // the incident cannot be created, so nothing is sent.
    if (formData.incidentOccurred && aircraftId === null) {
      toast({
        variant: "destructive",
        title: t("closeFlight.toast.noAircraft.title"),
        description: t("closeFlight.toast.noAircraft.description"),
      })
      return
    }
    setPendingValues(formData)
  }

  const onSubmit = async (formData: FlightRecapFormValues) => {
    setIsSubmitting(true)
    try {
      const pilotId = flight?.user?.id

      // The incident first: a refused closing must never lose a report, least of all a severe one.
      // The API opens it itself, on the aircraft of the flight.
      if (formData.incidentOccurred && !incidentRecorded.current) {
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
        incidentRecorded.current = true
      }

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
            // `waypoints` is only displayed on this page: it is not sent back to the API.
          },
        },
        // "Mes plans de vol" must show the flight as closed.
        refetchQueries: [
          { query: GET_FLIGHT_PLAN_BY_ID, variables: { id: Number.parseInt(id) } },
          ...(pilotId != null ? [{ query: GET_USER_FLIGHT_PLANS, variables: { userId: pilotId } }] : []),
        ],
      })

      setIsSubmitted(true)
    } catch (error) {
      toast({
        variant: "destructive",
        title: incidentRecorded.current
          ? t("closeFlight.toast.incidentRecordedCloseFailed.title")
          : t("closeFlight.toast.closeError.title"),
        description: apiMessage(error, t("closeFlight.toast.closeError.description")),
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
        downloadBase64Pdf(exported.exportFlightRecapPDF, t("closeFlight.recapFileName", { id }))
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("closeFlight.toast.exportError.title"),
        description: apiMessage(error, t("closeFlight.toast.exportError.description")),
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
        {t("closeFlight.backToPlan")}
      </Link>
    </Button>
  )

  const route = flight ? `${flight.origin_icao} → ${flight.destination_icao}` : undefined

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("closeFlight.title")} />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("closeFlight.title")} />
        <ErrorState
          description={t("closeFlight.loadError")}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  if (!flight) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("closeFlight.title")} />
        <EmptyState
          icon={FileSearch}
          title={t("closeFlight.notFound.title")}
          description={t("closeFlight.notFound.description")}
          action={
            <Button variant="outline" asChild>
              <Link href="/reservations/flight-plans">{t("closeFlight.notFound.action")}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  // A flight is closed once: afterwards only an administrator can amend it.
  if (flight.closed_at && !isSubmitted) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("closeFlight.title")} description={route} actions={backButton} />
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              {t("closeFlight.alreadyClosed.title")}
            </CardTitle>
            <CardDescription>
              {t("closeFlight.alreadyClosed.description", { date: formatDateTime(flight.closed_at) })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            {exportButton(t("closeFlight.recapPdf"))}
            <Button onClick={() => router.push("/logbook")}>{t("closeFlight.viewLogbook")}</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("closeFlight.title")} description={route} />
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-success" />
              {t("closeFlight.done.title")}
            </CardTitle>
            <CardDescription>{t("closeFlight.done.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label={t("closeFlight.done.flightTime")} value={formatFlightDuration(methods.getValues("flight_hours"))} />
              <Fact
                label={t("closeFlight.done.distance")}
                value={`${formatDecimal(methods.getValues("distance_km"))} km`}
              />
            </dl>
            {methods.getValues("incidentOccurred") && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("closeFlight.done.incidentReported")}</AlertTitle>
                <AlertDescription>
                  <p>{methods.getValues("incident_description")}</p>
                  {groundsAircraft(methods.getValues("severity_level")) && (
                    <p className="mt-2 font-medium">{t("closeFlight.done.aircraftGrounded")}</p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {t("closeFlight.dashboard")}
            </Button>
            {exportButton(t("closeFlight.recapPdf"))}
            <Button onClick={() => router.push("/logbook")}>{t("closeFlight.viewLogbook")}</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // The API refuses to close a flight before its booking starts, without a booking or on a
  // cancelled one: say so instead of offering a form that cannot be sent.
  const blocker = closeBlocker(flight, { isAdmin })
  if (blocker !== null && blocker !== "closed") {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("closeFlight.title")} description={route} actions={backButton} />
        <EmptyState
          icon={CalendarClock}
          title={t(`closeFlight.notYet.${blocker}.title`)}
          description={t(`closeFlight.notYet.${blocker}.description`, {
            date: formatDateTime(flight.reservation?.start_time),
          })}
          action={
            <Button variant="outline" asChild>
              <Link href="/reservations/flight-plans">{t("closeFlight.notFound.action")}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const aircraft = flight.reservation?.aircraft
  // The instructor on board is the one of the booking; a closed flight keeps its own.
  const onBoard = flight.instructor ?? flight.reservation?.instructor
  const instructor = [onBoard?.first_name, onBoard?.last_name].filter(Boolean).join(" ")
  const pilotName = [flight.user?.first_name, flight.user?.last_name].filter(Boolean).join(" ")

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("closeFlight.title")}
        description={t("closeFlight.description")}
        actions={
          <>
            {backButton}
            {exportButton(t("closeFlight.recapPdf"))}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <FormProvider {...methods}>
            <form
              onSubmit={(event) => {
                // Enter in a field of an earlier step moves on instead of closing the flight.
                if (!isLastStep) {
                  event.preventDefault()
                  void goToNextStep()
                  return
                }
                void methods.handleSubmit(requestClose, showFirstInvalidStep)(event)
              }}
              noValidate
            >
              <StepIndicator
                className="border-b px-6 py-3"
                steps={stepTitles}
                current={step}
                onStepClick={setStep}
              />

              <CardContent className="p-6">
                {/* Every step stays mounted so that the form keeps its values. */}
                <div hidden={step !== 0} role="group" aria-label={stepTitles[0]}>
                  <FlightDetailsForm />
                </div>
                <div hidden={step !== 1} role="group" aria-label={stepTitles[1]}>
                  <IncidentForm />
                </div>
                <div hidden={step !== 2} role="group" aria-label={stepTitles[2]}>
                  <FlightNotesForm />
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap justify-end gap-2 border-t px-6 py-4">
                {step === 0 ? (
                  <Button variant="outline" type="button" onClick={() => router.back()} disabled={isSubmitting}>
                    {t("common:actions.cancel")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setStep((current) => current - 1)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("common:actions.previous")}
                  </Button>
                )}
                {isLastStep ? (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("closeFlight.submit")}
                  </Button>
                ) : (
                  <Button type="submit">
                    {t("common:actions.next")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </form>
          </FormProvider>
        </Card>

        <Card className="order-first self-start lg:order-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{route}</CardTitle>
            <CardDescription>{t("closeFlight.plan.title")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label={t("common:labels.aircraft")} value={aircraft?.registration_number || "—"} hint={aircraft?.model} />
              <Fact label={t("common:labels.pilot")} value={pilotName || "—"} />
              {instructor && (
                <Fact
                  label={t("common:labels.instructor")}
                  value={instructor}
                  hint={t("closeFlight.plan.dualHint")}
                />
              )}
              <Fact label={t("closeFlight.plan.plannedDeparture")} value={formatDateTime(flight.reservation?.start_time)} />
              <Fact label={t("closeFlight.plan.flightType")} value={flightTypeLabel(flight.flight_type)} />
              <Fact
                label={t("closeFlight.plan.plannedDistance")}
                value={flight.distance_km ? `${formatDecimal(flight.distance_km)} km` : "—"}
              />
              <Fact
                label={t("closeFlight.plan.estimatedDuration")}
                value={flight.estimated_flight_time ? formatFlightDuration(flight.estimated_flight_time) : "—"}
              />
              <Fact label={t("closeFlight.plan.passengers")} value={flight.number_of_passengers ?? 0} />
            </dl>
            {flight.waypoints && (
              <div className="space-y-1 border-t pt-4">
                <p className="text-xs text-muted-foreground">{t("closeFlight.plan.waypoints")}</p>
                <WaypointsDisplay waypoints={flight.waypoints} compact />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={pendingValues !== null} onOpenChange={(open) => !open && !isSubmitting && setPendingValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("closeFlight.confirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                pendingValues?.incidentOccurred
                  ? "closeFlight.confirm.descriptionWithIncident"
                  : "closeFlight.confirm.description",
                { route, duration: formatFlightDuration(pendingValues?.flight_hours ?? 0) },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault()
                if (pendingValues) void onSubmit(pendingValues)
              }}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("closeFlight.submit")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
