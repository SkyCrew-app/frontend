"use client"

import { format } from "date-fns"
import { TableCell } from "@/components/ui/table"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import type { Reservation } from "@/interfaces/reservation"
import { Clock, User, FileText, Tag } from "lucide-react"

interface ReservationCellProps {
  reservation: Reservation
  colSpan: number
  onClick: () => void
}

export function ReservationCell({ reservation, colSpan, onClick }: ReservationCellProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-success/15 text-success border-l-2 border-l-success hover:bg-success/25"
      case "PENDING":
        return "bg-warning/15 text-warning border-l-2 border-l-warning hover:bg-warning/25"
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-l-2 border-l-destructive line-through hover:bg-destructive/20"
      default:
        return "bg-info/15 text-info border-l-2 border-l-info hover:bg-info/25"
    }
  }

  const statusColor = getStatusColor(reservation.status)

  return (
    <TableCell
      colSpan={colSpan}
      className={`text-center p-0 font-medium cursor-pointer transition-colors ${statusColor}`}
      onClick={onClick}
    >
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="p-2 h-full flex items-center justify-center text-sm">
            <span className="truncate max-w-[150px]">{reservation.purpose || "Réservation"}</span>
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium">{reservation.purpose || "Réservation"}</h4>

            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm">
                  {reservation.user?.first_name} {reservation.user?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{reservation.user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm">
                <p>
                  {format(new Date(reservation.start_time), "HH:mm")} -{" "}
                  {format(new Date(reservation.end_time), "HH:mm")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reservation.estimated_flight_hours} heure(s) estimée(s)
                </p>
              </div>
            </div>

            {reservation.flight_category && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{reservation.flight_category}</p>
              </div>
            )}

            {reservation.notes && (
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">{reservation.notes}</p>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    </TableCell>
  )
}
