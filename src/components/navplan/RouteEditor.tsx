"use client"

import { Fragment, useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowDown, ArrowUp, Plane, Trash2, Wind, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { formatFt } from "@/lib/navplan/units"
import { cn } from "@/lib/utils"
import { NavPointSearch } from "./NavPointSearch"
import { NumberField } from "./NumberField"

interface RouteEditorProps {
  route: RouteDraft
  onChange: (route: RouteDraft) => void
  /** Legs of the last computation, for the suggested altitudes. */
  computedLegs?: Leg[]
  /** Settings of the cruise table of the aircraft ("2400 tr/min", "65 %"). */
  cruiseSettings?: string[]
  normalSetting?: string | null
  showErrors?: boolean
}

const toRoutePoint = (route: RouteDraft, point: NavPoint): RoutePoint =>
  point.type === "USER" ? userPoint(route, point.lat, point.lon, point.ident || undefined) : routePointFromNavPoint(point)

function PointLabel({ point }: { point: RoutePoint }) {
  const { t } = useTranslation("navplan")
  return (
    <span className="min-w-0">
      <span className="font-medium">{point.ident}</span>
      <span className="ml-2 text-xs text-muted-foreground">{t(`pointType.${point.type}`)}</span>
      {point.name && point.name !== point.ident && <span className="block truncate text-xs text-muted-foreground">{point.name}</span>}
    </span>
  )
}

/** Departure, points, destination and alternate, with the altitude (and wind if typed) of each leg. */
export function RouteEditor({ route, onChange, computedLegs = [], cruiseSettings = [], normalSetting, showErrors = false }: RouteEditorProps) {
  const { t } = useTranslation("navplan")
  const [cruiseAltitude, setCruiseAltitude] = useState<number | null>(route.legs[0]?.altitudeFt ?? null)
  const near = route.departure ? { lat: route.departure.lat, lon: route.departure.lon } : null
  const departureMissing = showErrors && !route.departure
  const destinationMissing = showErrors && !route.destination

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="route-departure">
            {t("route.departure")} <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <NavPointSearch
            id="route-departure"
            placeholder={t("route.chooseAerodrome")}
            types={["AERODROME"]}
            value={route.departure}
            near={near}
            invalid={departureMissing}
            describedBy={departureMissing ? "route-departure-error" : undefined}
            onSelect={(point) => onChange(setDeparture(route, routePointFromNavPoint(point)))}
          />
          {departureMissing && (
            <p id="route-departure-error" className="text-sm text-destructive">
              {t("route.departureRequired")}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="route-destination">
            {t("route.destination")} <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <NavPointSearch
            id="route-destination"
            placeholder={t("route.chooseAerodrome")}
            types={["AERODROME"]}
            value={route.destination}
            near={near}
            invalid={destinationMissing}
            describedBy={destinationMissing ? "route-destination-error" : undefined}
            onSelect={(point) => onChange(setDestination(route, routePointFromNavPoint(point)))}
          />
          {destinationMissing && (
            <p id="route-destination-error" className="text-sm text-destructive">
              {t("route.destinationRequired")}
            </p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="route-alternate">{t("route.alternate")}</Label>
          <div className="flex gap-2">
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
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="route-cruise-altitude">{t("route.cruiseAltitude")}</Label>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[8rem] flex-1">
              <NumberField
                id="route-cruise-altitude"
                value={cruiseAltitude}
                onValueChange={setCruiseAltitude}
                unit="ft"
                digits={0}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={cruiseAltitude === null || cruiseAltitude < 0 || cruiseAltitude > MAX_ALTITUDE_FT}
              onClick={() => cruiseAltitude !== null && onChange(setAllAltitudes(route, Math.round(cruiseAltitude)))}
            >
              {t("route.applyToAllLegs")}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("route.legsTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("route.mapHint")}</p>
        <ol className="space-y-2" aria-label={t("route.legsTitle")}>
          <li className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {route.departure ? <PointLabel point={route.departure} /> : <span className="text-muted-foreground">{t("route.departure")}</span>}
          </li>
          {route.legs.map((leg, legIndex) => {
            const waypoint = route.waypoints[legIndex]
            const from = legIndex === 0 ? route.departure : route.waypoints[legIndex - 1]
            const to = waypoint ?? route.destination
            return (
              <Fragment key={`leg-${legIndex}`}>
                <LegRow
                  index={legIndex}
                  label={`${from?.ident ?? "…"} → ${to?.ident ?? "…"}`}
                  leg={leg}
                  computed={computedLegs[legIndex]}
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
          <li className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <Plane className="h-4 w-4 shrink-0 rotate-90 text-muted-foreground" aria-hidden="true" />
            {route.destination ? <PointLabel point={route.destination} /> : <span className="text-muted-foreground">{t("route.destination")}</span>}
          </li>
        </ol>
        <div className="space-y-1 pt-1">
          <Label htmlFor="route-add-point" className="sr-only">
            {t("route.addPoint")}
          </Label>
          <NavPointSearch
            id="route-add-point"
            addMode
            allowCoordinates
            placeholder={t("route.addPoint")}
            near={near}
            onSelect={(point) => onChange(appendWaypoint(route, toRoutePoint(route, point)))}
          />
        </div>
      </div>
    </div>
  )
}

interface LegRowProps {
  index: number
  label: string
  leg: RouteDraft["legs"][number]
  computed?: Leg
  cruiseSettings: string[]
  normalSetting?: string | null
  showErrors: boolean
  onAltitude: (altitude: number) => void
  onWind: (wind: RouteDraft["legs"][number]["windOverride"]) => void
  onSetting: (setting: string | null) => void
}

function LegRow({ index, label, leg, computed, cruiseSettings, normalSetting, showErrors, onAltitude, onWind, onSetting }: LegRowProps) {
  const { t } = useTranslation("navplan")
  const [altitudeText, setAltitudeText] = useState<number | null>(leg.altitudeFt)
  const invalid = showErrors && (altitudeText === null || altitudeText < 0 || altitudeText > MAX_ALTITUDE_FT)
  const suggestion = computed?.suggestedAltitudeFt
  const id = `leg-${index}`
  const wind = leg.windOverride

  return (
    <li className="ml-3 space-y-2 border-l-2 border-dashed border-border py-1 pl-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[9rem] flex-1 space-y-1">
          <Label htmlFor={`${id}-altitude`} className="text-xs text-muted-foreground">
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
              if (value !== null && value >= 0 && value <= MAX_ALTITUDE_FT) onAltitude(Math.round(value))
            }}
          />
        </div>
        {cruiseSettings.length > 1 && (
          <div className="min-w-[9rem] flex-1 space-y-1">
            <Label htmlFor={`${id}-setting`} className="text-xs text-muted-foreground">
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
        <div className="flex items-center gap-2 pb-2">
          <Switch
            id={`${id}-wind`}
            checked={Boolean(wind)}
            onCheckedChange={(checked) => onWind(checked ? { directionDeg: computed?.wind.directionDeg ?? 0, speedKt: computed?.wind.speedKt ?? 0 } : null)}
          />
          <Label htmlFor={`${id}-wind`} className="flex items-center gap-1 text-xs">
            <Wind className="h-3.5 w-3.5" aria-hidden="true" />
            {t("route.windOverride")}
          </Label>
        </div>
      </div>
      {invalid && <p className="text-sm text-destructive">{t("route.altitudeInvalid", { max: formatFt(MAX_ALTITUDE_FT) })}</p>}
      {suggestion && suggestion !== leg.altitudeFt && (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {t("route.suggestion", { altitude: formatFt(suggestion) })}
          <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onAltitude(suggestion)}>
            {t("route.useSuggestion")}
          </Button>
        </p>
      )}
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
    <li className={cn("flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm")}>
      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
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
            className="h-8"
            onBlur={(event) => onRename(event.target.value)}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {t("pointType.USER")} · {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
          </span>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <PointLabel point={point} />
        </div>
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
    </li>
  )
}
