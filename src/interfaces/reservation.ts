export interface Reservation {
  id: number;
  start_time: string;
  end_time: string;
  estimated_flight_hours: number;
  status: ReservationStatus;
  notes: string;
  flight_category: string;
  aircraft: {
    id: number;
    registration_number: string;
  };
  purpose: string;
  user: {
    first_name: string;
  };
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}