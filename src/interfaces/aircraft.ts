import type { MaintenanceType } from "./maintenance"

export type Aircraft = {
  consumption: string
  id: number
  registration_number: string
  model: string
  availability_status: string
  maintenance_status: string
  hourly_cost: number
  year_of_manufacture: number
  total_flight_hours: number
  image_url?: string
  documents_url?: string[]
  maxAltitude?: number
  cruiseSpeed?: number
  last_inspection_date?: string
  current_location?: string
  maintenances?: {
    id: number
    maintenance_type: MaintenanceType
  }[]
}

export type AircraftData = {
  getAircrafts: Aircraft[]
}

export enum AvailabilityStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  RESERVED = "RESERVED",
}

export interface CreateAircraftInput {
  registration_number: string
  model: string
  year_of_manufacture: number
  availability_status: AvailabilityStatus
  maintenance_status: string
  hourly_cost: number
  image_url?: string
  documents_url?: string[]
  last_inspection_date?: string
  current_location?: string
  maxAltitude?: number
  cruiseSpeed?: number
  consumption?: number
}

export interface UpdateAircraftInput {
  registration_number?: string
  model?: string
  year_of_manufacture?: number
  availability_status?: AvailabilityStatus
  maintenance_status?: string
  hourly_cost?: number
  image_url?: string
  documents_url?: string[]
  last_inspection_date?: string
  current_location?: string
  maxAltitude?: number
  cruiseSpeed?: number
  consumption?: number
}

export interface AircraftResponse {
  aircraft: Aircraft
}

export interface AircraftsResponse {
  getAircrafts: Aircraft[]
}

export interface CreateAircraftResponse {
  createAircraft: Aircraft
}

export interface UpdateAircraftResponse {
  updateAircraft: Aircraft
}

export interface DeleteAircraftResponse {
  deleteAircraft: boolean
}
