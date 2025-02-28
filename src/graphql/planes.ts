import { gql } from '@apollo/client';

export const GET_AIRCRAFTS = gql`
  query GetAircrafts {
    getAircrafts {
      id
      registration_number
      model
      availability_status
      maintenance_status
      hourly_cost
      year_of_manufacture
      total_flight_hours
      image_url
      documents_url
      consumption
      maintenances {
        id
        maintenance_type
      }
    }
  }
`;

export const GET_FLIGHT_HISTORY = gql`
  query GetFlightHistory {
    getHistoryAircraft {
      id
      registration_number
      model
      reservations {
        id
        start_time
        end_time
        user {
          first_name
          last_name
        }
      }
      maintenances {
        id
        maintenance_type
        start_date
        end_date
        technician {
          first_name
          last_name
        }
      }
    }
  }
`;