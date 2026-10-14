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

// Corrects or renews a licence. Without new files, the documents already on it stay.
export const UPDATE_LICENSE = gql`
  mutation UpdateLicense($updateLicenseInput: UpdateLicenseInput!, $documents: [Upload!]) {
    updateLicense(updateLicenseInput: $updateLicenseInput, documents: $documents) {
      id
      license_type
      license_number
      issue_date
      expiration_date
      certification_authority
      status
      documents_url
    }
  }
`;

export const DELETE_LICENSE = gql`
  mutation DeleteLicense($id: Int!) {
    deleteLicense(id: $id)
  }
`;

const MY_LICENSE_FIELDS = `
  id
  license_type
  license_number
  issue_date
  expiration_date
  certification_authority
  status
  is_valid
  documents_url
`;

// The licences of the member signed in, whatever their status (pending ones included).
export const MY_LICENSES = gql`
  query MyLicenses {
    myLicenses {
      ${MY_LICENSE_FIELDS}
    }
  }
`;

// A member adds or changes one of their licences: it then waits for an administrator.
export const ADD_MY_LICENSE = gql`
  mutation AddMyLicense($input: AddMyLicenseInput!, $documents: [Upload!]) {
    addMyLicense(input: $input, documents: $documents) {
      ${MY_LICENSE_FIELDS}
    }
  }
`;

export const UPDATE_MY_LICENSE = gql`
  mutation UpdateMyLicense($input: UpdateMyLicenseInput!, $documents: [Upload!]) {
    updateMyLicense(input: $input, documents: $documents) {
      ${MY_LICENSE_FIELDS}
    }
  }
`;

export const VALIDATE_LICENSE = gql`
  mutation ValidateLicense($id: Int!) {
    validateLicense(id: $id) {
      id
      status
      is_valid
      expiration_date
    }
  }
`;

// Licences waiting for an administrator, with their holder (administrators only).
export const GET_PENDING_LICENSES = gql`
  query GetPendingLicenses {
    getAllLicenses {
      id
      license_type
      status
      user {
        id
        first_name
        last_name
      }
    }
  }
`;
