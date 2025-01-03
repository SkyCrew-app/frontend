import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Plane, Radio, ArrowUp, Cloud, Sun, Sunrise, Sunset } from 'lucide-react'

interface AirportInfoProps {
  airportInfo: any;
  type: 'departure' | 'arrival';
  weather?: {
    temperature: number;
    conditions: string;
  };
}

export function AirportInfo({ airportInfo, type, weather }: AirportInfoProps) {
  const bgColor = type === 'departure' ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900';
  const textColor = type === 'departure' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className={`h-6 w-6 ${textColor}`} />
          <span>{type === 'departure' ? 'Départ' : 'Arrivée'}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className={`flex items-center space-x-3 ${bgColor} p-4 rounded-lg`}>
          <p className={`text-xl font-semibold ${textColor}`}>{airportInfo.ICAO}</p>
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
                  <Plane className="h-5 w-5 text-blue-500" />
                  <p><strong>Nom:</strong> {airportInfo.name || 'N/A'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowUp className="h-5 w-5 text-blue-500" />
                  <p><strong>Élévation:</strong> {airportInfo.elevation?.toFixed(2) || 'N/A'} ft</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-5 w-5 text-blue-500" />
                  <p><strong>Fuseau horaire:</strong> {airportInfo.timezone?.name || 'N/A'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sunrise className="h-5 w-5 text-blue-500" />
                  <p><strong>Lever du soleil:</strong> {new Date(airportInfo.times?.sunrise).toLocaleTimeString() || 'N/A'}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sunset className="h-5 w-5 text-blue-500" />
                  <p><strong>Coucher du soleil:</strong> {new Date(airportInfo.times?.sunset).toLocaleTimeString() || 'N/A'}</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="runways">
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <ul className="space-y-2">
                {airportInfo.runways?.map((runway: any, index: number) => (
                  <li key={index} className="bg-muted p-2 rounded">
                    <strong>{runway.ident}</strong>
                    <br />
                    Longueur: {(runway.length / 1000).toFixed(2)} km
                    <br />
                    Largeur: {runway.width.toFixed(0)} m
                    <br />
                    Surface: {runway.surface}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="frequencies">
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <ul className="space-y-2">
                {airportInfo.frequencies?.map((freq: any, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <Radio className="h-4 w-4 text-blue-500" />
                    <span><strong>{freq.name}:</strong> {(freq.frequency / 1000000).toFixed(3)} MHz</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="weather">
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Cloud className="h-5 w-5 text-blue-500" />
                  <p><strong>Conditions actuelles:</strong> {weather ? `${weather.temperature.toFixed(1)}°C, ${weather.conditions}` : 'N/A'}</p>
                </div>
                <div>
                  <p><strong>METAR:</strong> {airportInfo.weather?.METAR || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>TAF:</strong> {airportInfo.weather?.TAF || 'N/A'}</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
