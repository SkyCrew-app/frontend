import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Waypoint = {
  ident: string
  type: string
  lat: number
  lon: number
  alt: number
  name: string | null
}

type WaypointsDisplayProps = {
  waypoints: string
}

export default function WaypointsDisplay({ waypoints }: WaypointsDisplayProps) {
  if (!waypoints) return null

  let parsedWaypoints: Waypoint[] = []
  try {
    parsedWaypoints = JSON.parse(waypoints)
  } catch (error) {
    console.error("Erreur lors de l'analyse des points de cheminement:", error)
    return <div className="text-red-500">Format de points de cheminement invalide</div>
  }

  if (!Array.isArray(parsedWaypoints) || parsedWaypoints.length === 0) {
    return <div className="text-muted-foreground">Aucun point de cheminement</div>
  }

  const formatCoordinate = (value: number) => {
    return value.toFixed(4)
  }

  const formatAltitude = (alt: number) => {
    return alt === 0 ? "Sol" : `${alt} ft`
  }

  return (
    <Card>
      <CardContent className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifiant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Latitude</TableHead>
              <TableHead>Longitude</TableHead>
              <TableHead>Altitude</TableHead>
              <TableHead>Nom</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parsedWaypoints.map((waypoint, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{waypoint.ident}</TableCell>
                <TableCell>{waypoint.type}</TableCell>
                <TableCell>{formatCoordinate(waypoint.lat)}</TableCell>
                <TableCell>{formatCoordinate(waypoint.lon)}</TableCell>
                <TableCell>{formatAltitude(waypoint.alt)}</TableCell>
                <TableCell>{waypoint.name || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
