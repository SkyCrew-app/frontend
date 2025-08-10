import { gql } from "@apollo/client"

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
      cruiseSpeed
      maxAltitude
      maintenances {
        id
        maintenance_type
      }
    }
  }
`

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
`

export const CREATE_AIRCRAFT = gql`
  mutation CreateAircraft($createAircraftInput: CreateAircraftInput!, $file: Upload, $image: Upload) {
    createAircraft(createAircraftInput: $createAircraftInput, file: $file, image: $image) {
      id
      registration_number
      model
      year_of_manufacture
      maxAltitude
      cruiseSpeed
      consumption
      image_url
      documents_url
      availability_status
      maintenance_status
      hourly_cost
      total_flight_hours
    }
  }
`

export const UPDATE_AIRCRAFT = gql`
  mutation UpdateAircraft($aircraftId: Int!, $updateAircraftInput: UpdateAircraftInput!, $file: Upload, $image: Upload) {
    updateAircraft(aircraftId: $aircraftId, updateAircraftInput: $updateAircraftInput, file: $file, image: $image) {
      id
      registration_number
      model
      year_of_manufacture
      maxAltitude
      cruiseSpeed
      consumption
      image_url
      documents_url
      availability_status
      maintenance_status
      hourly_cost
      total_flight_hours
    }
  }
`

export const DELETE_AIRCRAFT = gql`
  mutation DeleteAircraft($aircraftId: Int!) {
    deleteAircraft(aircraftId: $aircraftId)
  }
`
