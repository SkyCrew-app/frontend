import { gql } from '@apollo/client';

export const GET_LOGBOOK_ENTRIES = gql`
  query GetLogbookEntries($filter: LogbookFilterInput) {
    logbookEntries(filter: $filter) {
      id
      flight_hours
      flight_type
      origin_icao
      destination_icao
      remarks
      departure_time
      reservation {
        id
        aircraft {
          id
          registration_number
          model
        }
      }
    }
  }
`;

export const GET_LOGBOOK_STATS = gql`
  query GetLogbookStats($filter: LogbookFilterInput) {
    logbookStats(filter: $filter) {
      totalHours
      totalFlights
      hoursByModel {
        label
        hours
      }
      hoursByCategory {
        label
        hours
      }
      monthlyHours {
        month
        hours
      }
      averageFlightDuration
      longestFlight
      last30DaysHours
      last90DaysHours
    }
  }
`;

export const EXPORT_LOGBOOK_PDF = gql`
  mutation ExportLogbookPDF($filter: LogbookFilterInput) {
    exportLogbookPDF(filter: $filter)
  }
`;
