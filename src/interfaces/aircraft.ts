import { MaintenanceType } from './maintenance';

export type Aircraft = {
  consumption: string;
  id: number;
  registration_number: string;
  model: string;
  availability_status: string;
  maintenance_status: string;
  hourly_cost: number;
  year_of_manufacture: number;
  total_flight_hours: number;
  image_url?: string;
  documents_url?: string[];
  maintenances?: {
    id: number;
    maintenance_type: MaintenanceType;
  }[];
};

export type AircraftData = {
  getAircrafts: Aircraft[];
};

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  RESERVED = 'RESERVED',
}