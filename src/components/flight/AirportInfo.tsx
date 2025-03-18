"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MapPin, Radio, ArrowUp, Cloud, Sun, Sunrise, Sunset, Wind, Ruler, Compass } from "lucide-react"
import type { Weather } from "@/interfaces/weather"

interface AirportInfoProps {
  airportInfo: any
  type: "departure" | "arrival"
  weather?: Weather
}

export function AirportInfo({ airportInfo, type, weather }: AirportInfoProps) {
  const bgColor = type === "departure" ? "bg-green-50 dark:bg-green-900/30" : "bg-red-50 dark:bg-red-900/30"
  const textColor = type === "departure" ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
  const borderColor =
    type === "departure" ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A"
    try {
      return new Date(timeString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (e) {
      return "N/A"
    }
  }

  return (
    <Card className={`border ${borderColor}`}>
      <CardHeader className={`${bgColor}`}>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className={`h-6 w-6 ${textColor}`} />
          <span>{type === "departure" ? "Aéroport de Départ" : "Aéroport d'Arrivée"}</span>
          <Badge variant="outline" className={`ml-auto ${textColor} border-current`}>
            {airportInfo.ICAO}
          </Badge>
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
                  <ArrowUp className="h-5 w-5 text-blue-500" />
                  <p>
                    <strong>Élévation:</strong> {airportInfo.elevation?.toFixed(2) || "N/A"} ft
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-5 w-5 text-blue-500" />
                  <p>
                    <strong>Fuseau horaire:</strong> {airportInfo.timezone?.name || "N/A"}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sunrise className="h-5 w-5 text-blue-500" />
                  <p>
                    <strong>Lever du soleil:</strong> {formatTime(airportInfo.times?.sunrise)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sunset className="h-5 w-5 text-blue-500" />
                  <p>
                    <strong>Coucher du soleil:</strong> {formatTime(airportInfo.times?.sunset)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Compass className="h-5 w-5 text-blue-500" />
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
                        <Badge variant="secondary">{runway.surface || "N/A"}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center">
                          <Ruler className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span>Longueur: {(runway.length / 1000).toFixed(2)} km</span>
                        </div>
                        <div className="flex items-center">
                          <Ruler className="h-4 w-4 mr-1 text-muted-foreground rotate-90" />
                          <span>Largeur: {runway.width?.toFixed(0) || "N/A"} m</span>
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
                      <Radio className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-medium">{freq.name || "Fréquence"}</p>
                        <p className="text-sm text-muted-foreground">{(freq.frequency / 1000000).toFixed(3)} MHz</p>
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
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <div className="space-y-4">
                {weather ? (
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex items-center space-x-2 mb-3">
                      <Cloud className="h-5 w-5 text-blue-500" />
                      <p className="font-semibold">Conditions actuelles</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Sun className="h-4 w-4 text-amber-500" />
                        <p>
                          <strong>Température:</strong> {weather.temperature.toFixed(1)}°C
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Cloud className="h-4 w-4 text-blue-500" />
                        <p>
                          <strong>Conditions:</strong> {weather.conditions}
                        </p>
                      </div>
                      {weather.wind && (
                        <>
                          <div className="flex items-center space-x-2">
                            <Wind className="h-4 w-4 text-blue-500" />
                            <p>
                              <strong>Vent:</strong> {weather.wind.speed} kt
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Compass className="h-4 w-4 text-blue-500" />
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

                <div>
                  <p className="font-semibold mb-2">METAR:</p>
                  <p className="text-sm font-mono bg-muted p-2 rounded overflow-x-auto">
                    {airportInfo.weather?.METAR || "Non disponible"}
                  </p>
                </div>

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
