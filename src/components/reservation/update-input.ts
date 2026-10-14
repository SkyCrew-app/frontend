import type { Reservation } from "@/interfaces/reservation"
import type { NewReservationValues } from "@/components/reservation/new-reservation-form"

/**
 * The `updateReservation` input for the values of the edit form. The slot, the aircraft and
 * the instructor are sent only when they change: the API prices the booking again (and
 * charges or refunds the difference) when the slot or the aircraft changes, and a null
 * instructor takes the instructor off the booking.
 */
export const updateInputFrom = (reservation: Reservation, values: NewReservationValues) => {
  const slotChanged =
    String(values.aircraftId) !== String(reservation.aircraft.id) ||
    values.startTime.getTime() !== new Date(reservation.start_time).getTime() ||
    values.endTime.getTime() !== new Date(reservation.end_time).getTime()
  const instructorId = values.instructorId ?? ""
  return {
    id: Number(reservation.id),
    purpose: values.purpose,
    notes: values.notes,
    flight_category: values.flightCategory || reservation.flight_category,
    ...(slotChanged
      ? {
          aircraft_id: values.aircraftId,
          start_time: values.startTime,
          end_time: values.endTime,
          estimated_flight_hours: (values.endTime.getTime() - values.startTime.getTime()) / 3_600_000,
        }
      : {}),
    ...(instructorId !== String(reservation.instructor?.id ?? "")
      ? { instructor_id: instructorId ? Number(instructorId) : null }
      : {}),
  }
}
