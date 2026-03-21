export interface ReservationTemplate {
  id: number
  name: string
  aircraft?: {
    id: number
    registration_number: string
    model: string
  }
  day_of_week?: number
  preferred_start_time?: string
  preferred_end_time?: string
  flight_category: string
  purpose?: string
  notes?: string
  estimated_flight_hours?: number
  created_at: string
}
