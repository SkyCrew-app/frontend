import { gql } from '@apollo/client';

// The plan of the club (set by the installation): what it includes and how
// many aircraft and members it allows.
export const GET_PLAN = gql`
  query GetPlan {
    plan {
      plan
      features
      maxAircraft
      aircraftInService
      maxMembers
      activeMembers
    }
  }
`;
