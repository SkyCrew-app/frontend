import { gql } from '@apollo/client';

export const CREATE_LICENSE = gql`
  mutation CreateLicense($createLicenseInput: CreateLicenseInput!, $documents: [Upload!]) {
    createLicense(createLicenseInput: $createLicenseInput, documents: $documents) {
      id
      user {
        id
      }
      license_type
      issue_date
      expiration_date
      certification_authority
      status
      documents_url
    }
  }
`;
