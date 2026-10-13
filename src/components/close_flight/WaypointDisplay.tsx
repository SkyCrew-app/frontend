import { useTranslation } from "react-i18next"
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
  /** Only the chain of identifiers, for a narrow column. */
  compact?: boolean
}

const isDetailed = (waypoint: unknown): waypoint is Waypoint =>
  !!waypoint &&
  typeof waypoint === "object" &&
  typeof (waypoint as Waypoint).lat === "number" &&
  typeof (waypoint as Waypoint).lon === "number"

/** Read-only route of the flight plan, shown on the closing page. */
export default function WaypointsDisplay({ waypoints, compact = false }: WaypointsDisplayProps) {
  const { t } = useTranslation("flights")

  if (!waypoints) return null

  let parsedWaypoints: unknown[] = []
  try {
    const parsed = typeof waypoints === "string" ? JSON.parse(waypoints) : waypoints
    parsedWaypoints = Array.isArray(parsed) ? parsed : []
  } catch {
    return <p className="text-sm text-muted-foreground">{t("closeFlight.waypoints.unreadable")}</p>
  }

  if (parsedWaypoints.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("closeFlight.waypoints.direct")}</p>
  }

  // Plans prepared by hand only keep the identifiers of their points.
  if (compact || !parsedWaypoints.every(isDetailed)) {
    return (
      <p className="text-sm">
        {parsedWaypoints.map((waypoint) => String((waypoint as Waypoint)?.ident ?? waypoint)).join(" → ")}
      </p>
    )
  }

  return (
    <div className="max-h-72 overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("closeFlight.waypoints.point")}</TableHead>
            <TableHead>{t("common:labels.type")}</TableHead>
            <TableHead className="text-right">{t("closeFlight.waypoints.latitude")}</TableHead>
            <TableHead className="text-right">{t("closeFlight.waypoints.longitude")}</TableHead>
            <TableHead className="text-right">{t("closeFlight.waypoints.altitude")}</TableHead>
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
              <TableCell className="text-right tabular-nums">
                {waypoint.alt ? `${waypoint.alt} ft` : t("closeFlight.waypoints.ground")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
