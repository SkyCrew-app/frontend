export interface LogbookFilter {
  startDate?: string
  endDate?: string
  aircraftId?: number
  flightType?: string
}

export interface HoursEntry {
  label: string
  hours: number
}

export interface MonthlyHoursEntry {
  month: string
  hours: number
}

export interface LogbookStats {
  totalHours: number
  totalFlights: number
  hoursByModel: HoursEntry[]
  hoursByCategory: HoursEntry[]
  monthlyHours: MonthlyHoursEntry[]
  averageFlightDuration: number
  longestFlight: number
  last30DaysHours: number
  last90DaysHours: number
}
