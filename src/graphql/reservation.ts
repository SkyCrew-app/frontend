import { gql } from '@apollo/client';

export const GET_FILTERED_RESERVATIONS = gql`
  query FilteredReservations($startDate: String!, $endDate: String!) {
    filteredReservations(start_date: $startDate, end_date: $endDate) {
      id
      start_time
      end_time
      purpose
      estimated_flight_hours
      status
      notes
      flight_category
      user {
        first_name
      }
      aircraft {
        id
        registration_number
      }
    }
  }
`;

export const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: CreateReservationInput!) {
    createReservation(createReservationInput: $input) {
      id
      start_time
      end_time
      purpose
      aircraft {
        id
        registration_number
      }
      user {
        first_name
      }
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($input: UpdateReservationInput!) {
    updateReservation(updateReservationInput: $input) {
      id
      purpose
      notes
      flight_category
    }
  }
`;

export const DELETE_RESERVATION = gql`
  mutation DeleteReservation($id: Int!) {
    deleteReservation(id: $id) {
      id
    }
  }
`;

export const GET_USER_RESERVATIONS = gql`
  query GetUserReservations($userId: Int!) {
    userReservations(userId: $userId) {
      id
      start_time
      end_time
      purpose
      flight_category
      status
      notes
      aircraft {
        id
        registration_number
      }
      user {
        id
        first_name
        last_name
      }
    }
  }
`;
