import { gql } from '@apollo/client';
import { AIRCRAFT_MASS_BALANCE_FIELDS, AIRCRAFT_PERFORMANCE_FIELDS } from './fragments/navplan';

// Performance and mass & balance of each aircraft (from its flight manual and weighing report),
// and the fuel policy of the club. Written by administrators, read by every member.

export const AIRCRAFT_FLIGHT_DATA = gql`
  query AircraftFlightData($aircraftId: Int!) {
    aircraftPerformance(aircraftId: $aircraftId) {
      ...AircraftPerformanceFields
    }
    aircraftMassBalance(aircraftId: $aircraftId) {
      ...AircraftMassBalanceFields
    }
  }
  ${AIRCRAFT_PERFORMANCE_FIELDS}
  ${AIRCRAFT_MASS_BALANCE_FIELDS}
`;

export const AIRCRAFT_TYPE_TEMPLATES = gql`
  query AircraftTypeTemplates {
    aircraftTypeTemplates {
      code
      label
      source
    }
  }
`;

export const APPLY_AIRCRAFT_TEMPLATE = gql`
  mutation ApplyAircraftTemplate($aircraftId: Int!, $templateCode: String!) {
    applyAircraftTemplate(aircraftId: $aircraftId, templateCode: $templateCode) {
      ...AircraftPerformanceFields
    }
  }
  ${AIRCRAFT_PERFORMANCE_FIELDS}
`;

export const SAVE_AIRCRAFT_PERFORMANCE = gql`
  mutation SaveAircraftPerformance($aircraftId: Int!, $input: AircraftPerformanceInput!) {
    saveAircraftPerformance(aircraftId: $aircraftId, input: $input) {
      ...AircraftPerformanceFields
    }
  }
  ${AIRCRAFT_PERFORMANCE_FIELDS}
`;

export const SAVE_AIRCRAFT_MASS_BALANCE = gql`
  mutation SaveAircraftMassBalance($aircraftId: Int!, $input: AircraftMassBalanceInput!) {
    saveAircraftMassBalance(aircraftId: $aircraftId, input: $input) {
      ...AircraftMassBalanceFields
    }
  }
  ${AIRCRAFT_MASS_BALANCE_FIELDS}
`;

export const VALIDATE_AIRCRAFT_DATA = gql`
  mutation ValidateAircraftData($aircraftId: Int!) {
    validateAircraftData(aircraftId: $aircraftId)
  }
`;

export const FLIGHT_PLANNING_SETTINGS = gql`
  query FlightPlanningSettings {
    flightPlanningSettings {
      reserveVfrDayLocalMin
      reserveVfrDayMin
      reserveVfrNightMin
      contingencyPercent
      contingencyMinL
      alternateRequiredVfr
      clubMarginMin
      verticalMarginFt
      defaultCircuitHeightFt
      msaCorridorNm
      msaMarginFt
      takeoffSafetyFactor
      landingSafetyFactor
    }
  }
`;

export const SAVE_FLIGHT_PLANNING_SETTINGS = gql`
  mutation SaveFlightPlanningSettings($input: FlightPlanningSettingsInput!) {
    saveFlightPlanningSettings(input: $input) {
      reserveVfrDayLocalMin
      reserveVfrDayMin
      reserveVfrNightMin
      contingencyPercent
      contingencyMinL
      alternateRequiredVfr
      clubMarginMin
      verticalMarginFt
      defaultCircuitHeightFt
      msaCorridorNm
      msaMarginFt
      takeoffSafetyFactor
      landingSafetyFactor
    }
  }
`;
