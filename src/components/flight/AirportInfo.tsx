"use client"

import type { ReactNode } from "react"
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

const AIRPORT_TYPES: Record<string, string> = {
  large_airport: "Grand aéroport",
  medium_airport: "Aéroport moyen",
  small_airport: "Petit aérodrome",
  heliport: "Héliport",
  seaplane_base: "Hydrobase",
  closed: "Fermé",
}

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
  const metar = airportInfo.weather
  const location = [airportInfo.city, airportInfo.country].filter(Boolean).join(", ")

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardDescription>{type === "departure" ? "Aérodrome de départ" : "Aérodrome d'arrivée"}</CardDescription>
            <CardTitle className="mt-1 truncate text-base">{airportInfo.name || airportInfo.ICAO}</CardTitle>
            {location && <p className="mt-0.5 text-sm text-muted-foreground">{location}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge variant="outline">{airportInfo.ICAO}</Badge>
            {airportInfo.iata && <Badge variant="neutral">{airportInfo.iata}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">
              Général
            </TabsTrigger>
            <TabsTrigger value="runways" className="flex-1">
              Pistes
            </TabsTrigger>
            <TabsTrigger value="frequencies" className="flex-1">
              Fréquences
            </TabsTrigger>
            <TabsTrigger value="weather" className="flex-1">
              Météo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <dl className="grid grid-cols-2 gap-4">
              <Fact label="Altitude du terrain">
                {airportInfo.elevation != null ? `${airportInfo.elevation} ft` : "—"}
              </Fact>
              <Fact label="Type">{AIRPORT_TYPES[airportInfo.type] ?? "—"}</Fact>
              <Fact label="Lever du soleil">{formatTime(airportInfo.times?.sunrise)}</Fact>
              <Fact label="Coucher du soleil">{formatTime(airportInfo.times?.sunset)}</Fact>
              <Fact label="Fuseau horaire">{airportInfo.timezone?.name || "—"}</Fact>
              <Fact label="Coordonnées">
                <span className="tabular-nums">
                  {coordinate(airportInfo.lat, "N", "S")}, {coordinate(airportInfo.lon, "E", "O")}
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
                      <p className="text-sm font-semibold">Piste {runway.ident}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {runway.length ?? "—"} m × {runway.width ?? "—"} m
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {runway.surface && <Badge variant="neutral">{runway.surface}</Badge>}
                      {runway.lighted && <Badge variant="info">Éclairée</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>Aucune information de piste disponible</EmptyLine>
            )}
          </TabsContent>

          <TabsContent value="frequencies" className="mt-4">
            {airportInfo.frequencies && airportInfo.frequencies.length > 0 ? (
              <ul className="max-h-72 divide-y overflow-y-auto">
                {airportInfo.frequencies.map((freq: any, index: number) => (
                  <li key={index} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-medium">{freq.name || "Fréquence"}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {(freq.frequency / 1000000).toFixed(3)} MHz
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyLine>Aucune fréquence disponible</EmptyLine>
            )}
          </TabsContent>

          <TabsContent value="weather" className="mt-4 space-y-4">
            {metar?.METAR ? (
              <dl className="grid grid-cols-2 gap-4">
                {metar.fltcat && (
                  <Fact label="Conditions de vol">
                    <Badge variant={FLIGHT_CONDITIONS[metar.fltcat] ?? "neutral"}>{metar.fltcat}</Badge>
                  </Fact>
                )}
                {metar.temp != null && <Fact label="Température">{metar.temp} °C</Fact>}
                {metar.dewp != null && <Fact label="Point de rosée">{metar.dewp} °C</Fact>}
                {metar.wspd != null && (
                  <Fact label="Vent">
                    {metar.wdir != null && `${typeof metar.wdir === "number" ? `${metar.wdir}°` : metar.wdir} / `}
                    {metar.wspd} kt
                    {metar.wgst ? ` (rafales ${metar.wgst} kt)` : ""}
                  </Fact>
                )}
                {metar.visib != null && <Fact label="Visibilité">{metar.visib} SM</Fact>}
                {metar.altim != null && <Fact label="QNH">{metar.altim} hPa</Fact>}
                {metar.clouds?.length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">Couches nuageuses</dt>
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
                <Fact label="Température">{formatDecimal(weather.temperature)} °C</Fact>
                <Fact label="Conditions">{weather.conditions}</Fact>
                {weather.wind && (
                  <Fact label="Vent">
                    {weather.wind.direction}° / {weather.wind.speed} m/s
                  </Fact>
                )}
                {weather.pressure != null && <Fact label="Pression">{weather.pressure} hPa</Fact>}
              </dl>
            ) : (
              <EmptyLine>Aucune information météo disponible</EmptyLine>
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
