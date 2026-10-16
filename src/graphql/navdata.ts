import { gql } from '@apollo/client';
import { NAV_POINT_FIELDS } from './fragments/navplan';

// Aeronautical data served by the API from the imported AIRAC cycle (SIA, OurAirports).
// Nothing is asked to a third party from the browser.

export const NAVDATA_INFO = gql`
  query NavdataInfo {
    navdataInfo {
      airac
      effectiveFrom
      effectiveTo
      stale
      source
    }
  }
`;

export const NAV_SEARCH = gql`
  query NavSearch($query: String!, $types: [NavPointType!], $near: LatLonInput, $limit: Int) {
    navSearch(query: $query, types: $types, near: $near, limit: $limit) {
      ...NavPointFields
    }
  }
  ${NAV_POINT_FIELDS}
`;

export const NAV_POINTS_IN_BOX = gql`
  query NavPointsInBox($bbox: BBoxInput!, $types: [NavPointType!]) {
    navPointsInBox(bbox: $bbox, types: $types) {
      ...NavPointFields
    }
  }
  ${NAV_POINT_FIELDS}
`;

export const AIRSPACES_IN_BOX = gql`
  query AirspacesInBox($bbox: BBoxInput!, $maxFloorFt: Int) {
    airspacesInBox(bbox: $bbox, maxFloorFt: $maxFloorFt) {
      id
      name
      type
      icaoClass
      floor {
        ref
        value
        label
      }
      ceiling {
        ref
        value
        label
      }
      activity
      geometry
    }
  }
`;

export const AERODROME_DETAILS = gql`
  query AerodromeDetails($icao: String!) {
    aerodrome(icao: $icao) {
      point {
        ...NavPointFields
      }
      runways {
        designator
        trueHeadingDeg
        lengthM
        widthM
        surface
      }
      frequencies {
        service
        callsign
        mhz
      }
      circuitHeightFt
    }
  }
  ${NAV_POINT_FIELDS}
`;
