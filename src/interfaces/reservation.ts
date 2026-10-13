export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
}

export interface Reservation {
  id: number | string
  user_id: number | string
  aircraft_id: number | string
  start_time: string
  end_time: string
  purpose: string
  notes?: string
  status: ReservationStatus | string
  flight_category: string
  estimated_flight_hours?: number
  /** What the member was charged, fixed when the booking was paid; null when unknown. */
  charged_amount?: number | null
  aircraft: {
    id?: number | string
    registration_number: string
    model?: string
  }
  user?: {
    id?: number | string
    email?: string
    first_name?: string
    last_name?: string
  }
  /** The instructor on board, for an instruction flight. */
  instructor?: {
    id?: number | string
    first_name?: string | null
    last_name?: string | null
  } | null
  flights?: {
    id: number | string
    closed_at?: string | null
  }[]
}

