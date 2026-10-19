import { gql } from '@apollo/client';
import { AERODROME_SHEET_FIELDS, AIRSPACE_FIELDS, NAV_POINT_FIELDS } from './fragments/navplan';

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
      ...AirspaceFields
      geometry
    }
  }
  ${AIRSPACE_FIELDS}
`;

export const OBSTACLES_IN_BOX = gql`
  query ObstaclesInBox($bbox: BBoxInput!) {
    obstaclesInBox(bbox: $bbox) {
      ident
      type
      lat
      lon
      amslFt
      aglFt
      count
      lighting
    }
  }
`;

// The aerodrome sheet (AD 2 data of the SIA) of any aerodrome of the route.
export const AERODROME_DETAILS = gql`
  query AerodromeDetails($icao: String!) {
    aerodrome(icao: $icao) {
      point {
        ...NavPointFields
      }
      sheet {
        ...AerodromeSheetFields
      }
    }
  }
  ${NAV_POINT_FIELDS}
  ${AERODROME_SHEET_FIELDS}
`;
