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

const isDetailed = (waypoint: unknown): waypoint is Waypoint =>
  !!waypoint &&
  typeof waypoint === "object" &&
  typeof (waypoint as Waypoint).lat === "number" &&
  typeof (waypoint as Waypoint).lon === "number"

/** Read-only route of the flight plan, shown on the closing page. */
export default function WaypointsDisplay({ waypoints }: WaypointsDisplayProps) {
  if (!waypoints) return null

  let parsedWaypoints: unknown[] = []
  try {
    const parsed = typeof waypoints === "string" ? JSON.parse(waypoints) : waypoints
    parsedWaypoints = Array.isArray(parsed) ? parsed : []
  } catch {
    return <p className="text-sm text-muted-foreground">Les points de route de ce plan ne sont pas lisibles.</p>
  }

  if (parsedWaypoints.length === 0) {
    return <p className="text-sm text-muted-foreground">Vol direct, sans point de route.</p>
  }

  // Plans prepared by hand only keep the identifiers of their points.
  if (!parsedWaypoints.every(isDetailed)) {
    return <p className="text-sm">{parsedWaypoints.map((waypoint) => String((waypoint as Waypoint)?.ident ?? waypoint)).join(" → ")}</p>
  }

  return (
    <div className="max-h-72 overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Point</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Latitude</TableHead>
            <TableHead className="text-right">Longitude</TableHead>
            <TableHead className="text-right">Altitude</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parsedWaypoints.map((waypoint, index) => (
            <TableRow key={index}>
              <TableCell>
                <span className="font-medium">{waypoint.ident}</span>
                {waypoint.name && waypoint.name !== waypoint.ident && (
                  <span className="block text-xs text-muted-foreground">{waypoint.name}</span>
                )}
              </TableCell>
              <TableCell>{waypoint.type || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{waypoint.lat.toFixed(4)}°</TableCell>
              <TableCell className="text-right tabular-nums">{waypoint.lon.toFixed(4)}°</TableCell>
              <TableCell className="text-right tabular-nums">{waypoint.alt ? `${waypoint.alt} ft` : "Sol"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
