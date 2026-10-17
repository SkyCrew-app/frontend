import { gql } from '@apollo/client';

// Fragments shared by the flight preparation documents. Kept out of src/graphql/*.ts:
// every document there is validated on its own, and a lone fragment is "never used".

export const NAV_POINT_FIELDS = gql`
  fragment NavPointFields on NavPoint {
    id
    type
    ident
    name
    lat
    lon
    elevationFt
    frequency
    aerodromeIcao
    mandatory
  }
`;


export const AIRCRAFT_PERFORMANCE_FIELDS = gql`
  fragment AircraftPerformanceFields on AircraftPerformance {
    aircraftId
    templateCode
    fuel {
      type
      densityKgPerL
      tanks {
        id
        label
        usableL
        unusableL
        armM
      }
      taxiFuelL
      burnOrder
    }
    climb {
      iasKt
      table {
        pressureAltFt
        timeMin
        fuelL
        distanceNm
      }
      seaLevelRateFpm
      ceilingRateFpm
      fuelFlowLph
    }
    cruise {
      normalSetting
      rows {
        pressureAltFt
        setting
        isaDeviationC
        tasKt
        fuelFlowLph
      }
    }
    descent {
      iasKt
      rateFpm
      fuelFlowLph
    }
    reserve {
      holdingFuelFlowLph
      maxContinuousFuelFlowLph
    }
    arrivalFuelL
    serviceCeilingFt
    calibration {
      iasKt
      casKt
    }
    source
    validatedAt
    validatedBy
  }
`;


export const AIRCRAFT_MASS_BALANCE_FIELDS = gql`
  fragment AircraftMassBalanceFields on AircraftMassBalance {
    aircraftId
    emptyMassKg
    emptyArmM
    weighingDate
    weighingRef
    mtowKg
    mlwKg
    mzfwKg
    stations {
      id
      label
      kind
      armM
      maxKg
      tankId
    }
    combinedLimits {
      stationIds
      maxKg
      label
    }
    envelopes {
      category
      points {
        armM
        massKg
      }
    }
    validatedAt
    validatedBy
  }
`;


export const LEG_FIELDS = gql`
  fragment LegFields on Leg {
    index
    from {
      ...NavPointFields
    }
    to {
      ...NavPointFields
    }
    distanceNm
    trueCourseDeg
    variationDeg
    magneticCourseDeg
    wind {
      directionDeg
      speedKt
      temperatureC
      source
      validAt
    }
    windCorrectionDeg
    trueHeadingDeg
    magneticHeadingDeg
    tasKt
    groundSpeedKt
    altitudeFt
    suggestedAltitudeFt
    segments {
      phase
      fromNm
      toNm
      startAltFt
      endAltFt
      tasKt
      gsKt
      timeMin
      fuelL
    }
    timeMin
    cumulativeTimeMin
    eta
    fuelL
    fuelRemainingL
    crossings {
      airspace {
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
        frequencies {
          service
          callsign
          mhz
        }
        remarks
      }
      entryNm
      exitNm
      aircraftMinAltFt
      aircraftMaxAltFt
      relation
      status
      requirement
      activityKnown
    }
  }
  ${NAV_POINT_FIELDS}
`;

const MASS_BALANCE_STATE = `
  massKg
  momentKgm
  cgM
  withinEnvelope
  marginKg
  marginCgMm
`;

export const FLIGHT_PLAN_RESULT_FIELDS = gql`
  fragment FlightPlanResultFields on FlightPlanResult {
    legs {
      ...LegFields
    }
    alternateLeg {
      ...LegFields
    }
    profile {
      distanceNm
      altitudeFt
      label
    }
    totalDistanceNm
    totalTimeMin
    fuel {
      reserveCase
      taxiL
      tripL
      contingencyL
      alternateL
      finalReserveL
      finalReserveMin
      clubMarginL
      minimumBlockL
      loadedL
      extraL
      landingL
      landingAtAlternateL
      usableL
      enduranceMin
      status
      messages
    }
    massBalance {
      lines {
        stationId
        label
        massKg
        armM
        momentKgm
      }
      takeoff {${MASS_BALANCE_STATE}}
      landing {${MASS_BALANCE_STATE}}
      zeroFuel {${MASS_BALANCE_STATE}}
      envelope {
        category
        points {
          armM
          massKg
        }
      }
      status
      messages
    }
    weather {
      icao
      metar
      taf
      observedAt
      tafValidFrom
      tafValidTo
    }
    windSource
    navdata {
      airac
      effectiveFrom
      effectiveTo
      stale
      source
    }
    engineVersion
    status
    notices {
      code
      status
      message
    }
    unverifiedAirspaces {
      airspace {
        id
        name
        type
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
        outlineKnown
      }
      distanceNm
      status
      message
    }
    encodedPolyline
    qnhHpa
    qnhSource
    qnhStation
    qnhObservedAt
    daylight {
      night
      nightFrom
      aerodromes {
        icao
        role
        at
        date
        civilDawn
        sunrise
        sunset
        civilDusk
      }
    }
  }
  ${LEG_FIELDS}
`;
