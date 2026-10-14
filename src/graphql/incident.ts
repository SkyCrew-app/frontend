import { gql } from '@apollo/client'

export const CREATE_INCIDENT = gql`
  mutation CreateIncident($incident: CreateIncidentInput!) {
    createIncident(incident: $incident) {
      id
      incident_date
      severity_level
      description
      damage_report
      corrective_actions
      status
      priority
      category
    }
  }
`

// The same fields for the list and for the mutation, so the page can show the answer as is.
const INCIDENT_FIELDS = `
  id
  incident_date
  description
  damage_report
  corrective_actions
  severity_level
  status
  priority
  category
  resolution_note
  resolved_at
  resolved_by {
    id
    first_name
    last_name
  }
  aircraft {
    id
    registration_number
    model
    availability_status
  }
  hasFlight
  flight {
    id
    origin_icao
    destination_icao
    departure_time
    flight_hours
    flight_type
    reservation {
      id
      start_time
    }
  }
  user {
    id
    first_name
    last_name
    email
  }
`

export const GET_ALL_INCIDENTS = gql`
  query GetAllIncidents {
    getAllIncidents {
      ${INCIDENT_FIELDS}
    }
  }
`

// Every member reads the incidents (club rule); the full list is kept for the staff,
// so a member reads them status by status, in one request.
export const GET_INCIDENTS_FOR_MEMBERS = gql`
  query GetIncidentsForMembers {
    open: getIncidentsByStatus(status: "Ouvert") {
      ${INCIDENT_FIELDS}
    }
    inProgress: getIncidentsByStatus(status: "En cours") {
      ${INCIDENT_FIELDS}
    }
    resolved: getIncidentsByStatus(status: "Résolu") {
      ${INCIDENT_FIELDS}
    }
  }
`

export const UPDATE_INCIDENT_STATUS = gql`
  mutation UpdateIncidentStatus($id: Int!, $status: String!, $resolution_note: String) {
    updateIncidentStatus(id: $id, status: $status, resolution_note: $resolution_note) {
      ${INCIDENT_FIELDS}
    }
  }
`
