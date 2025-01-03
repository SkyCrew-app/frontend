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
      waypoints
      departure_airport_info
      arrival_airport_info
      detailed_waypoints
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
  mutation GenerateFlightPlan($origin_icao: String!, $destination_icao: String!, $user_id: Int!, $reservation_id: Int) {
    generateFlightPlan(origin_icao: $origin_icao, destination_icao: $destination_icao, user_id: $user_id, reservation_id: $reservation_id) {
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