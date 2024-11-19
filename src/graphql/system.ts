import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(loginInput: { email: $email, password: $password }) {
      access_token
      is2FAEnabled
    }
  }
`;

export const LOGOUT_MUTATION = gql`
mutation Logout {
  logout
}
`;