import { gql } from "@apollo/client"

export const GET_ADMIN_DASHBOARD_STATS = gql`
  query GetAdminDashboardStats {
    adminDashboardStats {
      totalUsers
      totalAircrafts
      totalReservations
      totalFlights
      totalIncidents
      availableAircrafts
      pendingReservations
      flightHoursThisMonth
      usersByRole {
        roleId
        role_name
        count
      }
      reservationsByCategory {
        flight_category
        count
      }
    }
  }
`

export const GET_RECENT_RESERVATIONS = gql`
  query GetRecentReservations($limit: Int!) {
    recentReservations(limit: $limit) {
      id
      start_time
      end_time
      status
      flight_category
      aircraft {
        id
        registration_number
        model
      }
      user {
        id
        first_name
        last_name
      }
    }
  }
`

export const GET_RECENT_FLIGHTS = gql`
  query GetRecentFlights($limit: Int!) {
    recentFlights(limit: $limit) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      user {
        id
        first_name
        last_name
      }
    }
  }
`

export const GET_RECENT_INCIDENTS = gql`
  query GetRecentIncidents($limit: Int!) {
    recentIncidents(limit: $limit) {
      id
      incident_date
      description
      severity_level
      status
      aircraft {
        id
        registration_number
        model
      }
    }
  }
`
