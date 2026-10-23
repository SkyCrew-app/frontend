"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ArrowLeft, ChevronDown, FileDown, FileSearch, History, Info, Loader2, Pencil, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { isAccessRefusal } from "@/lib/api-refusal"
import { FlightSummary } from "@/components/flight/FlightSummary"
import { WaypointInfo } from "@/components/flight/WaypointInfo"
import { FlightPlanActions } from "@/components/flight/flight-action-plans"
import { ClosedFlightAdmin } from "@/components/flight/closed-flight-admin"
import { NavdataAge, PreparationDisclaimer, WARNING_ALERT } from "@/components/navplan/NoticesBanner"
import { ResultsPanel } from "@/components/navplan/ResultsPanel"
import { crossedAirspaceStatuses } from "@/components/navplan/AirspaceCrossings"
import { PrintableNavLog, printNavLog } from "@/components/navplan/PrintableNavLog"
import type { AeroMapPoint, AeroMapProps } from "@/components/map/types"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { toast } from "@/components/hooks/use-toast"
import { isAdministrator } from "@/lib/roles"
import { flightTypeLabel } from "@/components/flight/flight-type"
import { flightPlanState } from "@/components/flight-plan/flight-plan-state"
import { GET_FLIGHT_PLAN_BY_ID } from "@/graphql/flights"
import { FLIGHT_PLANNING_SETTINGS } from "@/graphql/aircraft-data"
import { EXPORT_FLIGHT_PLAN_PDF, FLIGHT_PLAN_BY_FLIGHT } from "@/graphql/navplan"
import { closeBlocker } from "@/lib/flight-closing"
import { downloadBase64Pdf } from "@/lib/download"
import { apiRefusal } from "@/lib/api-refusal"
import { formatDate, formatDateTime, formatFlightDuration, formatTime } from "@/lib/format"
import type { FlightPlan, FlightPlanningSettings, NavPoint, PdfFormat } from "@/lib/navplan/types"
import { formatCourse, formatNm } from "@/lib/navplan/units"

import "@/styles/print.css"

const AeroMap = dynamic<AeroMapProps>(() => import("@/components/map/AeroMap"), {
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

interface LegacyWaypoint {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name: string | null
}

// Plans of the former generator stored their points as JSON: keep the ones that can be drawn and listed.
const legacyWaypoints = (raw: string | null | undefined): LegacyWaypoint[] =>
  (safeJsonParse<LegacyWaypoint[]>(raw) ?? []).filter(
    (wp) => wp && typeof wp === "object" && typeof wp.lat === "number" && typeof wp.lon === "number",
  )

const toMapPoint = (point: NavPoint): AeroMapPoint => ({ ident: point.ident, type: point.type, lat: point.lat, lon: point.lon, aerodromeIcao: point.aerodromeIcao })

const BackButton = () => {
  const { t } = useTranslation("flights")
  return (
    <Button variant="outline" asChild>
      <Link href="/reservations/flight-plans">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
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
  const { t: tn } = useTranslation("navplan")
  const { id } = useParams()
  const router = useRouter()
  const me = useUserData(useCurrentUser())
  const isAdmin = isAdministrator(me)
  const flightId = Number.parseInt(Array.isArray(id) ? id[0] : (id as string), 10)
  const [printFormat, setPrintFormat] = useState<PdfFormat>("A5")

  const { loading, error, data, refetch } = useQuery(GET_FLIGHT_PLAN_BY_ID, { variables: { id: flightId } })
  const fp = data?.getFlightById
  // Only plans of the new engine have a FlightPlan (contract change 1 of the API).
  const planQuery = useQuery<{ flightPlanByFlight: FlightPlan | null }>(FLIGHT_PLAN_BY_FLIGHT, {
    variables: { flightId },
    skip: !fp || fp.plan_engine !== "navplan-1",
  })
  const { data: settingsData } = useQuery<{ flightPlanningSettings: FlightPlanningSettings }>(FLIGHT_PLANNING_SETTINGS, {
    skip: !planQuery.data?.flightPlanByFlight,
  })
  const [exportPdf, { loading: exporting }] = useMutation<{ exportFlightPlanPdf: string }>(EXPORT_FLIGHT_PLAN_PDF)

  const plan = planQuery.data?.flightPlanByFlight ?? null
  const waypoints = useMemo(() => legacyWaypoints(fp?.waypoints), [fp])

  const planMap = useMemo(() => {
    if (!plan) return null
    const legs = plan.result.legs
    return {
      points: legs.length > 0 ? [toMapPoint(legs[0].from), ...legs.map((leg) => toMapPoint(leg.to))] : [],
      alternate: plan.result.alternateLeg ? toMapPoint(plan.result.alternateLeg.to) : null,
      distances: legs.map((leg) => leg.distanceNm),
      labels: legs.map((leg) => `${formatCourse(leg.magneticCourseDeg)} · ${formatNm(leg.distanceNm, 0)}`),
      crossed: crossedAirspaceStatuses(plan.result.alternateLeg ? [...legs, plan.result.alternateLeg] : legs),
      obstacles: (plan.result.alternateLeg ? [...legs, plan.result.alternateLeg] : legs).flatMap((leg) => leg.obstacles ?? []),
    }
  }, [plan])

  const legacyMap = useMemo<AeroMapPoint[]>(
    () => waypoints.map((wp) => ({ ident: wp.ident, type: wp.type === "APT" ? "AERODROME" : "USER", lat: wp.lat, lon: wp.lon })),
    [waypoints],
  )

  /* ---- Loading, error, not found ---- */
  if (loading || planQuery.loading) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("planDetail.title")} actions={<BackButton />} />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <Skeleton className="h-[420px] rounded-xl xl:col-span-2" />
          <Skeleton className="h-[420px] rounded-xl xl:col-span-3" />
        </div>
      </div>
    )
  }

  // Not found or not the member's: say so, rather than suggest a connection problem.
  if (error && !isAccessRefusal(error)) {
    return (
      <div className="space-y-6">
        <PageHeader className="mb-0" title={t("planDetail.title")} actions={<BackButton />} />
        <ErrorState description={t("planDetail.loadError")} onRetry={() => refetch()} />
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

  /* ---- Derived data ---- */
  const aircraft = fp.reservation?.aircraft ?? null
  const pilotName = fp.user ? [fp.user.first_name, fp.user.last_name].filter(Boolean).join(" ") : undefined
  const departureAt = plan?.input.departureTime ?? fp.departure_time ?? fp.reservation?.start_time
  const arrivalAt = fp.arrival_time ?? fp.reservation?.end_time
  const dateStr = formatDate(departureAt)
  const typeLabel = flightTypeLabel(fp.flight_type)
  const state = flightPlanState(fp)
  const isOwner = Boolean(me && fp.user && String(fp.user.id) === String(me.id))
  // Only the pilot changes their preparation (or an administrator); a closed flight is history.
  const canEdit = Boolean(plan && !fp.closed_at && (isOwner || isAdmin) && fp.reservation?.id)

  const roles: Record<string, "departure" | "destination" | "alternate"> = {}
  if (plan) {
    const legs = plan.result.legs
    if (legs[0]) roles[legs[0].from.ident] = "departure"
    if (legs.length) roles[legs[legs.length - 1].to.ident] = "destination"
    if (plan.result.alternateLeg) roles[plan.result.alternateLeg.to.ident] = "alternate"
  }

  const downloadDossier = async (format: PdfFormat) => {
    if (!plan) return
    try {
      const { data: pdf } = await exportPdf({ variables: { flightPlanId: plan.id, format } })
      if (pdf?.exportFlightPlanPdf) {
        downloadBase64Pdf(pdf.exportFlightPlanPdf, tn("detail.dossierFileName", { departure: fp.origin_icao, destination: fp.destination_icao, date: formatDate(departureAt).replace(/\s/g, "-") }))
      }
    } catch (exportError) {
      toast({ variant: "destructive", title: tn("detail.dossierFailed"), description: apiRefusal(exportError, tn("detail.dossierFailedDescription")) })
    }
  }

  const print = (format: PdfFormat) => {
    setPrintFormat(format)
    printNavLog(format)
  }

  return (
    <div className="space-y-6" data-print-date={formatDateTime(new Date())}>
      <PageHeader
        className="mb-0"
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {fp.origin_icao} → {fp.destination_icao}
            <Badge variant={state.variant}>{state.label}</Badge>
            {!plan && (
              <Badge variant="neutral">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                {tn("detail.legacyBadge")}
              </Badge>
            )}
          </span>
        }
        description={
          fp.user && pilotName && me && !isOwner
            ? t("planDetail.descriptionWithPilot", { type: typeLabel, pilot: pilotName })
            : t("planDetail.description", { type: typeLabel })
        }
        actions={
          <>
            <BackButton />
            <FlightPlanActions
              flightPlanId={flightId}
              flightDetails={{ departure: fp.origin_icao, arrival: fp.destination_icao, date: dateStr }}
            />
            {plan && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Printer className="h-4 w-4" aria-hidden="true" />}
                    {tn("detail.documents")}
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{tn("detail.printLog")}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => print("A5")}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {tn("detail.printA5")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => print("A4")}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {tn("detail.printA4")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>{tn("detail.dossier")}</DropdownMenuLabel>
                  <DropdownMenuItem disabled={exporting} onSelect={() => void downloadDossier("A4")}>
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    {tn("detail.dossierA4")}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={exporting} onSelect={() => void downloadDossier("A5")}>
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                    {tn("detail.dossierA5")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canEdit && (
              <Button variant="outline" asChild>
                <Link href={`/reservations/flight-plans/create/${fp.reservation.id}?plan=${plan!.id}`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  {tn("detail.edit")}
                </Link>
              </Button>
            )}
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

      {plan ? (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 sm:grid-cols-4">
            <Fact label={t("common:labels.date")} value={`${dateStr} · ${formatTime(departureAt)}`} />
            <Fact
              label={t("common:labels.aircraft")}
              value={aircraft ? `${aircraft.registration_number}${aircraft.model ? ` · ${aircraft.model}` : ""}` : "—"}
            />
            <Fact label={t("planDetail.aircraftAndPilot.pilotInCommand")} value={pilotName || "—"} />
            <Fact label={tn("detail.computedAt")} value={formatDateTime(plan.updatedAt)} />
          </dl>

          <PreparationDisclaimer />
          {plan.result.navdata.stale && <NavdataAge navdata={plan.result.navdata} />}
          {!fp.closed_at && (
            <Alert className="no-print">
              <Info className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t("planDetail.beforeDeparture.title")}</AlertTitle>
              <AlertDescription>{tn("detail.beforeDeparture")}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-6">
            <div className="map-container h-72 overflow-hidden rounded-xl border sm:h-96">
              <AeroMap
                points={planMap?.points ?? []}
                alternate={planMap?.alternate}
                profile={plan.result.profile}
                legDistancesNm={planMap?.distances}
                legLabels={planMap?.labels}
                crossedAirspaces={planMap?.crossed}
                warnedObstacles={planMap?.obstacles}
              />
            </div>
            <Card className="min-w-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  <h2>{tn("builder.results.title")}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResultsPanel
                  result={plan.result}
                  reserveCase={plan.input.reserveCase}
                  departureTime={plan.input.departureTime}
                  settings={settingsData?.flightPlanningSettings ?? null}
                  roles={roles}
                />
              </CardContent>
            </Card>
          </div>

          <PrintableNavLog
            result={plan.result}
            input={plan.input}
            aircraft={aircraft?.registration_number ?? "—"}
            pilot={pilotName ?? "—"}
            format={printFormat}
          />
        </>
      ) : (
        <>
          <Alert className={WARNING_ALERT}>
            <History className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{tn("detail.legacyTitle")}</AlertTitle>
            <AlertDescription>{tn("detail.legacyDescription")}</AlertDescription>
          </Alert>

          <FlightSummary
            departure={{ icao: fp.origin_icao, time: formatTime(departureAt) }}
            arrival={{ icao: fp.destination_icao, time: formatTime(arrivalAt) }}
            duration={fp.estimated_flight_time ? formatFlightDuration(fp.estimated_flight_time) : undefined}
            distanceKm={fp.distance_km}
            facts={[
              { label: t("common:labels.date"), value: dateStr },
              {
                label: t("common:labels.aircraft"),
                value: aircraft ? `${aircraft.registration_number}${aircraft.model ? ` · ${aircraft.model}` : ""}` : "—",
              },
              { label: t("plans.labels.passengers"), value: fp.number_of_passengers ?? "—" },
              { label: t("planDetail.aircraftAndPilot.pilotInCommand"), value: pilotName || "—" },
            ]}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <WaypointInfo waypoints={waypoints} />
            </div>
            <div className="map-container h-72 overflow-hidden rounded-xl border sm:h-96 xl:col-span-3 xl:h-[32rem]">
              {legacyMap.length >= 2 ? (
                <AeroMap points={legacyMap} />
              ) : (
                <EmptyState
                  className="h-full rounded-none border-0"
                  icon={FileSearch}
                  title={t("planDetail.map.unavailableTitle")}
                  description={t("planDetail.map.unavailableDescription")}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}
