"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { AlertTriangle, ArrowRight, Loader2, Printer, RotateCcw, Save, SlidersHorizontal } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { draftIssues, fromLocalInputValue, isComputable, toLocalInputValue, withAircraftStations, type FlightPlanDraft } from "@/lib/navplan/draft"
import {
  appendWaypoint,
  insertWaypoint,
  moveWaypoint,
  routePointFromNavPoint,
  routePoints,
  setDeparture,
  setDestination,
  userPoint,
  type RouteDraft,
} from "@/lib/navplan/route"
import { aircraftDataState, airspaceTypeLabel, missingAircraftData } from "@/lib/navplan/status"
import type {
  AircraftMassBalance,
  AircraftPerformance,
  EnvelopeCategory,
  FlightPlanInput,
  FlightPlanningSettings,
  NavdataInfo,
  NavPoint,
  PdfFormat,
  ReserveCase,
} from "@/lib/navplan/types"
import { formatCourse, formatNm, type MassUnit, type VolumeUnit } from "@/lib/navplan/units"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { isNavPoint, type AeroMapProps } from "@/components/map/types"
import type { MapPoint } from "@/components/map/layers/route"
import { AirspaceCrossings, airspacesNotChecked, crossedAirspaceStatuses, crossedAirspaces } from "./AirspaceCrossings"
import { FlightConditions, formatUtcDateTime } from "./FlightConditions"
import { FuelSummary } from "./FuelSummary"
import { LoadEditor } from "./LoadEditor"
import { MassBalancePanel } from "./MassBalancePanel"
import { NavLogTable } from "./NavLogTable"
import { RunwayDistancesSummary } from "./RunwayDistances"
import { TerrainProfileChart } from "./TerrainProfileChart"
import { NavdataAge, PreparationDisclaimer, WARNING_ALERT } from "./NoticesBanner"
import { NumberField } from "./NumberField"
import { PlanSummary, checksFromNotices, type Check } from "./PlanSummary"
import { PrintableNavLog, printNavLog } from "./PrintableNavLog"
import { AerodromesPanel, aerodromeSheetId } from "./AerodromeSheet"
import { RouteEditor } from "./RouteEditor"
import { WeatherPanel } from "./WeatherPanel"
import { useFlightPlanDraft } from "./useFlightPlanDraft"

const AeroMap = dynamic<AeroMapProps>(() => import("@/components/map/AeroMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
})

export interface BuilderAircraft {
  id: number
  registration: string
  performance: AircraftPerformance | null
  massBalance: AircraftMassBalance | null
}

interface FlightPlanBuilderProps {
  initialDraft: FlightPlanDraft
  aircraft: BuilderAircraft
  settings: FlightPlanningSettings | null
  navdata: NavdataInfo | null
  isAdmin: boolean
  saving: boolean
  onSave: (input: FlightPlanInput) => void
  /** Printed on the paper log. */
  pilotName?: string
}

export const BUILDER_STEPS = ["route", "load", "log"] as const
export type BuilderStep = (typeof BUILDER_STEPS)[number]

const RESERVE_CASES: ReserveCase[] = ["VFR_DAY", "VFR_NIGHT", "VFR_DAY_LOCAL"]

// Wide screens carry the save button next to the steps; phones at the bottom, within reach.
const WIDE = "(min-width: 1024px)"
function useWideScreen() {
  const [wide, setWide] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(WIDE)
    const listener = () => setWide(media.matches)
    listener()
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])
  return wide
}

/**
 * The flight preparation in three steps, as a pilot prepares a navigation: the route on the map,
 * the aircraft and its load, then the nav log and the file. The API computes everything live; the
 * verdict and the points to check stay above the steps.
 */
export function FlightPlanBuilder({ initialDraft, aircraft, settings, navdata, isAdmin, saving, onSave, pilotName }: FlightPlanBuilderProps) {
  const { t } = useTranslation("navplan")
  const startDraft = useMemo(
    () => withAircraftStations(initialDraft, aircraft.massBalance, aircraft.performance),
    [initialDraft, aircraft.massBalance, aircraft.performance],
  )
  const { draft, update, input, result, pending, error, retry } = useFlightPlanDraft(startDraft)
  const [showErrors, setShowErrors] = useState(false)
  const [confirmBlocking, setConfirmBlocking] = useState(false)
  const [massUnit, setMassUnit] = useState<MassUnit>("kg")
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("L")
  const [step, setStep] = useState<BuilderStep>("route")
  // The full sheet of an aerodrome is in the log step: shown there, scrolled to.
  const openAerodrome = (icao: string) => {
    setStep("log")
    setTimeout(() => document.getElementById(aerodromeSheetId(icao))?.scrollIntoView({ behavior: "smooth", block: "start" }), 120)
  }
  const [dirty, setDirty] = useState(false)
  const [printFormat, setPrintFormat] = useState<PdfFormat>("A5")
  const wide = useWideScreen()

  const dataState = aircraftDataState(aircraft.performance, aircraft.massBalance)
  const missing = missingAircraftData(aircraft.performance, aircraft.massBalance)
  const issues = draftIssues(draft)
  const computable = isComputable(issues)
  const shownResult = computable && !error ? result : null
  const cruiseSettings = useMemo(
    () => [...new Set((aircraft.performance?.cruise.rows ?? []).map((row) => row.setting))],
    [aircraft.performance],
  )
  const envelopeCategories = useMemo(
    () => (aircraft.massBalance?.envelopes ?? []).map((envelope) => envelope.category),
    [aircraft.massBalance],
  )

  const change = useCallback(
    (next: (current: FlightPlanDraft) => FlightPlanDraft) => {
      setDirty(true)
      update(next)
    },
    [update],
  )
  const changeRoute = useCallback(
    (next: (route: RouteDraft) => RouteDraft) => change((current) => ({ ...current, route: next(current.route) })),
    [change],
  )

  // Warn before the browser leaves a plan that is not saved.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  const handleMapAdd = useCallback(
    (point: NavPoint | MapPoint) =>
      changeRoute((route) => {
        if (isNavPoint(point) && point.type === "AERODROME") {
          if (!route.departure) return setDeparture(route, routePointFromNavPoint(point))
          if (!route.destination) return setDestination(route, routePointFromNavPoint(point))
        }
        return appendWaypoint(route, isNavPoint(point) ? routePointFromNavPoint(point) : userPoint(route, point.lat, point.lon))
      }),
    [changeRoute],
  )
  const handleMapMove = useCallback(
    (index: number, lat: number, lon: number) => changeRoute((route) => moveWaypoint(route, index, lat, lon)),
    [changeRoute],
  )
  const handleMapInsert = useCallback(
    (legIndex: number, lat: number, lon: number) => changeRoute((route) => insertWaypoint(route, legIndex, userPoint(route, lat, lon))),
    [changeRoute],
  )

  const mapPoints = useMemo(() => routePoints(draft.route), [draft.route])
  // Leg figures on the map only while the computed legs are those of the route drawn.
  const mapLegs = useMemo(() => {
    const legs = result?.legs ?? []
    const matches = legs.length === mapPoints.length - 1 && legs.every((leg, index) => leg.from.ident === mapPoints[index].ident && leg.to.ident === mapPoints[index + 1].ident)
    return matches ? legs : []
  }, [result, mapPoints])
  const legDistances = useMemo(() => mapLegs.map((leg) => leg.distanceNm), [mapLegs])
  // The airspaces the drawn route goes through, highlighted on the map.
  const mapCrossings = useMemo(
    () => crossedAirspaceStatuses(mapLegs.length > 0 && result?.alternateLeg ? [...mapLegs, result.alternateLeg] : mapLegs),
    [mapLegs, result],
  )
  // Obstacles less than 500 ft under a leg: always on the map, in red.
  const mapObstacles = useMemo(
    () => (mapLegs.length > 0 && result?.alternateLeg ? [...mapLegs, result.alternateLeg] : mapLegs).flatMap((leg) => leg.obstacles ?? []),
    [mapLegs, result],
  )
  const legLabels = useMemo(() => mapLegs.map((leg) => `${formatCourse(leg.magneticCourseDeg)} · ${formatNm(leg.distanceNm, 0)}`), [mapLegs])
  const roles = useMemo(() => {
    const value: Record<string, "departure" | "destination" | "alternate"> = {}
    if (draft.route.departure) value[draft.route.departure.ident] = "departure"
    if (draft.route.destination) value[draft.route.destination.ident] = "destination"
    if (draft.route.alternate) value[draft.route.alternate.ident] = "alternate"
    return value
  }, [draft.route])

  const save = () => {
    if (!input) {
      setShowErrors(true)
      // The missing fields (aerodromes, altitudes) are on the route step.
      setStep("route")
      return
    }
    if (result?.status === "BLOCKING") {
      setConfirmBlocking(true)
      return
    }
    onSave(input)
  }

  const departureLocal = toLocalInputValue(draft.departureTime)

  // Part of the flight at night (the API decides, from the sun at the times of the flight): the
  // night reserve applies and the day cases cannot be chosen.
  const daylight = result?.daylight
  const night = daylight?.night === true
  useEffect(() => {
    if (night && draft.reserveCase !== "VFR_NIGHT") update((current) => ({ ...current, reserveCase: "VFR_NIGHT" }))
  }, [night, draft.reserveCase, update])
  const departureSun = daylight?.aerodromes.find((aerodrome) => aerodrome.role === "departure")

  const checks = useMemo<Check[]>(() => {
    if (!shownResult) return []
    const own: Check[] = night
      ? [
          {
            key: "night",
            status: "WARNING",
            message: t("builder.flight.nightImposed", {
              time: formatUtcDateTime(daylight?.nightFrom, draft.departureTime),
              icao: departureSun?.icao ?? "—",
              dusk: formatUtcDateTime(departureSun?.civilDusk, draft.departureTime),
              dawn: formatUtcDateTime(departureSun?.civilDawn, draft.departureTime),
            }),
          },
        ]
      : []
    // Every airspace the route goes through that asks something (clearance, activity to check,
    // forbidden), once, with what to do.
    const flown = shownResult.alternateLeg ? [...shownResult.legs, shownResult.alternateLeg] : shownResult.legs
    const zones: Check[] = crossedAirspaces(flown)
      .filter((crossing) => crossing.status !== "OK")
      .map((crossing) => ({
        key: `airspace-${crossing.airspace.id}`,
        status: crossing.status,
        message: t("crossings.check", {
          name: crossing.airspace.name,
          kind: [airspaceTypeLabel(crossing.airspace.type), crossing.airspace.icaoClass ? t("crossings.class", { value: crossing.airspace.icaoClass }) : null]
            .filter(Boolean)
            .join(" · "),
          requirement: crossing.requirement,
        }),
      }))
    return [...own, ...zones, ...checksFromNotices(shownResult.notices)]
  }, [shownResult, night, daylight, departureSun, draft.departureTime, t])

  const qnhInvalid = issues.some((issue) => issue.code === "QNH_INVALID")
  const stepIndex = BUILDER_STEPS.indexOf(step)
  const nextStep = BUILDER_STEPS[stepIndex + 1]

  const status = showErrors && !input ? <span className="text-destructive">{t("builder.save.incomplete")}</span> : dirty ? t("builder.save.unsaved") : t("builder.save.hint")
  const saveButton = (
    <Button type="button" className="flex-1 lg:flex-none" onClick={save} disabled={saving}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
      {t("builder.save.action")}
    </Button>
  )
  // Wide screen: next to the steps. Phone: a slim bar at the bottom, within reach of the thumb.
  const actions = wide ? (
    <div className="flex items-center gap-3">
      <p className="text-xs text-muted-foreground" role="status">
        {status}
      </p>
      {saveButton}
    </div>
  ) : (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground" role="status">
        {status}
      </p>
      <div className="flex gap-2">
        {nextStep && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            aria-label={t("builder.steps.next", { step: t(`builder.steps.${nextStep}`) })}
            onClick={() => setStep(nextStep)}
          >
            {t("builder.steps.nextShort")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {saveButton}
      </div>
    </div>
  )

  const print = (format: PdfFormat) => {
    setPrintFormat(format)
    printNavLog(format)
  }

  return (
    <div className="space-y-4">
      {(dataState !== "VALIDATED" || navdata?.stale) && (
        <div className="space-y-3">
          {navdata?.stale && <NavdataAge navdata={navdata} />}
          {dataState !== "VALIDATED" && (
            <Alert className={WARNING_ALERT}>
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t(`aircraftState.${dataState}.title`, { registration: aircraft.registration })}</AlertTitle>
              <AlertDescription className="space-y-1">
                <p>{t(`aircraftState.${dataState}.builder`)}</p>
                {missing.length > 0 && (
                  <p className="text-xs">{t("aircraftState.missingList", { list: missing.map((field) => t(`aircraftState.missing.${field}`)).join(", ") })}</p>
                )}
                {isAdmin ? (
                  <Link className="font-medium underline underline-offset-4" href={`/administration/planes/${aircraft.id}/flight-data`}>
                    {t("aircraftState.openEditor")}
                  </Link>
                ) : (
                  <p>{t("aircraftState.askAdmin")}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      <Tabs value={step} onValueChange={(value) => setStep(value as BuilderStep)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="grid h-auto w-full grid-cols-3 sm:inline-grid sm:w-auto" aria-label={t("builder.steps.label")}>
          {BUILDER_STEPS.map((value, index) => (
            <TabsTrigger key={value} value={value} className="gap-2 whitespace-normal px-2 sm:whitespace-nowrap sm:px-4">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted-foreground/15 text-xs tabular-nums"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {t(`builder.steps.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {wide && actions}
        </div>

        <div className="mt-4">
          {!computable ? (
            <p className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground">{t("builder.results.waiting")}</p>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-sm" role="alert">
              <p className="text-destructive">{t("builder.results.error")}</p>
              <Button type="button" variant="outline" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t("builder.results.retry")}
              </Button>
            </div>
          ) : !result ? (
            <Skeleton className="h-24 w-full rounded-xl" aria-busy="true" />
          ) : (
            <PlanSummary result={result} pending={pending} checks={checks} />
          )}
        </div>

        <TabsContent value="route" className="flex flex-col gap-3">
          <RouteEditor
            route={draft.route}
            onChange={(route) => changeRoute(() => route)}
            computedLegs={result?.legs}
            cruiseSettings={cruiseSettings}
            normalSetting={aircraft.performance?.cruise.normalSetting}
            showErrors={showErrors}
            onOpenAerodrome={openAerodrome}
            before={
              <div className="w-full space-y-1 sm:w-60">
                <Label htmlFor="departure-time">{t("builder.flight.departureTime")}</Label>
                <Input
                  id="departure-time"
                  type="datetime-local"
                  value={departureLocal}
                  aria-describedby="departure-time-utc"
                  onChange={(event) => {
                    const iso = fromLocalInputValue(event.target.value)
                    if (iso) change((current) => ({ ...current, departureTime: iso }))
                  }}
                />
                <p id="departure-time-utc" className="text-xs text-muted-foreground">
                  {t("builder.flight.utc", { time: new Date(draft.departureTime).toISOString().slice(11, 16), local: formatTime(draft.departureTime) })}
                </p>
              </div>
            }
            after={
              // Level with the inputs, under their labels.
              <div className="pt-[1.125rem]">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" className={cn("gap-1.5 text-muted-foreground", (qnhInvalid || draft.qnhHpa !== null) && "text-foreground")}>
                      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                      {t("builder.advanced.title")}
                      {draft.qnhHpa !== null && <span className="text-xs tabular-nums">· QNH {draft.qnhHpa}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 space-y-1.5" align="start" aria-label={t("builder.advanced.title")}>
                    <Label htmlFor="qnh">{t("builder.flight.qnh")}</Label>
                    <NumberField
                      id="qnh"
                      value={draft.qnhHpa}
                      unit="hPa"
                      digits={0}
                      placeholder={t("builder.flight.qnhPlaceholder")}
                      invalid={qnhInvalid}
                      aria-describedby="qnh-hint"
                      onValueChange={(value) => change((current) => ({ ...current, qnhHpa: value }))}
                    />
                    <p id="qnh-hint" className="text-xs text-muted-foreground">
                      {qnhInvalid ? <span className="text-destructive">{t("builder.flight.qnhInvalid")}</span> : t("builder.flight.qnhHint")}
                    </p>
                    <p className="pt-1 text-xs text-muted-foreground">{t("builder.advanced.legHint")}</p>
                  </PopoverContent>
                </Popover>
              </div>
            }
          />
          {/* Phone: the map first, the fields and the strip under it. Wide screen: the strip above the map. */}
          <div className="map-container order-first h-80 overflow-hidden rounded-xl border sm:h-[28rem] lg:order-none lg:h-[max(30rem,calc(100dvh-26rem))]">
            <AeroMap
              points={mapPoints}
              alternate={draft.route.alternate}
              profile={mapLegs.length > 0 ? result?.profile : undefined}
              legDistancesNm={legDistances}
              legLabels={legLabels}
              crossedAirspaces={mapCrossings}
              warnedObstacles={mapObstacles}
              editable
              onAddPoint={handleMapAdd}
              onMoveWaypoint={handleMapMove}
              onInsertPoint={handleMapInsert}
            />
          </div>
        </TabsContent>

        <TabsContent value="load">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  <h2>{t("builder.load.title")}</h2>
                </CardTitle>
                <CardDescription>{t("builder.load.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(aircraft.massBalance?.stations.length ?? 0) === 0 && (aircraft.performance?.fuel.tanks.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("builder.load.noStations")}</p>
                ) : (
                  <LoadEditor
                    stations={aircraft.massBalance?.stations ?? []}
                    tanks={aircraft.performance?.fuel.tanks ?? []}
                    loads={draft.loads}
                    fuel={draft.fuel}
                    massUnit={massUnit}
                    volumeUnit={volumeUnit}
                    onMassUnitChange={setMassUnit}
                    onVolumeUnitChange={setVolumeUnit}
                    onLoadChange={(stationId, massKg) => change((current) => ({ ...current, loads: { ...current.loads, [stationId]: massKg } }))}
                    onFuelChange={(tankId, litres) => change((current) => ({ ...current, fuel: { ...current.fuel, [tankId]: litres } }))}
                  />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="reserve-case">{t("builder.flight.reserveCase")}</Label>
                    <Select value={draft.reserveCase} onValueChange={(value) => change((current) => ({ ...current, reserveCase: value as ReserveCase }))}>
                      <SelectTrigger id="reserve-case" aria-describedby={night ? "reserve-case-night" : undefined}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESERVE_CASES.map((reserveCase) => (
                          <SelectItem key={reserveCase} value={reserveCase} disabled={night && reserveCase !== "VFR_NIGHT"}>
                            {t(`reserveCase.${reserveCase}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {night && (
                      <p id="reserve-case-night" className="text-xs font-medium text-warning">
                        {t("builder.flight.nightShort")}
                      </p>
                    )}
                  </div>
                  {envelopeCategories.length > 1 && (
                    <div className="space-y-1.5">
                      <Label htmlFor="envelope-category">{t("builder.flight.envelopeCategory")}</Label>
                      <Select
                        value={draft.envelopeCategory}
                        onValueChange={(value) => change((current) => ({ ...current, envelopeCategory: value as EnvelopeCategory }))}
                      >
                        <SelectTrigger id="envelope-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {envelopeCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {t(`envelopeCategory.${category}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">
                  <h2>{t("results.tabs.massBalance")}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {shownResult ? (
                  <MassBalancePanel massBalance={shownResult.massBalance} weighingDate={aircraft.massBalance?.weighingDate} stacked />
                ) : (
                  <p className="text-sm text-muted-foreground">{t("builder.results.waitingShort")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">
                  <h2>{t("results.tabs.log")}</h2>
                </CardTitle>
                <CardDescription>{t("builder.log.description")}</CardDescription>
              </div>
              {shownResult && input && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => print("A5")}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {t("detail.printA5")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => print("A4")}>
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    {t("detail.printA4")}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {shownResult ? (
                <NavLogTable
                  legs={shownResult.legs}
                  alternateLeg={shownResult.alternateLeg}
                  totalDistanceNm={shownResult.totalDistanceNm}
                  totalTimeMin={shownResult.totalTimeMin}
                  aerodromes={shownResult.aerodromes}
                  onOpenAerodrome={openAerodrome}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t("builder.results.waitingShort")}</p>
              )}
              <p className="text-xs text-muted-foreground">{t("builder.log.pdfHint")}</p>
            </CardContent>
          </Card>

          {shownResult && (
            <>
              <ResultCard title={t("profile.title")}>
                <TerrainProfileChart result={shownResult} />
              </ResultCard>
              {(shownResult.aerodromes ?? []).some((aerodrome) => aerodrome.distances) && (
                <ResultCard title={t("distances.title")}>
                  <RunwayDistancesSummary aerodromes={shownResult.aerodromes} />
                </ResultCard>
              )}
              <div className="grid items-start gap-4 xl:grid-cols-2">
                <ResultCard title={t("results.tabs.fuel")}>
                  {/* The API applies the night reserve to a flight partly at night, whatever was chosen. */}
                  <FuelSummary fuel={shownResult.fuel} reserveCase={shownResult.fuel.reserveCase ?? draft.reserveCase} settings={settings} />
                </ResultCard>
                <div className="grid gap-4">
                  <ResultCard title={t("results.tabs.airspaces")}>
                    <AirspaceCrossings
                      legs={shownResult.legs}
                      alternateLeg={shownResult.alternateLeg}
                      notChecked={airspacesNotChecked(shownResult.notices)}
                      unverified={shownResult.unverifiedAirspaces}
                    />
                  </ResultCard>
                  <ResultCard title={t("conditions.title")}>
                    <FlightConditions result={shownResult} departureTime={draft.departureTime} bare />
                  </ResultCard>
                </div>
              </div>
              <ResultCard title={t("aerodrome.title")}>
                <AerodromesPanel result={shownResult} />
              </ResultCard>
              <ResultCard title={t("results.tabs.weather")}>
                <WeatherPanel
                  reports={shownResult.weather}
                  roles={roles}
                  windSource={shownResult.windSource}
                  columns
                  aerodromes={shownResult.aerodromes}
                  freezingLevels={shownResult.freezingLevels}
                  legs={shownResult.alternateLeg ? [...shownResult.legs, shownResult.alternateLeg] : shownResult.legs}
                />
              </ResultCard>
            </>
          )}
        </TabsContent>
      </Tabs>

      <div className="space-y-1">
        <PreparationDisclaimer />
        {shownResult && !shownResult.navdata.stale && <NavdataAge navdata={shownResult.navdata} />}
      </div>

      {!wide && <div className="sticky bottom-2 z-10 rounded-lg border bg-card p-2.5 shadow-sm">{actions}</div>}

      {shownResult && input && (
        <PrintableNavLog result={shownResult} input={input} aircraft={aircraft.registration} pilot={pilotName ?? "—"} format={printFormat} />
      )}

      <AlertDialog open={confirmBlocking} onOpenChange={setConfirmBlocking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("builder.save.blockingTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("builder.save.blockingDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (input) onSave(input)
              }}
            >
              {t("builder.save.saveAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">
          <h3>{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
