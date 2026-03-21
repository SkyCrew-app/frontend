import { gql } from '@apollo/client';

export const GET_CHECKLIST_TEMPLATES = gql`
  query GetChecklistTemplates($aircraftModel: String) {
    checklistTemplates(aircraftModel: $aircraftModel) {
      id
      name
      description
      aircraft_model
      is_active
      created_at
      updated_at
      items {
        id
        item_name
        description
        category
        is_required
        sort_order
      }
    }
  }
`;

export const GET_CHECKLIST_TEMPLATE = gql`
  query GetChecklistTemplate($id: Int!) {
    checklistTemplate(id: $id) {
      id
      name
      description
      aircraft_model
      is_active
      created_at
      updated_at
      items {
        id
        item_name
        description
        category
        is_required
        sort_order
      }
    }
  }
`;

export const CREATE_CHECKLIST_TEMPLATE = gql`
  mutation CreateChecklistTemplate($input: CreateChecklistTemplateInput!) {
    createChecklistTemplate(createChecklistTemplateInput: $input) {
      id
      name
      description
      aircraft_model
      is_active
    }
  }
`;

export const UPDATE_CHECKLIST_TEMPLATE = gql`
  mutation UpdateChecklistTemplate($input: UpdateChecklistTemplateInput!) {
    updateChecklistTemplate(updateChecklistTemplateInput: $input) {
      id
      name
      description
      aircraft_model
      is_active
    }
  }
`;

export const CREATE_CHECKLIST_ITEM = gql`
  mutation CreateChecklistItem($input: CreateChecklistItemInput!) {
    createChecklistItem(createChecklistItemInput: $input) {
      id
      item_name
      description
      category
      is_required
      sort_order
    }
  }
`;

export const UPDATE_CHECKLIST_ITEM = gql`
  mutation UpdateChecklistItem($input: UpdateChecklistItemInput!) {
    updateChecklistItem(updateChecklistItemInput: $input) {
      id
      item_name
      description
      category
      is_required
      sort_order
    }
  }
`;

export const DELETE_CHECKLIST_ITEM = gql`
  mutation DeleteChecklistItem($id: Int!) {
    deleteChecklistItem(id: $id)
  }
`;

export const REORDER_CHECKLIST_ITEMS = gql`
  mutation ReorderChecklistItems($templateId: Int!, $itemIds: [Int!]!) {
    reorderChecklistItems(templateId: $templateId, itemIds: $itemIds) {
      id
      sort_order
    }
  }
`;

export const GET_CHECKLIST_SUBMISSIONS = gql`
  query GetChecklistSubmissions($status: ChecklistSubmissionStatus) {
    checklistSubmissions(status: $status) {
      id
      status
      responses {
        itemId
        checked
        note
      }
      started_at
      completed_at
      template {
        id
        name
        aircraft_model
        items {
          id
          item_name
          category
          is_required
          sort_order
        }
      }
      reservation {
        id
      }
    }
  }
`;

export const GET_CHECKLIST_SUBMISSION = gql`
  query GetChecklistSubmission($id: Int!) {
    checklistSubmission(id: $id) {
      id
      status
      responses {
        itemId
        checked
        note
      }
      started_at
      completed_at
      template {
        id
        name
        description
        aircraft_model
        items {
          id
          item_name
          description
          category
          is_required
          sort_order
        }
      }
      reservation {
        id
      }
    }
  }
`;

export const GET_CHECKLIST_SUBMISSIONS_BY_RESERVATION = gql`
  query GetChecklistSubmissionsByReservation($reservationId: Int!) {
    checklistSubmissionsByReservation(reservationId: $reservationId) {
      id
      status
      responses {
        itemId
        checked
        note
      }
      started_at
      completed_at
      template {
        id
        name
        aircraft_model
      }
    }
  }
`;

export const START_CHECKLIST_SUBMISSION = gql`
  mutation StartChecklistSubmission($input: SubmitChecklistInput!) {
    startChecklistSubmission(submitChecklistInput: $input) {
      id
      status
      started_at
      template {
        id
        name
        aircraft_model
        items {
          id
          item_name
          description
          category
          is_required
          sort_order
        }
      }
    }
  }
`;

export const UPDATE_CHECKLIST_SUBMISSION = gql`
  mutation UpdateChecklistSubmission($input: UpdateChecklistSubmissionInput!) {
    updateChecklistSubmission(updateChecklistSubmissionInput: $input) {
      id
      status
      responses {
        itemId
        checked
        note
      }
    }
  }
`;

export const COMPLETE_CHECKLIST_SUBMISSION = gql`
  mutation CompleteChecklistSubmission($id: Int!) {
    completeChecklistSubmission(id: $id) {
      id
      status
      completed_at
    }
  }
`;
