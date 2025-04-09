import { gql } from "@apollo/client"

export const GET_ALL_AUDITS = gql`
  query GetAudits($filter: AuditFilterInput) {
    audits(filter: $filter) {
      id
      audit_date
      audit_result
      audit_notes
      corrective_actions
      next_audit_date
      audit_frequency
      is_closed
      aircraft {
        id
        registration_number
        model
      }
      auditor {
        id
        first_name
        last_name
      }
      audit_items {
        id
        category
        description
        result
        notes
      }
    }
  }
`

export const GET_AUDIT_BY_ID = gql`
  query GetAudit($id: Int!) {
    audit(id: $id) {
      id
      audit_date
      audit_result
      audit_notes
      corrective_actions
      next_audit_date
      audit_frequency
      is_closed
      aircraft {
        id
        registration_number
        model
      }
      auditor {
        id
        first_name
        last_name
      }
      audit_items {
        id
        category
        description
        result
        notes
        requires_action
      }
      closed_by {
        id
        first_name
        last_name
      }
      closed_date
      created_at
      updated_at
    }
  }
`

export const CREATE_AUDIT = gql`
  mutation CreateAudit($createAuditInput: CreateAuditInput!) {
    createAudit(createAuditInput: $createAuditInput) {
      id
      audit_date
      audit_result
      audit_notes
      audit_frequency
      next_audit_date
      is_closed
      aircraft {
        id
        registration_number
        model
      }
      auditor {
        id
        first_name
        last_name
      }
    }
  }
`

export const UPDATE_AUDIT = gql`
  mutation UpdateAudit($id: Int!, $input: UpdateAuditInput!) {
    updateAudit(id: $id, updateAuditInput: $input) {
      id
      audit_date
      audit_result
      audit_notes
      corrective_actions
      next_audit_date
      is_closed
    }
  }
`

export const DELETE_AUDIT = gql`
  mutation DeleteAudit($id: Int!) {
    deleteAudit(id: $id)
  }
`

export const GET_AUDIT_TEMPLATE = gql`
  query GetAuditTemplates {
    auditTemplates {
      id
      name
      description
      recommended_frequency
      applicable_aircraft_types
      is_active
      version
      items {
        id
        category
        title
        description
        criticality
      }
    }
  }
`

export const CREATE_AUDIT_TEMPLATE = gql`
  mutation CreateAuditTemplate($input: CreateAuditTemplateInput!) {
    createAuditTemplate(createTemplateInput: $input) {
      id
      name
      description
      recommended_frequency
      applicable_aircraft_types
      is_active
      version
    }
  }
`

export const UPDATE_AUDIT_TEMPLATE = gql`
  mutation UpdateAuditTemplate($id: Int!, $input: UpdateAuditTemplateInput!) {
    updateAuditTemplate(id: $id, updateTemplateInput: $input) {
      id
      name
      description
      recommended_frequency
      applicable_aircraft_types
      is_active
      version
    }
  }
`

export const DELETE_AUDIT_TEMPLATE = gql`
  mutation DeleteAuditTemplate($id: Int!) {
    deleteAuditTemplate(id: $id)
  }
`

export const GET_OVERDUE_AUDITS = gql`
  query GetOverdueAudits {
    overdueAudits {
      id
      audit_date
      next_audit_date
      aircraft {
        id
        registration_number
      }
    }
  }
`

export const GET_UPCOMING_AUDITS = gql`
  query GetUpcomingAudits($daysAhead: Int) {
    upcomingAudits(daysAhead: $daysAhead) {
      id
      audit_date
      next_audit_date
      audit_frequency
      aircraft {
        id
        registration_number
        model
      }
      auditor {
        id
        first_name
        last_name
      }
    }
  }
`

export const GET_AUDIT_TEMPLATE_BY_ID = gql`
  query GetAuditTemplate($id: Int!) {
    auditTemplate(id: $id) {
      id
      name
      description
      recommended_frequency
      applicable_aircraft_types
      is_active
      version
      created_by {
        id
        first_name
        last_name
      }
      created_at
      updated_at
      items {
        id
        order_index
        category
        title
        description
        inspection_method
        expected_result
        criticality
        reference_documentation
        requires_photo_evidence
        is_mandatory
      }
    }
  }
`

export const GET_TEMPLATES_FOR_AIRCRAFT_TYPE = gql`
  query GetTemplatesForAircraftType($aircraftType: String!) {
    auditTemplatesForAircraftType(aircraftType: $aircraftType) {
      id
      name
      description
      recommended_frequency
      applicable_aircraft_types
      is_active
      version
    }
  }
`

export const CREATE_AUDIT_ITEM = gql`
  mutation CreateAuditItem($auditId: Int!, $input: CreateAuditItemInput!) {
    createAuditItem(auditId: $auditId, createItemInput: $input) {
      id
      category
      description
      result
      notes
      requires_action
    }
  }
`

export const UPDATE_AUDIT_ITEM = gql`
  mutation UpdateAuditItem($id: Int!, $input: UpdateAuditItemInput!) {
    updateAuditItem(id: $id, updateItemInput: $input) {
      id
      category
      description
      result
      notes
      requires_action
    }
  }
`

export const DELETE_AUDIT_ITEM = gql`
  mutation DeleteAuditItem($id: Int!) {
    deleteAuditItem(id: $id)
  }
`

export const GET_AUDIT_STATISTICS = gql`
  query GetAuditStatistics($startDate: DateTime, $endDate: DateTime) {
    auditStatistics(startDate: $startDate, endDate: $endDate) {
      totalAudits
      conformCount
      nonConformCount
      conformWithRemarksCount
      openAudits
      closedAudits
      auditsByAircraft {
        aircraftId
        registration
        auditCount
        nonConformCount
      }
      auditsByMonth {
        month
        year
        count
      }
    }
  }
`

export const GET_AUDIT_ENUMS = gql`
  query GetAuditEnums {
    auditResultTypes
    auditFrequencyTypes
    auditCategoryTypes
    criticalityLevels
  }
`

export const CLOSE_AUDIT = gql`
  mutation CloseAudit($id: Int!, $closedById: Int!) {
    updateAudit(
      id: $id,
      updateAuditInput: {
        is_closed: true,
        closedById: $closedById
      }
    ) {
      id
      is_closed
      closed_date
      closed_by {
        id
        first_name
        last_name
      }
    }
  }
`

export const GET_AIRCRAFT_FOR_AUDIT = gql`
  query GetAircraftForAudit {
    getAircrafts {
      id
      registration_number
      model
    }
  }
`

export const GET_USERS_FOR_AUDIT = gql`
  query GetUsersForAudit {
    getUsers {
      id
      first_name
      last_name
      email
      role {
        id
        role_name
      }
    }
  }
`
