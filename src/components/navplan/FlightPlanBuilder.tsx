"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { AlertTriangle, Loader2, RotateCcw, Save } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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
import { aircraftDataState, missingAircraftData } from "@/lib/navplan/status"
import type {
  AircraftMassBalance,
  AircraftPerformance,
  EnvelopeCategory,
  FlightPlanInput,
  FlightPlanningSettings,
  NavdataInfo,
  NavPoint,
  ReserveCase,
} from "@/lib/navplan/types"
import type { MassUnit, VolumeUnit } from "@/lib/navplan/units"
import { formatTime } from "@/lib/format"
import { isNavPoint, type AeroMapProps } from "@/components/map/types"
import type { MapPoint } from "@/components/map/layers/route"
import { LoadEditor } from "./LoadEditor"
import { NavdataAge, PreparationDisclaimer, WARNING_ALERT } from "./NoticesBanner"
import { NumberField } from "./NumberField"
import { ResultsPanel, ResultsSummary, type ResultsTab } from "./ResultsPanel"
import { RouteEditor } from "./RouteEditor"
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
}

const RESERVE_CASES: ReserveCase[] = ["VFR_DAY", "VFR_DAY_LOCAL", "VFR_NIGHT"]

/** The flight preparation: route on the map and in a list, load, and the live results. */
export function FlightPlanBuilder({ initialDraft, aircraft, settings, navdata, isAdmin, saving, onSave }: FlightPlanBuilderProps) {
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
  const [tab, setTab] = useState<ResultsTab>("log")
  const [dirty, setDirty] = useState(false)

  const dataState = aircraftDataState(aircraft.performance, aircraft.massBalance)
  const missing = missingAircraftData(aircraft.performance, aircraft.massBalance)
  const issues = draftIssues(draft)
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
  const legDistances = useMemo(() => result?.legs.map((leg) => leg.distanceNm) ?? [], [result])
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
      return
    }
    if (result?.status === "BLOCKING") {
      setConfirmBlocking(true)
      return
    }
    onSave(input)
  }

  const departureLocal = toLocalInputValue(draft.departureTime)

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <PreparationDisclaimer />
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                <h2>{t("builder.flight.title")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
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
              <div className="space-y-2">
                <Label htmlFor="reserve-case">{t("builder.flight.reserveCase")}</Label>
                <Select
                  value={draft.reserveCase}
                  onValueChange={(value) => change((current) => ({ ...current, reserveCase: value as ReserveCase }))}
                >
                  <SelectTrigger id="reserve-case">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESERVE_CASES.map((reserveCase) => (
                      <SelectItem key={reserveCase} value={reserveCase}>
                        {t(`reserveCase.${reserveCase}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qnh">{t("builder.flight.qnh")}</Label>
                <NumberField
                  id="qnh"
                  value={draft.qnhHpa}
                  unit="hPa"
                  digits={0}
                  placeholder={t("builder.flight.qnhPlaceholder")}
                  invalid={issues.some((issue) => issue.code === "QNH_INVALID")}
                  aria-describedby="qnh-hint"
                  onValueChange={(value) => change((current) => ({ ...current, qnhHpa: value }))}
                />
                <p id="qnh-hint" className="text-xs text-muted-foreground">
                  {issues.some((issue) => issue.code === "QNH_INVALID") ? (
                    <span className="text-destructive">{t("builder.flight.qnhInvalid")}</span>
                  ) : (
                    t("builder.flight.qnhHint")
                  )}
                </p>
              </div>
              {envelopeCategories.length > 1 && (
                <div className="space-y-2 sm:col-span-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                <h2>{t("builder.route.title")}</h2>
              </CardTitle>
              <CardDescription>{t("builder.route.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <RouteEditor
                route={draft.route}
                onChange={(route) => changeRoute(() => route)}
                computedLegs={result?.legs}
                cruiseSettings={cruiseSettings}
                normalSetting={aircraft.performance?.cruise.normalSetting}
                showErrors={showErrors}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                <h2>{t("builder.load.title")}</h2>
              </CardTitle>
              <CardDescription>{t("builder.load.description")}</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        {/* Map and verdict stay in view while the route and the load are edited. */}
        <div className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="map-container h-72 overflow-hidden rounded-xl border sm:h-96 xl:h-[28rem]">
            <AeroMap
              points={mapPoints}
              alternate={draft.route.alternate}
              profile={result?.profile}
              legDistancesNm={legDistances}
              editable
              onAddPoint={handleMapAdd}
              onMoveWaypoint={handleMapMove}
              onInsertPoint={handleMapInsert}
            />
          </div>

          {result && isComputable(issues) && !error && (
            <Card>
              <CardContent className="p-4">
                <ResultsSummary result={result} pending={pending} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            <h2>{t("builder.results.title")}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isComputable(issues) ? (
            <p className="text-sm text-muted-foreground">{t("builder.results.waiting")}</p>
          ) : error ? (
            <div className="flex flex-col items-start gap-3 text-sm" role="alert">
              <p className="text-destructive">{t("builder.results.error")}</p>
              <Button type="button" variant="outline" onClick={retry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t("builder.results.retry")}
              </Button>
            </div>
          ) : !result ? (
            <div className="space-y-3" aria-busy="true">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <ResultsPanel
              hideSummary
              result={result}
              reserveCase={draft.reserveCase}
              settings={settings}
              weighingDate={aircraft.massBalance?.weighingDate}
              roles={roles}
              pending={pending}
              tab={tab}
              onTabChange={setTab}
            />
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" role="status">
          {showErrors && !input ? <span className="text-destructive">{t("builder.save.incomplete")}</span> : dirty ? t("builder.save.unsaved") : t("builder.save.hint")}
        </p>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {t("builder.save.action")}
        </Button>
      </div>

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
