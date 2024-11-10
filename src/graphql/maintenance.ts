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