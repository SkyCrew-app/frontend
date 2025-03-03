import { gql } from '@apollo/client'

export const CREATE_INCIDENT = gql`
  mutation CreateIncident($incident: IncidentInput!) {
    createIncident(incident: $incident) {
      id
      date
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