import { gql } from '@apollo/client';

export const GET_ROLES = gql`
  query GetRoles {
    roles {
      id
      role_name
    }
  }
`;

export const CREATE_ROLE = gql`
  mutation CreateRole($createRoleInput: CreateRoleInput!) {
    createRole(createRoleInput: $createRoleInput) {
      id
      role_name
    }
  }
`;

export const UPDATE_ROLE = gql`
  mutation updateRole($updateRoleInput: UpdateRoleInput!) {
    updateRole(updateRoleInput: $updateRoleInput) {
      id
      role_name
    }
  }
`;

export const DELETE_ROLE = gql`
  mutation DeleteRole($id: Int!) {
    deleteRole(id: $id)
  }
`;

