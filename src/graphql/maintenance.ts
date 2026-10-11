import { gql } from '@apollo/client';

export const GET_ALL_MAINTENANCES = gql`
  query GetAllMaintenances {
    getAllMaintenances {
      id
      start_date
      end_date
      maintenance_type
      description
      maintenance_cost
      images_url
      documents_url
      status
      aircraft {
        id
        registration_number
        model
      }
      technician {
        id
        first_name
        email
      }
    }
  }
`;

export const CREATE_MAINTENANCE = gql`
  mutation CreateMaintenance(
    $createMaintenanceInput: CreateMaintenanceInput!
    $files: [Upload!]
    $images: [Upload!]
  ) {
    createMaintenance(createMaintenanceInput: $createMaintenanceInput, files: $files, images: $images) {
      id
      start_date
      end_date
      maintenance_type
      description
      maintenance_cost
      images_url
      documents_url
      status
      aircraft {
        id
        registration_number
        model
      }
      technician {
        id
        first_name
        email
      }
    }
  }
`;

export const UPDATE_MAINTENANCE = gql`
  mutation UpdateMaintenance(
    $updateMaintenanceInput: UpdateMaintenanceInput!
    $files: [Upload!]
    $images: [Upload!]
  ) {
    updateMaintenance(updateMaintenanceInput: $updateMaintenanceInput, files: $files, images: $images) {
      id
      start_date
      end_date
      maintenance_type
      description
      maintenance_cost
      images_url
      documents_url
      status
      aircraft {
        id
        registration_number
        model
      }
      technician {
        id
        first_name
        email
      }
    }
  }
`;

export const DELETE_MAINTENANCE = gql`
  mutation DeleteMaintenance($id: Int!) {
    deleteMaintenance(id: $id)
  }
`;

// Removes one image or document of a maintenance; the others are kept.
export const REMOVE_MAINTENANCE_ATTACHMENT = gql`
  mutation RemoveMaintenanceAttachment($maintenanceId: Int!, $url: String!) {
    removeMaintenanceAttachment(maintenanceId: $maintenanceId, url: $url) {
      id
      images_url
      documents_url
    }
  }
`;
