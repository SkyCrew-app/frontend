import { gql } from '@apollo/client';

export const CREATE_LICENSE = gql`
  mutation CreateLicense($license_type: String!, $expiration_date: DateTime!, $issue_date: DateTime!, $certification_authority: String!, $is_valid: Boolean!) {
    createLicense(license_type: $license_type, expiration_date: $expiration_date, issue_date: $issue_date, certification_authority: $certification_authority, is_valid: $is_valid) {
      id
      license_type
      issue_date
      expiry_date
    }
  }
`;