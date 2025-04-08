import { gql } from '@apollo/client';

export const CREATE_USER = gql`
  mutation CreateUser($first_name: String!, $last_name: String!, $email: String!, $date_of_birth: DateTime!) {
    createUser(first_name: $first_name, last_name: $last_name, email: $email, date_of_birth: $date_of_birth) {
      id
      first_name
      last_name
      email
      date_of_birth
    }
  }
`;

export const GET_USER_PROFILE = gql`
  query GetUserProfile($email: String!) {
    userByEmail(email: $email) {
      first_name
      last_name
      profile_picture
      user_account_balance
    }
  }
`;

export const CONFIRM_EMAIL_AND_SET_PASSWORD = gql`
  mutation ConfirmEmailAndSetPassword($validation_token: String!, $password: String!) {
    confirmEmailAndSetPassword(validation_token: $validation_token, password: $password){
      validation_token,
      password
    }
  }
`;

export const GET_EMAIL_QUERY = gql`
  query GetEmailFromCookie {
    getEmailFromCookie
  }
`;

export const GENERATE_2FA_SECRET_MUTATION = gql`
  mutation Generate2FASecret($email: String!) {
    generate2FASecret(email: $email)
  }
`;

export const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    userByEmail(email: $email) {
      id
      first_name
      last_name
      email
      phone_number
      address
      date_of_birth
      profile_picture
      total_flight_hours
      email_notifications_enabled
      sms_notifications_enabled
      role {
        id
        role_name
      }
      licenses {
        id
        certification_authority
        license_number
        license_type
        issue_date
        expiration_date
        is_valid
        status
      }
      language
      speed_unit
      distance_unit
      timezone
      preferred_aerodrome
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($updateUserInput: UpdateUserInput!, $image: Upload) {
    updateUser(updateUserInput: $updateUserInput, image: $image) {
      first_name
      last_name
      email
      phone_number
      address
      date_of_birth
      profile_picture
    }
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($currentPassword: String!, $newPassword: String!) {
    updatePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      id
      email
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    getUsers {
      id
      first_name
      last_name
      email
      phone_number
      date_of_birth
      is2FAEnabled
      isEmailConfirmed
      role {
        id
        role_name
      }
    }
  }
`;

export const GET_USER_DETAILS = gql`
  query GetUserDetails($id: Int!) {
    getUserDetails(id: $id) {
      id
      first_name
      last_name
      email
      phone_number
      address
      date_of_birth
      total_flight_hours
      user_account_balance
      reservations {
        id
        start_time
        end_time
        aircraft {
          registration_number
          model
        }
      }
      licenses {
        id
        certification_authority
        license_number
        license_type
        issue_date
        expiration_date
        documents_url
      }
      role {
        id
        role_name
      }
    }
  }
`;

export const VERIFY_2FA_SECRET = gql`
  mutation Verify2FA($email: String!, $token: String!) {
    verify2FA(email: $email, token: $token)
  }
`;

export const GET_ME = gql`
  query {
    me {
      id
      email
    }
  }
`;

export const UPDATE_USER_PREFERENCES = gql`
  mutation updateUserPreferences($userId: Float!, $preference: UpdateUserPreferencesInput!) {
    updateUserPreferences(userId: $userId, preference: $preference) {
      id
      language
      speed_unit
      distance_unit
      timezone
      preferred_aerodrome
    }
  }
`;