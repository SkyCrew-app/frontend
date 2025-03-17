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
  mutation CreateMaintenance($maintenance: MaintenanceInput!) {
    createMaintenance(maintenance: $maintenance) {
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
  mutation UpdateMaintenance($updateMaintenanceInput: UpdateMaintenanceInput!) {
    updateMaintenance(updateMaintenanceInput: $updateMaintenanceInput) {
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