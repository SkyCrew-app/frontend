import { gql } from '@apollo/client';

export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    userByEmail(email: $email) {
      id
      email
    }
  }
`;

export const GET_USER_FLIGHT_PLANS = gql`
  query GetFlightsByUser($userId: Int!) {
    getFlightsByUser(userId: $userId) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      number_of_passengers
      distance_km
      estimated_flight_time
      user {
        id
        first_name
        last_name
      }
      reservation {
        id
        start_time
        end_time
        purpose
        status
        notes
        flight_category
        aircraft {
          id
          registration_number
        }
      }
    }
  }
`;

export const UPDATE_FLIGHT_PLAN = gql`
  mutation UpdateFlightPlan($input: UpdateFlightInput!) {
    updateFlight(updateFlightInput: $input) {
      id
      flight_type
      weather_conditions
      number_of_passengers
    }
  }
`;

export const GET_FLIGHT_PLAN_BY_ID = gql`
  query GetFlightById($id: Int!) {
    getFlightById(id: $id) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      weather_conditions
      number_of_passengers
      encoded_polyline
      distance_km
      estimated_flight_time
      departure_time
      arrival_time
      waypoints
      departure_airport_info
      arrival_airport_info
      detailed_waypoints
      fuel_policy
      wind_summary
      performance_profile
      estimated_fuel_liters
      user {
        id
        first_name
        last_name
        email
      }
      reservation {
        id
        start_time
        end_time
        purpose
        status
        notes
        flight_category
        aircraft {
          id
          registration_number
          model
          cruiseSpeed
          consumption
          maxAltitude
          total_flight_hours
          image_url
        }
      }
    }
  }
`;

export const CREATE_FLIGHT = gql`
  mutation CreateFlight($createFlightInput: CreateFlightInput!) {
    createFlight(createFlightInput: $createFlightInput) {
      id
      origin_icao
      destination_icao
      flight_type
      flight_hours
      number_of_passengers
      distance_km
      estimated_flight_time
      waypoints
      encoded_polyline
    }
  }
`;

export const GENERATE_FLIGHT_PLAN = gql`
  mutation GenerateFlightPlan($input: GenerateFlightPlanInput!) {
    generateFlightPlan(input: $input) {
      id
      origin_icao
      destination_icao
      flight_type
      flight_hours
      number_of_passengers
      distance_km
      estimated_flight_time
      waypoints
      encoded_polyline
      departure_time
      arrival_time
      departure_airport_info
      arrival_airport_info
      weather_conditions
      fuel_policy
      wind_summary
      performance_profile
      estimated_fuel_liters
    }
  }
`;

export const GET_FLIGHT = gql`
  query GetFlight($id: Int!) {
    getFlightById(id: $id) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      weather_conditions
      number_of_passengers
      encoded_polyline
      distance_km
      estimated_flight_time
      departure_time
      arrival_time
      waypoints
      detailed_waypoints
      fuel_policy
      wind_summary
      performance_profile
      estimated_fuel_liters
      reservation {
        id
        start_time
        end_time
        purpose
        aircraft {
          id
          registration_number
          model
          image_url
        }
      }
      user {
        id
        first_name
        last_name
        role {
          role_name
        }
      }
    }
  }
`;

export const UPDATE_FLIGHT = gql`
  mutation UpdateFlight($updateFlightInput: UpdateFlightInput!) {
    updateFlight(updateFlightInput: $updateFlightInput) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      weather_conditions
      number_of_passengers
      encoded_polyline
      distance_km
      estimated_flight_time
      waypoints
      detailed_waypoints
    }
  }
`;