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
      departure_time
      closed_at
      reservation {
        id
        start_time
      }
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

// The trace of what administrators did: one page of it, newest first.
export const GET_ADMIN_ACTIONS = gql`
  query GetAdminActions($memberId: Int, $action: String, $page: Int, $pageSize: Int) {
    adminActions(memberId: $memberId, action: $action, page: $page, pageSize: $pageSize) {
      total
      page
      pageSize
      items {
        id
        created_at
        actor_id
        actor_label
        action
        target_type
        target_id
        target_label
        summary
      }
    }
  }
`

// The action names the trace can hold, for the filter.
export const GET_ADMIN_ACTION_NAMES = gql`
  query GetAdminActionNames {
    adminActionNames
  }
`
