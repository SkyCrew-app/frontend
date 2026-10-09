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