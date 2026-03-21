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
      flights {
        id
      }
    }
  }
`;

export const GET_RESERVATIONS = gql`
  query GetReservations {
    reservations {
      id
      aircraft {
        id
        registration_number
        hourly_cost
      }
      start_time
      end_time
      status
    }
  }
`

// === Reservation Templates ===

export const GET_MY_TEMPLATES = gql`
  query GetMyReservationTemplates {
    myReservationTemplates {
      id
      name
      aircraft {
        id
        registration_number
        model
      }
      day_of_week
      preferred_start_time
      preferred_end_time
      flight_category
      purpose
      notes
      estimated_flight_hours
      created_at
    }
  }
`

export const CREATE_RESERVATION_TEMPLATE = gql`
  mutation CreateReservationTemplate($input: CreateReservationTemplateInput!) {
    createReservationTemplate(input: $input) {
      id
      name
      flight_category
    }
  }
`

export const UPDATE_RESERVATION_TEMPLATE = gql`
  mutation UpdateReservationTemplate($input: UpdateReservationTemplateInput!) {
    updateReservationTemplate(input: $input) {
      id
      name
      flight_category
    }
  }
`

export const DELETE_RESERVATION_TEMPLATE = gql`
  mutation DeleteReservationTemplate($id: Int!) {
    deleteReservationTemplate(id: $id)
  }
`
