import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Plane, MapPin, ArrowUp } from 'lucide-react'

interface Waypoint {
  ident: string;
  type: string;
  lat: number;
  lon: number;
  alt: number;
  name: string | null;
}

interface WaypointInfoProps {
  waypoints: Waypoint[];
}

export function WaypointInfo({ waypoints }: WaypointInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-6 w-6 text-blue-500" />
          <span>Waypoints</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {waypoints.map((waypoint, index) => (
            <div key={index} className="mb-4 bg-card dark:bg-card-dark p-3 rounded-md shadow">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-sm py-1 px-2 bg-muted text-primary">
                  {index + 1}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  {waypoint.type}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                {waypoint.type === 'APT' ? <Plane className="h-5 w-5 mr-2 text-blue-500" /> : <MapPin className="h-5 w-5 mr-2 text-blue-500" />}
                {waypoint.ident}
              </h3>
              {waypoint.name && <p className="text-sm text-muted-foreground mb-2">{waypoint.name}</p>}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Latitude: {waypoint.lat.toFixed(4)}°</div>
                <div>Longitude: {waypoint.lon.toFixed(4)}°</div>
              </div>
              <div className="flex items-center mt-2">
                <ArrowUp className="h-4 w-4 mr-1 text-blue-500" />
                <span className="text-sm">Altitude: {waypoint.alt} ft</span>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
