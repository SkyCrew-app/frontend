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
  user?: {
    id: number | string
    first_name?: string
    last_name?: string
    email?: string
  }
  reservation?: {
    id: number | string
    start_time: string
    end_time: string
    purpose: string
    status: string
    notes?: string
    flight_category: string
    aircraft: {
      id: number | string
      registration_number: string
    }
  }
}
