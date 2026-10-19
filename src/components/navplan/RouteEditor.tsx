"use client"

import { Fragment, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { AerodromeSheetPopover } from "./AerodromeSheet"
import { pointLabel } from "@/lib/navplan/aerodrome"
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
  /** Fields written in the same row as the cruise altitude: before it (off-block time) and after it. */
  before?: ReactNode
  after?: ReactNode
  /** Shows the full sheet of an aerodrome (the log step). */
  onOpenAerodrome?: (icao: string) => void
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

// Chips of the strip: the aerodromes of the route stand out, turning points are plain.
const END_CHIP = "h-9 w-auto max-w-[16rem] rounded-full border-brand/60 bg-brand/10 px-3 hover:bg-brand/15"
const POINT_CHIP = "h-9 rounded-full px-3"

/**
 * The route as a strip of chips that wraps onto as many lines as it needs, never a scrolling box:
 * departure ▸ leg ▸ turning point ▸ … ▸ destination, then the alternate. A leg chip gives its
 * magnetic course, distance and time and opens on its own altitude, wind and power setting; a
 * point chip opens on its name, its place in the route and its removal.
 */
export function RouteEditor({ route, onChange, computedLegs = [], cruiseSettings = [], normalSetting, showErrors = false, before, after, onOpenAerodrome }: RouteEditorProps) {
  const { t } = useTranslation("navplan")
  const [cruiseAltitude, setCruiseAltitude] = useState<number | null>(usualAltitude(route))
  const near = route.departure ? { lat: route.departure.lat, lon: route.departure.lon } : null
  const departureMissing = showErrors && !route.departure
  const destinationMissing = showErrors && !route.destination
  const cruiseInvalid = cruiseAltitude !== null && !validAltitude(cruiseAltitude)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        {before}
        <div className="w-36 space-y-1">
          <Label htmlFor="route-cruise-altitude">{t("route.cruiseAltitude")}</Label>
          <NumberField
            id="route-cruise-altitude"
            value={cruiseAltitude}
            unit="ft"
            digits={0}
            invalid={cruiseInvalid}
            aria-describedby="route-cruise-altitude-hint"
            title={t("route.cruiseAltitudeHint")}
            onValueChange={(value) => {
              setCruiseAltitude(value)
              if (validAltitude(value)) onChange(setAllAltitudes(route, Math.round(value)))
            }}
          />
          <p id="route-cruise-altitude-hint" className={cn("text-xs", cruiseInvalid ? "text-destructive" : "text-muted-foreground")}>
            {cruiseInvalid ? t("route.altitudeInvalid", { max: formatFt(MAX_ALTITUDE_FT) }) : t("route.cruiseAltitudeShort")}
          </p>
        </div>
        {after}
      </div>

      <div className="space-y-2">
        <h3 className="sr-only">{t("route.legsTitle")}</h3>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={t("route.legsTitle")}>
          <li className="flex items-center">
            <Label htmlFor="route-departure" className="sr-only">
              {t("route.departure")}
            </Label>
            <NavPointSearch
              id="route-departure"
              prefix={t("route.departureShort")}
              placeholder={t("route.chooseShort")}
              types={["AERODROME"]}
              value={route.departure}
              near={near}
              invalid={departureMissing}
              describedBy={departureMissing ? "route-departure-error" : undefined}
              compact
              className={END_CHIP}
              onSelect={(point) => onChange(setDeparture(route, routePointFromNavPoint(point)))}
            />
            {route.departure && <AerodromeSheetPopover icao={route.departure.ident} role="departure" onOpenFull={onOpenAerodrome && (() => onOpenAerodrome(route.departure!.ident))} className="ml-0.5" />}
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
                <LegChip
                  index={legIndex}
                  label={`${from ? pointLabel(from) : "…"} → ${to ? pointLabel(to) : "…"}`}
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
                  <WaypointChip
                    point={waypoint}
                    index={legIndex}
                    count={route.waypoints.length}
                    onEarlier={() => onChange(reorderWaypoint(route, legIndex, legIndex - 1))}
                    onLater={() => onChange(reorderWaypoint(route, legIndex, legIndex + 1))}
                    onRemove={() => onChange(removeWaypoint(route, legIndex))}
                    onRename={(name) => onChange(renameWaypoint(route, legIndex, name))}
                    onOpenAerodrome={onOpenAerodrome}
                  />
                )}
              </Fragment>
            )
          })}
          <li className="flex items-center">
            <Label htmlFor="route-destination" className="sr-only">
              {t("route.destination")}
            </Label>
            <NavPointSearch
              id="route-destination"
              prefix={t("route.destinationShort")}
              placeholder={t("route.chooseShort")}
              types={["AERODROME"]}
              value={route.destination}
              near={near}
              invalid={destinationMissing}
              describedBy={destinationMissing ? "route-destination-error" : undefined}
              compact
              className={END_CHIP}
              onSelect={(point) => onChange(setDestination(route, routePointFromNavPoint(point)))}
            />
            {route.destination && (
              <AerodromeSheetPopover icao={route.destination.ident} role="destination" onOpenFull={onOpenAerodrome && (() => onOpenAerodrome(route.destination!.ident))} className="ml-0.5" />
            )}
          </li>
          <li className="ml-2">
            <Label htmlFor="route-add-point" className="sr-only">
              {t("route.addPoint")}
            </Label>
            <NavPointSearch
              id="route-add-point"
              addMode
              allowCoordinates
              compact
              placeholder={t("route.addPointShort")}
              near={near}
              className="h-9 w-auto rounded-full border-dashed px-3"
              onSelect={(point) => onChange(appendWaypoint(route, toRoutePoint(route, point)))}
            />
          </li>
          <li className="ml-2 flex items-center">
            <Label htmlFor="route-alternate" className="sr-only">
              {t("route.alternate")}
            </Label>
            <NavPointSearch
              id="route-alternate"
              prefix={t("route.alternateShort")}
              placeholder={t("route.chooseAlternate")}
              types={["AERODROME"]}
              value={route.alternate}
              near={route.destination ? { lat: route.destination.lat, lon: route.destination.lon } : near}
              compact
              className={cn("h-9 w-auto max-w-[16rem] rounded-full border-dashed px-3", route.alternate && "rounded-r-none border-r-0")}
              onSelect={(point) => onChange(setAlternate(route, routePointFromNavPoint(point)))}
            />
            {route.alternate && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-l-none rounded-r-full border-dashed"
                aria-label={t("route.removeAlternate")}
                title={t("route.removeAlternate")}
                onClick={() => onChange(setAlternate(route, null))}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {route.alternate && (
              <AerodromeSheetPopover icao={route.alternate.ident} role="alternate" onOpenFull={onOpenAerodrome && (() => onOpenAerodrome(route.alternate!.ident))} className="ml-0.5" />
            )}
          </li>
        </ol>
        {departureMissing && (
          <p id="route-departure-error" className="text-sm text-destructive">
            {t("route.departureRequired")}
          </p>
        )}
        {destinationMissing && (
          <p id="route-destination-error" className="text-sm text-destructive">
            {t("route.destinationRequired")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("route.mapHint")}</p>
      </div>
    </div>
  )
}

interface LegChipProps {
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

function LegChip({ index, label, leg, computed, cruiseAltitude, cruiseSettings, normalSetting, showErrors, onAltitude, onWind, onSetting }: LegChipProps) {
  const { t } = useTranslation("navplan")
  const [altitudeText, setAltitudeText] = useState<number | null>(leg.altitudeFt)
  const invalid = showErrors && !validAltitude(altitudeText)
  const suggestion = computed?.suggestedAltitudeFt
  const id = `leg-${index}`
  const wind = leg.windOverride
  const ownAltitude = cruiseAltitude !== null && leg.altitudeFt !== cruiseAltitude
  const custom = [ownAltitude ? formatFt(leg.altitudeFt) : null, leg.cruiseSetting ? leg.cruiseSetting : null, wind ? t("route.windTyped") : null].filter(Boolean)
  const figures = computed
    ? t("route.legFigures", { course: formatCourse(computed.magneticCourseDeg), distance: formatNm(computed.distanceNm), time: formatMinutes(computed.timeMin) })
    : t("route.legPending")

  return (
    <li className="flex items-center">
      <ChevronRight className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs tabular-nums text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              invalid && "text-destructive ring-1 ring-destructive",
            )}
          >
            <span className="sr-only">{t("route.legOf", { leg: label })} </span>
            <abbr title={t("log.long.magneticCourse")} className="no-underline">
              {t("log.columns.magneticCourse")}
            </abbr>{" "}
            <span>{figures}</span>
            {custom.length > 0 && <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{custom.join(" · ")}</span>}
            {invalid && <span className="sr-only">{t("route.altitudeInvalid", { max: formatFt(MAX_ALTITUDE_FT) })}</span>}
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3" align="start" aria-label={t("route.legTitle", { leg: label })}>
          <p className="text-sm font-semibold">{t("route.legTitle", { leg: label })}</p>
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
        </PopoverContent>
      </Popover>
      <ChevronRight className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
    </li>
  )
}

interface WaypointChipProps {
  point: RoutePoint
  index: number
  count: number
  onEarlier: () => void
  onLater: () => void
  onRemove: () => void
  onRename: (name: string) => void
  onOpenAerodrome?: (icao: string) => void
}

function WaypointChip({ point, index, count, onEarlier, onLater, onRemove, onRename, onOpenAerodrome }: WaypointChipProps) {
  const { t } = useTranslation("navplan")
  const isUser = point.type === "USER"
  const [name, setName] = useState(point.ident)
  const commit = () => {
    if (name.trim() && name.trim() !== point.ident) onRename(name)
  }
  return (
    <li>
      <Popover
        onOpenChange={(open) => {
          // Opened: start from the current name. Closed: keep what was typed.
          if (open) setName(point.ident)
          else commit()
        }}
      >
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={POINT_CHIP} title={`${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`}>
            <span className="sr-only">{t("route.pointChip", { position: index + 1 })} </span>
            <span className="font-semibold">{pointLabel(point)}</span>
            {!isUser && <span className="text-xs text-muted-foreground">{t(`pointType.${point.type}`)}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 space-y-3" align="start" aria-label={`${t("route.pointChip", { position: index + 1 })} ${point.ident}`}>
          {isUser ? (
            <div className="space-y-1">
              <Label htmlFor={`waypoint-${index}-name`} className="text-xs">
                {t("route.pointName", { position: index + 1 })}
              </Label>
              <Input
                id={`waypoint-${index}-name`}
                value={name}
                maxLength={24}
                className="h-9 font-medium"
                onChange={(event) => setName(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commit()
                }}
              />
            </div>
          ) : (
            <p className="text-sm">
              <span className="font-semibold">{pointLabel(point)}</span>
              <span className="ml-2 text-xs text-muted-foreground">{t(`pointType.${point.type}`)}</span>
              {point.name && point.name !== point.ident && <span className="block text-xs text-muted-foreground">{point.name}</span>}
            </p>
          )}
          {point.type === "AERODROME" && (
            <AerodromeSheetPopover icao={point.ident} role="enroute" onOpenFull={onOpenAerodrome && (() => onOpenAerodrome(point.ident))}>
              <Button type="button" variant="outline" size="sm" className="w-full">
                {t("aerodrome.openSheet")}
              </Button>
            </AerodromeSheetPopover>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={t("route.moveUp", { ident: point.ident })} onClick={onEarlier}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t("route.moveUpShort")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={index === count - 1} aria-label={t("route.moveDown", { ident: point.ident })} onClick={onLater}>
              {t("route.moveDownShort")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" aria-label={t("route.removePoint", { ident: point.ident })} onClick={onRemove}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            {t("route.removePointShort")}
          </Button>
        </PopoverContent>
      </Popover>
    </li>
  )
}
