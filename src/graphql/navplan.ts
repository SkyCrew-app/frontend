import { gql } from '@apollo/client';
import { FLIGHT_PLAN_RESULT_FIELDS } from './fragments/navplan';

// The flight plan computed by the API: the browser only displays it (design § 2.1).

export const COMPUTE_FLIGHT_PLAN = gql`
  query ComputeFlightPlan($input: FlightPlanInput!) {
    computeFlightPlan(input: $input) {
      ...FlightPlanResultFields
    }
  }
  ${FLIGHT_PLAN_RESULT_FIELDS}
`;

export const FLIGHT_PLAN = gql`
  query FlightPlan($id: Int!) {
    flightPlan(id: $id) {
      id
      flightId
      input
      createdAt
      updatedAt
      result {
        ...FlightPlanResultFields
      }
    }
  }
  ${FLIGHT_PLAN_RESULT_FIELDS}
`;

export const FLIGHT_PLAN_BY_FLIGHT = gql`
  query FlightPlanByFlight($flightId: Int!) {
    flightPlanByFlight(flightId: $flightId) {
      id
      flightId
      input
      createdAt
      updatedAt
      result {
        ...FlightPlanResultFields
      }
    }
  }
  ${FLIGHT_PLAN_RESULT_FIELDS}
`;

export const SAVE_FLIGHT_PLAN = gql`
  mutation SaveFlightPlan($input: FlightPlanInput!, $flightPlanId: Int) {
    saveFlightPlan(input: $input, flightPlanId: $flightPlanId) {
      id
      flightId
    }
  }
`;

export const EXPORT_FLIGHT_PLAN_PDF = gql`
  mutation ExportFlightPlanPdf($flightPlanId: Int!, $format: PdfFormat!) {
    exportFlightPlanPdf(flightPlanId: $flightPlanId, format: $format)
  }
`;
