"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDecimal, formatTime } from "@/lib/format"
import type { Weather } from "@/interfaces/weather"

interface AirportInfoProps {
  airportInfo: any
  type: "departure" | "arrival"
  weather?: Weather
}

type BadgeVariant = "success" | "info" | "warning" | "danger" | "neutral"

// Standard colours of the METAR flight categories.
const FLIGHT_CONDITIONS: Record<string, BadgeVariant> = {
  VFR: "success",
  MVFR: "info",
  IFR: "danger",
  LIFR: "warning",
}

// Airport types known to the app; their labels are in flights:airportInfo.types.
const AIRPORT_TYPES = ["large_airport", "medium_airport", "small_airport", "heliport", "seaplane_base", "closed"]

const coordinate = (value: unknown, positive: string, negative: string) => {
  const number = typeof value === "string" ? Number.parseFloat(value) : (value as number)
  if (typeof number !== "number" || Number.isNaN(number)) return "—"
  return `${Math.abs(number).toFixed(4)}° ${number >= 0 ? positive : negative}`
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  )
}

const EmptyLine = ({ children }: { children: ReactNode }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
)

export function AirportInfo({ airportInfo, type, weather }: AirportInfoProps) {
  const { t } = useTranslation("flights")
  const metar = airportInfo.weather
  const location = [airportInfo.city, airportInfo.country].filter(Boolean).join(", ")

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardDescription>{type === "departure" ? t("airportInfo.departure") : t("airportInfo.arrival")}</CardDescription>
            <CardTitle className="mt-1 truncate text-base">{airportInfo.name || airportInfo.ICAO}</CardTitle>
            {location && <p className="mt-0.5 text-sm text-muted-foreground">{location}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{airportInfo.ICAO}</Badge>
            {airportInfo.iata && <Badge variant="neutral">{airportInfo.iata}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              {t("airportInfo.tabs.general")}
            </TabsTrigger>
            <TabsTrigger value="runways" className="flex-1">
              {t("airportInfo.tabs.runways")}
            </TabsTrigger>
            <TabsTrigger value="frequencies" className="flex-1">
              {t("airportInfo.tabs.frequencies")}
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex-1">
              {t("airportInfo.tabs.weather")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label={t("airportInfo.general.elevation")}>
                {airportInfo.elevation != null ? `${airportInfo.elevation} ft` : "—"}
              </Fact>
              <Fact label={t("common:labels.type")}>
                {AIRPORT_TYPES.includes(airportInfo.type) ? t(`airportInfo.types.${airportInfo.type}`) : "—"}
              </Fact>
              <Fact label={t("airportInfo.general.sunrise")}>{formatTime(airportInfo.times?.sunrise)}</Fact>
              <Fact label={t("airportInfo.general.sunset")}>{formatTime(airportInfo.times?.sunset)}</Fact>
              <Fact label={t("airportInfo.general.timezone")}>{airportInfo.timezone?.name || "—"}</Fact>
              <Fact label={t("airportInfo.general.coordinates")}>
                <span className="tabular-nums">
                  {coordinate(airportInfo.lat, t("airportInfo.cardinal.north"), t("airportInfo.cardinal.south"))},{" "}
                  {coordinate(airportInfo.lon, t("airportInfo.cardinal.east"), t("airportInfo.cardinal.west"))}
                </span>
              </Fact>
            </dl>
          </TabsContent>

          <TabsContent value="runways" className="mt-4">
            {airportInfo.runways && airportInfo.runways.length > 0 ? (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {airportInfo.runways.map((runway: any, index: number) => (
                  <li key={index} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-semibold">{t("airportInfo.runways.name", { ident: runway.ident })}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {runway.length ?? "—"} m × {runway.width ?? "—"} m
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {runway.surface && <Badge variant="neutral">{runway.surface}</Badge>}
                      {runway.lighted && <Badge variant="info">{t("airportInfo.runways.lighted")}</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>{t("airportInfo.runways.empty")}</EmptyLine>
            )}
          </TabsContent>

          <TabsContent value="frequencies" className="mt-4">
            {airportInfo.frequencies && airportInfo.frequencies.length > 0 ? (
              <ul className="max-h-72 divide-y overflow-y-auto">
                {airportInfo.frequencies.map((freq: any, index: number) => (
                  <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{freq.name || t("airportInfo.frequencies.fallbackName")}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {(freq.frequency / 1000000).toFixed(3)} MHz
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>{t("airportInfo.frequencies.empty")}</EmptyLine>
            )}
          </TabsContent>

          <TabsContent value="weather" className="mt-4 space-y-4">
            {metar?.METAR ? (
              <dl className="grid grid-cols-2 gap-4">
                {metar.fltcat && (
                  <Fact label={t("airportInfo.weather.flightConditions")}>
                    <Badge variant={FLIGHT_CONDITIONS[metar.fltcat] ?? "neutral"}>{metar.fltcat}</Badge>
                  </Fact>
                )}
                {metar.temp != null && <Fact label={t("airportInfo.weather.temperature")}>{metar.temp} °C</Fact>}
                {metar.dewp != null && <Fact label={t("airportInfo.weather.dewPoint")}>{metar.dewp} °C</Fact>}
                {metar.wspd != null && (
                  <Fact label={t("airportInfo.weather.wind")}>
                    {metar.wdir != null && `${typeof metar.wdir === "number" ? `${metar.wdir}°` : metar.wdir} / `}
                    {metar.wspd} kt
                    {metar.wgst ? ` ${t("airportInfo.weather.gusts", { speed: metar.wgst })}` : ""}
                  </Fact>
                )}
                {metar.visib != null && <Fact label={t("airportInfo.weather.visibility")}>{metar.visib} SM</Fact>}
                {metar.altim != null && <Fact label="QNH">{metar.altim} hPa</Fact>}
                {metar.clouds?.length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">{t("airportInfo.weather.cloudLayers")}</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {metar.clouds.map((c: any, i: number) => (
                        <Badge key={i} variant="outline">
                          {c.cover} {c.base != null ? `${c.base} ft` : ""}
                        </Badge>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            ) : weather ? (
              <dl className="grid grid-cols-2 gap-4">
                <Fact label={t("airportInfo.weather.temperature")}>{formatDecimal(weather.temperature)} °C</Fact>
                <Fact label={t("airportInfo.weather.conditions")}>{weather.conditions}</Fact>
                {weather.wind && (
                  <Fact label={t("airportInfo.weather.wind")}>
                    {weather.wind.direction}° / {weather.wind.speed} m/s
                  </Fact>
                )}
                {weather.pressure != null && <Fact label={t("airportInfo.weather.pressure")}>{weather.pressure} hPa</Fact>}
              </dl>
            ) : (
              <EmptyLine>{t("airportInfo.weather.empty")}</EmptyLine>
            )}

            {metar?.METAR && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">METAR</p>
                <p className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">{metar.METAR}</p>
              </div>
            )}
            {metar?.TAF && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">TAF</p>
                <p className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">{metar.TAF}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
