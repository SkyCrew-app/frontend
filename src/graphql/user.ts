import { gql } from '@apollo/client';

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
  mutation ConfirmEmailAndSetPassword($token: String!, $password: String!) {
    confirmEmailAndSetPassword(token: $token, password: $password)
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
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $first_name: String!,
    $last_name: String!,
    $email: String!,
    $phone_number: String!,
    $address: String!,
    $date_of_birth: DateTime!,
    $file: Upload
  ) {
    updateUser(
      updateUserInput: {
        first_name: $first_name,
        last_name: $last_name,
        email: $email,
        phone_number: $phone_number,
        address: $address,
        date_of_birth: $date_of_birth
      },
      image: $file
    ) {
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