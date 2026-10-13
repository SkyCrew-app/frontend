import { gql } from '@apollo/client';

// Aerodrome directory and weather. The API asks the provider itself: no key
// of that provider is ever present in the browser.
export const AERODROME_BY_ICAO = gql`
  query AerodromeByIcao($icao: String!) {
    aerodromeByIcao(icao: $icao) {
      icao
      iata
      name
      latitude
      longitude
      timezone
    }
  }
`;

export const AERODROME_BY_IATA = gql`
  query AerodromeByIata($iata: String!) {
    aerodromeByIata(iata: $iata) {
      icao
      iata
      name
      latitude
      longitude
      timezone
    }
  }
`;

export const SEARCH_AERODROMES = gql`
  query SearchAerodromes($query: String!) {
    searchAerodromes(query: $query) {
      icao
      iata
      name
    }
  }
`;

export const WEATHER_AT = gql`
  query WeatherAt($latitude: Float!, $longitude: Float!) {
    weatherAt(latitude: $latitude, longitude: $longitude) {
      temperature
      feelsLike
      humidity
      cloudCover
      windSpeedKmh
      windDegrees
      sunrise
      sunset
    }
  }
`;
