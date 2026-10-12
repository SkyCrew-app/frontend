"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MapPin, Radio, ArrowUp, Cloud, Sun, Sunrise, Sunset, Wind, Ruler, Compass, Plane, Eye, Gauge } from "lucide-react"
import type { Weather } from "@/interfaces/weather"

interface AirportInfoProps {
  airportInfo: any
  type: "departure" | "arrival"
  weather?: Weather
}

export function AirportInfo({ airportInfo, type, weather }: AirportInfoProps) {
  const bgColor = type === "departure" ? "bg-success/10" : "bg-destructive/10"
  const textColor = type === "departure" ? "text-success" : "text-destructive"
  const borderColor =
    type === "departure" ? "border-success/30" : "border-destructive/30"

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A"
    try {
      return new Date(timeString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return "N/A"
    }
  }

  const fltcatColor = (cat: string | null | undefined) => {
    switch (cat) {
      case "VFR":
        return "bg-success/15 text-success"
      case "MVFR":
        return "bg-info/15 text-info"
      case "IFR":
        return "bg-destructive/15 text-destructive"
      case "LIFR":
        return "bg-primary/15 text-primary"
      default:
        return "bg-muted text-foreground"
    }
  }

  return (
    <Card className={`border ${borderColor}`}>
      <CardHeader className={`${bgColor}`}>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className={`h-6 w-6 ${textColor}`} />
          <span>{type === "departure" ? "Aéroport de départ" : "Aéroport d'arrivée"}</span>
          <Badge variant="outline" className={`ml-auto ${textColor} border-current`}>
            {airportInfo.ICAO}
          </Badge>
          {airportInfo.iata && (
            <Badge variant="secondary" className="text-xs">
              {airportInfo.iata}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col space-y-2">
          <h3 className="text-lg font-semibold">{airportInfo.name || "Aéroport"}</h3>
          {airportInfo.city && airportInfo.country && (
            <p className="text-muted-foreground">
              {airportInfo.city}, {airportInfo.country}
            </p>
          )}
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Général</TabsTrigger>
            <TabsTrigger value="runways">Pistes</TabsTrigger>
            <TabsTrigger value="frequencies">Fréquences</TabsTrigger>
            <TabsTrigger value="weather">Météo</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <ArrowUp className="h-5 w-5 text-info" />
                  <p>
                    <strong>Élévation:</strong> {airportInfo.elevation ?? "N/A"} ft
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Plane className="h-5 w-5 text-info" />
                  <p>
                    <strong>Type:</strong>{" "}
                    {airportInfo.type === "large_airport"
                      ? "Grand aéroport"
                      : airportInfo.type === "medium_airport"
                        ? "Aéroport moyen"
                        : "Petit aéroport"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-5 w-5 text-info" />
                  <p>
                    <strong>Fuseau horaire:</strong> {airportInfo.timezone?.name || "N/A"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sunrise className="h-5 w-5 text-info" />
                  <p>
                    <strong>Lever du soleil:</strong> {formatTime(airportInfo.times?.sunrise)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sunset className="h-5 w-5 text-info" />
                  <p>
                    <strong>Coucher du soleil:</strong> {formatTime(airportInfo.times?.sunset)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Compass className="h-5 w-5 text-info" />
                  <p>
                    <strong>Coordonnées:</strong> {airportInfo.lat?.toFixed(4) || "N/A"}° N,{" "}
                    {airportInfo.lon?.toFixed(4) || "N/A"}° E
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="runways">
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              {airportInfo.runways && airportInfo.runways.length > 0 ? (
                <ul className="space-y-3">
                  {airportInfo.runways.map((runway: any, index: number) => (
                    <li key={index} className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <Badge variant="outline" className="font-bold">
                          {runway.ident}
                        </Badge>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{runway.surface || "N/A"}</Badge>
                          {runway.lighted && (
                            <Badge variant="default" className="bg-warning text-warning-foreground text-xs">
                              Éclairée
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <Ruler className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>Longueur: {runway.length} m</span>
                        </div>
                        <div className="flex items-center">
                          <Ruler className="h-4 w-4 mr-1 text-muted-foreground rotate-90" />
                          <span>Largeur: {runway.width} m</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucune information de piste disponible</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="frequencies">
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              {airportInfo.frequencies && airportInfo.frequencies.length > 0 ? (
                <ul className="space-y-2">
                  {airportInfo.frequencies.map((freq: any, index: number) => (
                    <li key={index} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                      <Radio className="h-4 w-4 text-info" />
                      <div className="flex justify-between w-full">
                        <p className="font-medium">{freq.name || "Fréquence"}</p>
                        <p className="text-sm font-mono text-muted-foreground">
                          {(freq.frequency / 1000000).toFixed(3)} MHz
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucune information de fréquence disponible</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="weather">
            <ScrollArea className="h-64 w-full rounded-md border p-4">
              <div className="space-y-4">
                {/* Flight category badge */}
                {airportInfo.weather?.fltcat && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Catégorie de vol:</span>
                    <Badge className={fltcatColor(airportInfo.weather.fltcat)}>
                      {airportInfo.weather.fltcat}
                    </Badge>
                  </div>
                )}

                {/* METAR data from aviation weather API */}
                {airportInfo.weather?.METAR ? (
                  <div className="bg-muted p-4 rounded-md space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Cloud className="h-5 w-5 text-info" />
                      <p className="font-semibold">Données METAR</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {airportInfo.weather.temp != null && (
                        <div className="flex items-center space-x-2">
                          <Sun className="h-4 w-4 text-warning" />
                          <p>
                            <strong>Temp:</strong> {airportInfo.weather.temp}°C
                          </p>
                        </div>
                      )}
                      {airportInfo.weather.dewp != null && (
                        <div className="flex items-center space-x-2">
                          <Cloud className="h-4 w-4 text-info" />
                          <p>
                            <strong>Rosée:</strong> {airportInfo.weather.dewp}°C
                          </p>
                        </div>
                      )}
                      {airportInfo.weather.wspd != null && (
                        <div className="flex items-center space-x-2">
                          <Wind className="h-4 w-4 text-info" />
                          <p>
                            <strong>Vent:</strong> {airportInfo.weather.wspd} kt
                            {airportInfo.weather.wgst ? ` (raf ${airportInfo.weather.wgst} kt)` : ""}
                          </p>
                        </div>
                      )}
                      {airportInfo.weather.wdir != null && (
                        <div className="flex items-center space-x-2">
                          <Compass className="h-4 w-4 text-info" />
                          <p>
                            <strong>Direction:</strong>{" "}
                            {typeof airportInfo.weather.wdir === "number"
                              ? `${airportInfo.weather.wdir}°`
                              : airportInfo.weather.wdir}
                          </p>
                        </div>
                      )}
                      {airportInfo.weather.visib != null && (
                        <div className="flex items-center space-x-2">
                          <Eye className="h-4 w-4 text-info" />
                          <p>
                            <strong>Visibilité:</strong> {airportInfo.weather.visib} SM
                          </p>
                        </div>
                      )}
                      {airportInfo.weather.altim != null && (
                        <div className="flex items-center space-x-2">
                          <Gauge className="h-4 w-4 text-info" />
                          <p>
                            <strong>QNH:</strong> {airportInfo.weather.altim} hPa
                          </p>
                        </div>
                      )}
                    </div>

                    {airportInfo.weather.clouds?.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-sm mb-1">Couches nuageuses:</p>
                        <div className="flex flex-wrap gap-1">
                          {airportInfo.weather.clouds.map((c: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {c.cover} {c.base != null ? `${c.base} ft` : ""}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : weather ? (
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex items-center space-x-2 mb-3">
                      <Cloud className="h-5 w-5 text-info" />
                      <p className="font-semibold">Conditions actuelles</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Sun className="h-4 w-4 text-warning" />
                        <p>
                          <strong>Température:</strong> {weather.temperature.toFixed(1)}°C
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Cloud className="h-4 w-4 text-info" />
                        <p>
                          <strong>Conditions:</strong> {weather.conditions}
                        </p>
                      </div>
                      {weather.wind && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Wind className="h-4 w-4 text-info" />
                            <p>
                              <strong>Vent:</strong> {weather.wind.speed} kt
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Compass className="h-4 w-4 text-info" />
                            <p>
                              <strong>Direction:</strong> {weather.wind.direction}°
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Aucune information météo disponible</p>
                )}

                {/* Raw METAR */}
                <div>
                  <p className="font-semibold mb-2">METAR brut:</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded overflow-x-auto">
                    {airportInfo.weather?.METAR || "Non disponible"}
                  </p>
                </div>

                {/* TAF */}
                <div>
                  <p className="font-semibold mb-2">TAF:</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded overflow-x-auto">
                    {airportInfo.weather?.TAF || "Non disponible"}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
