import { gql } from '@apollo/client';

export const UPDATE_ADMINISTRATION = gql`
  mutation UpdateAdministration($input: UpdateAdministrationInput!) {
    updateAdministration(updateAdministrationInput: $input) {
      id
      clubName
    }
  }
`;

export const GET_ADMINISTRATION = gql`
  query GetAllAdministrations {
    getAllAdministrations {
      id
      clubName
      contactEmail
      contactPhone
      address
      closureDays
      timeSlotDuration
      reservationStartTime
      reservationEndTime
      maintenanceDay
      maintenanceDuration
      pilotLicenses
      membershipFee
      flightHourRate
      clubRules
      allowGuestPilots
      guestPilotFee
      fuelManagement
      isMaintenanceActive
      maintenanceMessage
      maintenanceTime
    }
  }
`;

export const GET_SETTINGS = gql`
  query GetAllAdministrations {
    getAllAdministrations {
      closureDays
      reservationStartTime
      reservationEndTime
    }
  }
`;