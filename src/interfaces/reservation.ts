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
  flights?: {
    id: number | string
  }[]
}

