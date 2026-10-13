export interface FlightPerson {
  id: number | string
  first_name?: string | null
  last_name?: string | null
}

export interface Flight {
  id: number | string
  flight_hours: number
  flight_type: string
  origin_icao: string
  destination_icao: string
  weather_conditions?: string
  number_of_passengers?: number
  encoded_polyline?: string
  distance_km?: number
  estimated_flight_time?: number
  waypoints?: string[]
  departure_airport_info?: string
  arrival_airport_info?: string
  detailed_waypoints?: string[]
  departure_time?: string
  arrival_time?: string
  fuel_policy?: string
  wind_summary?: string
  performance_profile?: string
  remarks?: string | null
  closed_at?: string | null
  created_at?: string
  estimated_fuel_liters?: number
  user?: {
    id: number | string
    first_name?: string
    last_name?: string
    email?: string
  }
  /** The instructor on board, recorded when the flight is closed. */
  instructor?: FlightPerson | null
  /** On logbook entries: the part the owner of the logbook took in the flight. */
  logbook_role?: "PILOT_IN_COMMAND" | "DUAL" | "INSTRUCTOR" | null
  reservation?: {
    id: number | string
    start_time: string
    end_time: string
    purpose: string
    status: string
    notes?: string
    flight_category: string
    instructor?: FlightPerson | null
    aircraft: {
      id: number | string
      registration_number: string
      model?: string
    }
  }
}
