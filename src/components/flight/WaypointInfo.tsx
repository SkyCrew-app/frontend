"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plane, MapPin, ArrowUp, Navigation, Compass } from "lucide-react"
import { useTranslations } from "next-intl"

interface Waypoint {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name: string | null
}

interface WaypointInfoProps {
  waypoints: Waypoint[]
  onFocusWaypoint?: (index: number) => void
}

export function WaypointInfo({ waypoints, onFocusWaypoint }: WaypointInfoProps) {
  const getWaypointTypeColor = (type: string) => {
    switch (type) {
      case "APT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "VOR":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "NDB":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case "FIX":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getWaypointIcon = (type: string) => {
    switch (type) {
      case "APT":
        return <Plane className="h-5 w-5" />
      case "VOR":
        return <Navigation className="h-5 w-5" />
      case "NDB":
        return <Compass className="h-5 w-5" />
      default:
        return <MapPin className="h-5 w-5" />
    }
  }

  const t = useTranslations("reservation")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Navigation className="h-6 w-6 text-primary" />
          <span>{t('waypoints')}</span>
          <Badge variant="outline" className="ml-auto">
            {waypoints.length} {t('waypoints')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {waypoints.length > 0 ? (
            <div className="space-y-4">
              {waypoints.map((waypoint, index) => (
                <div
                  key={index}
                  className="relative bg-card dark:bg-card-dark p-4 rounded-md shadow hover:shadow-md transition-shadow duration-200 border"
                  onClick={() => onFocusWaypoint && onFocusWaypoint(index)}
                >
                  <div className="absolute top-0 left-0 w-8 h-8 bg-primary/10 flex items-center justify-center rounded-tl-md rounded-br-md">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>

                  <div className="flex justify-between items-center mb-3 pl-6">
                    <h3 className="text-lg font-semibold flex items-center">{waypoint.ident}</h3>
                    <Badge className={getWaypointTypeColor(waypoint.type)}>
                      <span className="flex items-center">
                        {getWaypointIcon(waypoint.type)}
                        <span className="ml-1">{waypoint.type}</span>
                      </span>
                    </Badge>
                  </div>

                  {waypoint.name && <p className="text-sm text-muted-foreground mb-3 pl-6">{waypoint.name}</p>}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Lat: {waypoint.lat.toFixed(4)}°</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Lon: {waypoint.lon.toFixed(4)}°</span>
                    </div>
                    <div className="flex items-center space-x-1 col-span-2">
                      <ArrowUp className="h-4 w-4 text-muted-foreground" />
                      <span>Altitude: {waypoint.alt} ft</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MapPin className="h-12 w-12 mb-2 opacity-20" />
              <p>{t('noWaypoints')}</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
