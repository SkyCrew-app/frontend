export enum MaintenanceType {
  INSPECTION = 'INSPECTION',
  REPAIR = 'REPAIR',
  OVERHAUL = 'OVERHAUL',
  SOFTWARE_UPDATE = 'SOFTWARE_UPDATE',
  CLEANING = 'CLEANING',
  OTHER = 'OTHER',
}

export type Maintenance = {
  id: number;
  start_date: Date;
  end_date: Date;
  maintenance_type: string;
  description: string;
  maintenance_cost: number;
  images_url?: string[];
  documents_url?: string[];
  aircraft: {
    id: number;
    registration_number: string;
    model: string;
  };
  technician?: {
    id: number;
    first_name: string;
    email: string;
  };
};