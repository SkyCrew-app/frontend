"use client"

import { Fragment, useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, ChevronDown, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  appendWaypoint,
  removeWaypoint,
  renameWaypoint,
  reorderWaypoint,
  routePointFromNavPoint,
  setAlternate,
  setAllAltitudes,
  setDeparture,
  setDestination,
  setLegAltitude,
  setLegSetting,
  setLegWind,
  userPoint,
  type RouteDraft,
  type RoutePoint,
} from "@/lib/navplan/route"
import { MAX_ALTITUDE_FT } from "@/lib/navplan/draft"
import type { Leg, NavPoint } from "@/lib/navplan/types"
import { formatCourse, formatFt, formatMinutes, formatNm } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"
import { NavPointSearch } from "./NavPointSearch"
import { NumberField } from "./NumberField"

interface RouteEditorProps {
  route: RouteDraft
  onChange: (route: RouteDraft) => void
  /** Legs of the last computation: course, distance and time of each leg, suggested altitudes. */
  computedLegs?: Leg[]
  /** Settings of the cruise table of the aircraft ("2400 tr/min", "65 %"). */
  cruiseSettings?: string[]
  normalSetting?: string | null
  showErrors?: boolean
}

const toRoutePoint = (route: RouteDraft, point: NavPoint): RoutePoint =>
  point.type === "USER" ? userPoint(route, point.lat, point.lon, point.ident || undefined) : routePointFromNavPoint(point)

const validAltitude = (value: number | null): value is number => value !== null && value >= 0 && value <= MAX_ALTITUDE_FT

/** The most frequent altitude of the legs: what the pilot thinks of as "the" cruise altitude. */
const usualAltitude = (route: RouteDraft) => {
  const counts = new Map<number, number>()
  for (const leg of route.legs) counts.set(leg.altitudeFt, (counts.get(leg.altitudeFt) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

// Dot of the strip: a filled one for an aerodrome of the route, a ring for a turning point.
function StripDot({ kind }: { kind: "end" | "point" | "alternate" }) {
  return (
    <span
      className={cn(
        "relative z-10 mt-3.5 flex h-3 w-3 shrink-0 rounded-full border-2 border-brand",
        kind === "end" && "bg-brand",
        kind === "point" && "bg-card",
        kind === "alternate" && "border-dashed bg-card",
      )}
      aria-hidden="true"
    />
  )
}

/**
 * The route as an ordered strip, as on a route panel of a planning software: departure, turning
 * points and destination, and between two points a one-line leg (magnetic course, distance, time)
 * that opens on its own altitude and options. One cruise altitude sets every leg at once.
 */
export function RouteEditor({ route, onChange, computedLegs = [], cruiseSettings = [], normalSetting, showErrors = false }: RouteEditorProps) {
  const { t } = useTranslation("navplan")
  const [cruiseAltitude, setCruiseAltitude] = useState<number | null>(usualAltitude(route))
  const near = route.departure ? { lat: route.departure.lat, lon: route.departure.lon } : null
  const departureMissing = showErrors && !route.departure
  const destinationMissing = showErrors && !route.destination
  const cruiseInvalid = cruiseAltitude !== null && !validAltitude(cruiseAltitude)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="route-cruise-altitude">{t("route.cruiseAltitude")}</Label>
        <NumberField
          id="route-cruise-altitude"
          value={cruiseAltitude}
          unit="ft"
          digits={0}
          invalid={cruiseInvalid}
          aria-describedby="route-cruise-altitude-hint"
          onValueChange={(value) => {
            setCruiseAltitude(value)
            if (validAltitude(value)) onChange(setAllAltitudes(route, Math.round(value)))
          }}
        />
        <p id="route-cruise-altitude-hint" className={cn("text-xs", cruiseInvalid ? "text-destructive" : "text-muted-foreground")}>
          {cruiseInvalid ? t("route.altitudeInvalid", { max: formatFt(MAX_ALTITUDE_FT) }) : t("route.cruiseAltitudeHint")}
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("route.legsTitle")}</h3>
        <ol className="relative space-y-1" aria-label={t("route.legsTitle")}>
          {/* The line that joins the points of the strip. */}
          <span className="absolute bottom-4 left-[0.3125rem] top-4 w-0.5 bg-brand/40" aria-hidden="true" />
          <li className="flex items-start gap-3">
            <StripDot kind="end" />
            <EndPoint
              id="route-departure"
              role={t("route.departureShort")}
              label={t("route.departure")}
              point={route.departure}
              near={near}
              missing={departureMissing}
              error={t("route.departureRequired")}
              onSelect={(point) => onChange(setDeparture(route, routePointFromNavPoint(point)))}
            />
          </li>
          {route.legs.map((leg, legIndex) => {
            const waypoint = route.waypoints[legIndex]
            const from = legIndex === 0 ? route.departure : route.waypoints[legIndex - 1]
            const to = waypoint ?? route.destination
            const candidate = computedLegs[legIndex]
            // Figures of the last computation, only while they are still about these two points.
            const computed = candidate && from && to && candidate.from.ident === from.ident && candidate.to.ident === to.ident ? candidate : undefined
            return (
              <Fragment key={`leg-${legIndex}`}>
                <LegRow
                  index={legIndex}
                  label={`${from?.ident ?? "…"} → ${to?.ident ?? "…"}`}
                  leg={leg}
                  computed={computed}
                  cruiseAltitude={validAltitude(cruiseAltitude) ? cruiseAltitude : null}
                  cruiseSettings={cruiseSettings}
                  normalSetting={normalSetting}
                  showErrors={showErrors}
                  onAltitude={(altitude) => onChange(setLegAltitude(route, legIndex, altitude))}
                  onWind={(wind) => onChange(setLegWind(route, legIndex, wind ?? null))}
                  onSetting={(setting) => onChange(setLegSetting(route, legIndex, setting))}
                />
                {waypoint && (
                  <WaypointRow
                    point={waypoint}
                    index={legIndex}
                    count={route.waypoints.length}
                    onUp={() => onChange(reorderWaypoint(route, legIndex, legIndex - 1))}
                    onDown={() => onChange(reorderWaypoint(route, legIndex, legIndex + 1))}
                    onRemove={() => onChange(removeWaypoint(route, legIndex))}
                    onRename={(name) => onChange(renameWaypoint(route, legIndex, name))}
                  />
                )}
              </Fragment>
            )
          })}
          <li className="flex items-start gap-3">
            <StripDot kind="end" />
            <EndPoint
              id="route-destination"
              role={t("route.destinationShort")}
              label={t("route.destination")}
              point={route.destination}
              near={near}
              missing={destinationMissing}
              error={t("route.destinationRequired")}
              onSelect={(point) => onChange(setDestination(route, routePointFromNavPoint(point)))}
            />
          </li>
        </ol>
        <div className="pl-6">
          <Label htmlFor="route-add-point" className="sr-only">
            {t("route.addPoint")}
          </Label>
          <NavPointSearch
            id="route-add-point"
            addMode
            allowCoordinates
            placeholder={t("route.addPointShort")}
            near={near}
            onSelect={(point) => onChange(appendWaypoint(route, toRoutePoint(route, point)))}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">{t("route.mapHint")}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 border-t pt-4">
        <StripDot kind="alternate" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Label htmlFor="route-alternate" className="w-[5.25rem] shrink-0 whitespace-nowrap text-xs text-muted-foreground">
            <span aria-hidden="true">{t("route.alternateShort")}</span>
            <span className="sr-only">{t("route.alternate")}</span>
          </Label>
          <div className="flex min-w-0 flex-1 gap-1">
            <div className="min-w-0 flex-1">
              <NavPointSearch
                id="route-alternate"
                placeholder={t("route.chooseAlternate")}
                types={["AERODROME"]}
                value={route.alternate}
                near={route.destination ? { lat: route.destination.lat, lon: route.destination.lon } : near}
                onSelect={(point) => onChange(setAlternate(route, routePointFromNavPoint(point)))}
              />
            </div>
            {route.alternate && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label={t("route.removeAlternate")}
                title={t("route.removeAlternate")}
                onClick={() => onChange(setAlternate(route, null))}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface EndPointProps {
  id: string
  /** "Départ", "Arrivée": written above the field. */
  role: string
  /** Full name of the field, for assistive technologies. */
  label: string
  point: RoutePoint | null
  near: { lat: number; lon: number } | null
  missing: boolean
  error: string
  onSelect: (point: NavPoint) => void
}

function EndPoint({ id, role, label, point, near, missing, error, onSelect }: EndPointProps) {
  const { t } = useTranslation("navplan")
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="w-[5.25rem] shrink-0 whitespace-nowrap text-xs text-muted-foreground">
          <span aria-hidden="true">{role}</span>
          <span className="sr-only">{label}</span> <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <div className="min-w-0 flex-1">
          <NavPointSearch
            id={id}
            placeholder={t("route.chooseAerodrome")}
            types={["AERODROME"]}
            value={point}
            near={near}
            invalid={missing}
            describedBy={missing ? `${id}-error` : undefined}
            onSelect={onSelect}
          />
        </div>
      </div>
      {missing && (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

interface LegRowProps {
  index: number
  label: string
  leg: RouteDraft["legs"][number]
  computed?: Leg
  cruiseAltitude: number | null
  cruiseSettings: string[]
  normalSetting?: string | null
  showErrors: boolean
  onAltitude: (altitude: number) => void
  onWind: (wind: RouteDraft["legs"][number]["windOverride"]) => void
  onSetting: (setting: string | null) => void
}

function LegRow({ index, label, leg, computed, cruiseAltitude, cruiseSettings, normalSetting, showErrors, onAltitude, onWind, onSetting }: LegRowProps) {
  const { t } = useTranslation("navplan")
  const [altitudeText, setAltitudeText] = useState<number | null>(leg.altitudeFt)
  const invalid = showErrors && !validAltitude(altitudeText)
  const [opened, setOpened] = useState(false)
  // A leg with an error is opened, so the pilot sees the field to correct.
  const open = opened || invalid
  const suggestion = computed?.suggestedAltitudeFt
  const id = `leg-${index}`
  const wind = leg.windOverride
  const ownAltitude = cruiseAltitude !== null && leg.altitudeFt !== cruiseAltitude
  const custom = [
    ownAltitude ? formatFt(leg.altitudeFt) : null,
    leg.cruiseSetting ? leg.cruiseSetting : null,
    wind ? t("route.windTyped") : null,
  ].filter(Boolean)
  const figures = computed
    ? t("route.legFigures", { course: formatCourse(computed.magneticCourseDeg), distance: formatNm(computed.distanceNm), time: formatMinutes(computed.timeMin) })
    : t("route.legPending")

  return (
    <li className="pl-[6.25rem]">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
        aria-controls={`${id}-details`}
        onClick={() => setOpened((value) => !value)}
      >
        <span className="min-w-0 flex-1 truncate tabular-nums">
          <span className="sr-only">{t("route.legOf", { leg: label })} </span>
          <abbr title={t("log.long.magneticCourse")} className="no-underline">
            {t("log.columns.magneticCourse")}
          </abbr>{" "}
          {figures}
        </span>
        {custom.length > 0 && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{custom.join(" · ")}</span>}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-details`} className="mb-2 mt-1 space-y-3 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label htmlFor={`${id}-altitude`} className="text-xs">
              {t("route.legAltitude", { leg: label })}
            </Label>
            <NumberField
              id={`${id}-altitude`}
              value={leg.altitudeFt}
              digits={0}
              unit="ft"
              invalid={invalid}
              className="h-9"
              onValueChange={(value) => {
                setAltitudeText(value)
                if (validAltitude(value)) onAltitude(Math.round(value))
              }}
            />
            {invalid && <p className="text-sm text-destructive">{t("route.altitudeInvalid", { max: formatFt(MAX_ALTITUDE_FT) })}</p>}
            {suggestion && suggestion !== leg.altitudeFt && (
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {t("route.suggestion", { altitude: formatFt(suggestion) })}
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onAltitude(suggestion)}>
                  {t("route.useSuggestion")}
                </Button>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium" id={`${id}-wind-label`}>
              {t("route.windSource")}
            </span>
            <ToggleGroup
              type="single"
              size="sm"
              className="justify-start"
              value={wind ? "typed" : "forecast"}
              aria-labelledby={`${id}-wind-label`}
              onValueChange={(value) => {
                if (value === "typed" && !wind) onWind({ directionDeg: computed?.wind.directionDeg ?? 0, speedKt: computed?.wind.speedKt ?? 0 })
                if (value === "forecast" && wind) onWind(null)
              }}
            >
              <ToggleGroupItem value="forecast">{t("route.windForecast")}</ToggleGroupItem>
              <ToggleGroupItem value="typed">{t("route.windTyped")}</ToggleGroupItem>
            </ToggleGroup>
            {wind && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-wind-dir`} className="text-xs text-muted-foreground">
                    {t("route.windDirection")}
                  </Label>
                  <NumberField
                    id={`${id}-wind-dir`}
                    value={wind.directionDeg}
                    digits={0}
                    unit="°"
                    className="h-9"
                    onValueChange={(value) => value !== null && onWind({ ...wind, directionDeg: Math.round(((value % 360) + 360) % 360) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-wind-speed`} className="text-xs text-muted-foreground">
                    {t("route.windSpeed")}
                  </Label>
                  <NumberField
                    id={`${id}-wind-speed`}
                    value={wind.speedKt}
                    digits={0}
                    unit="kt"
                    className="h-9"
                    onValueChange={(value) => value !== null && value >= 0 && onWind({ ...wind, speedKt: Math.round(value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-wind-temp`} className="text-xs text-muted-foreground">
                    {t("route.temperature")}
                  </Label>
                  <NumberField
                    id={`${id}-wind-temp`}
                    value={wind.temperatureC ?? null}
                    digits={0}
                    unit="°C"
                    className="h-9"
                    onValueChange={(value) => onWind({ ...wind, temperatureC: value })}
                  />
                </div>
              </div>
            )}
          </div>

          {cruiseSettings.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor={`${id}-setting`} className="text-xs">
                {t("route.legSetting")}
              </Label>
              <Select value={leg.cruiseSetting ?? "__normal"} onValueChange={(value) => onSetting(value === "__normal" ? null : value)}>
                <SelectTrigger id={`${id}-setting`} className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__normal">{t("route.normalSetting", { setting: normalSetting ?? "—" })}</SelectItem>
                  {cruiseSettings.map((setting) => (
                    <SelectItem key={setting} value={setting}>
                      {setting}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

interface WaypointRowProps {
  point: RoutePoint
  index: number
  count: number
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  onRename: (name: string) => void
}

function WaypointRow({ point, index, count, onUp, onDown, onRemove, onRename }: WaypointRowProps) {
  const { t } = useTranslation("navplan")
  const isUser = point.type === "USER"
  return (
    <li className="flex items-start gap-3">
      <StripDot kind="point" />
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="w-[5.25rem] shrink-0 whitespace-nowrap pl-0 text-xs text-muted-foreground" aria-hidden="true">
          {isUser ? t("route.turningPointShort") : t(`pointType.${point.type}`)}
        </span>
        {isUser ? (
          <div className="min-w-0 flex-1">
            <Label htmlFor={`waypoint-${index}-name`} className="sr-only">
              {t("route.pointName", { position: index + 1 })}
            </Label>
            <Input
              key={`${point.ident}-${point.lat}-${point.lon}`}
              id={`waypoint-${index}-name`}
              defaultValue={point.ident}
              maxLength={24}
              className="h-9 font-medium"
              title={`${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`}
              onBlur={(event) => onRename(event.target.value)}
            />
          </div>
        ) : (
          <p className="min-w-0 flex-1 py-1.5 text-sm">
            <span className="font-semibold">{point.ident}</span>
            {point.name && point.name !== point.ident && <span className="block truncate text-xs text-muted-foreground">{point.name}</span>}
          </p>
        )}
        <div className="flex shrink-0 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={index === 0}
            aria-label={t("route.moveUp", { ident: point.ident })}
            title={t("route.moveUpShort")}
            onClick={onUp}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={index === count - 1}
            aria-label={t("route.moveDown", { ident: point.ident })}
            title={t("route.moveDownShort")}
            onClick={onDown}
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            aria-label={t("route.removePoint", { ident: point.ident })}
            title={t("route.removePointShort")}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  )
}
