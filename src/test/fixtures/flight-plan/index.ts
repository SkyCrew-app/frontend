import type {
  AircraftMassBalance,
  AircraftPerformance,
  Airspace,
  FlightPlan,
  FlightPlanResult,
  FlightPlanningSettings,
  Leg,
  NavdataInfo,
  NavPoint,
} from "@/lib/navplan/types"

// Mock answers of the flight preparation API, shaped like the contract (design § 3.2). The aircraft
// is the fictitious "F-TEST" of design § 4.5 and the fuel figures those of § 4.6, case 1: they are
// not those of a real aircraft. Used by the jest tests and the screen previews until the API runs.

export const LFPN: NavPoint = { id: "ap-lfpn", type: "AERODROME", ident: "LFPN", name: "Toussus-le-Noble", lat: 48.7519, lon: 2.1061, elevationFt: 538, frequency: null, aerodromeIcao: null, mandatory: null }
export const LFOC: NavPoint = { id: "ap-lfoc", type: "AERODROME", ident: "LFOC", name: "Châteaudun", lat: 48.0581, lon: 1.3762, elevationFt: 433, frequency: null, aerodromeIcao: null, mandatory: null }
export const LFOT: NavPoint = { id: "ap-lfot", type: "AERODROME", ident: "LFOT", name: "Tours Val de Loire", lat: 47.4322, lon: 0.7276, elevationFt: 357, frequency: null, aerodromeIcao: null, mandatory: null }
export const RBT: NavPoint = { id: "nav-rbt", type: "VOR_DME", ident: "RBT", name: "Rambouillet", lat: 48.6544, lon: 1.9978, elevationFt: null, frequency: "114.70", aerodromeIcao: null, mandatory: null }
export const P1: NavPoint = { id: "USER:48.42,1.62", type: "USER", ident: "P1", name: "P1", lat: 48.42, lon: 1.62, elevationFt: null, frequency: null, aerodromeIcao: null, mandatory: null }

export const NAVDATA: NavdataInfo = {
  airac: "2610",
  effectiveFrom: "2026-10-01T00:00:00.000Z",
  effectiveTo: "2026-10-29T00:00:00.000Z",
  stale: false,
  source: "SIA – données originales téléchargées sur https://www.sia.aviation-civile.gouv.fr, mise à jour du 2026-09-03",
}

const limit = (ref: "SFC" | "AMSL" | "FL" | "AGL", value: number, label: string) => ({ ref, value, label })

export const TMA_PARIS: Airspace = {
  id: "as-tma-paris-1",
  name: "TMA PARIS 1",
  type: "TMA",
  icaoClass: "D",
  floor: limit("AMSL", 1500, "1500 ft AMSL"),
  ceiling: limit("FL", 65, "FL065"),
  activity: "H24",
  frequencies: [{ service: "APP", callsign: "Paris Approche", mhz: "119.850" }],
  remarks: null,
  geometry: { type: "MultiPolygon", coordinates: [[[[1.9, 48.5], [2.4, 48.5], [2.4, 48.9], [1.9, 48.9], [1.9, 48.5]]]] },
}

export const R_ZONE: Airspace = {
  id: "as-r-45a",
  name: "R 45 A",
  type: "R",
  icaoClass: null,
  floor: limit("SFC", 0, "SFC"),
  ceiling: limit("AMSL", 3000, "3000 ft AMSL"),
  activity: null,
  frequencies: [],
  remarks: "Activité publiée par NOTAM",
  geometry: { type: "MultiPolygon", coordinates: [[[[1.4, 48.2], [1.7, 48.2], [1.7, 48.35], [1.4, 48.35], [1.4, 48.2]]]] },
}

const leg = (overrides: Partial<Leg> & Pick<Leg, "index" | "from" | "to">): Leg => ({
  distanceNm: 20,
  trueCourseDeg: 220,
  variationDeg: 2,
  magneticCourseDeg: 218,
  wind: { directionDeg: 270, speedKt: 15, temperatureC: 8, source: "MODEL", validAt: "2026-10-17T09:00:00.000Z" },
  windCorrectionDeg: -7,
  trueHeadingDeg: 213,
  magneticHeadingDeg: 211,
  tasKt: 105,
  groundSpeedKt: 95,
  altitudeFt: 2500,
  suggestedAltitudeFt: null,
  segments: [{ phase: "CRUISE", fromNm: 0, toNm: 20, startAltFt: 2500, endAltFt: 2500, tasKt: 105, gsKt: 95, timeMin: 12.6, fuelL: 5.9 }],
  timeMin: 12.6,
  cumulativeTimeMin: 12.6,
  eta: "2026-10-17T09:12:36.000Z",
  fuelL: 5.9,
  fuelRemainingL: 71.1,
  crossings: [],
  ...overrides,
})

export const RESULT: FlightPlanResult = {
  legs: [
    leg({
      index: 0,
      from: LFPN,
      to: RBT,
      distanceNm: 5.2,
      trueCourseDeg: 235.4,
      magneticCourseDeg: 233.4,
      windCorrectionDeg: -8.1,
      trueHeadingDeg: 227.3,
      magneticHeadingDeg: 225.3,
      groundSpeedKt: 88,
      timeMin: 4.2,
      cumulativeTimeMin: 4.2,
      eta: "2026-10-17T09:07:12.000Z",
      fuelL: 2.4,
      fuelRemainingL: 74.6,
      segments: [
        { phase: "CLIMB", fromNm: 0, toNm: 3.9, startAltFt: 538, endAltFt: 2500, tasKt: 78, gsKt: 70, timeMin: 3.3, fuelL: 1.9 },
        { phase: "CRUISE", fromNm: 3.9, toNm: 5.2, startAltFt: 2500, endAltFt: 2500, tasKt: 105, gsKt: 95, timeMin: 0.9, fuelL: 0.5 },
      ],
      crossings: [
        {
          airspace: TMA_PARIS,
          entryNm: 0,
          exitNm: 5.2,
          aircraftMinAltFt: 538,
          aircraftMaxAltFt: 2500,
          relation: "INSIDE",
          status: "WARNING",
          requirement: "Clairance requise — contacter Paris Approche 119.850.",
          activityKnown: true,
        },
      ],
    }),
    leg({
      index: 1,
      from: RBT,
      to: P1,
      distanceNm: 17.3,
      trueCourseDeg: 224.6,
      magneticCourseDeg: 222.6,
      windCorrectionDeg: -7.4,
      magneticHeadingDeg: 215.2,
      trueHeadingDeg: 217.2,
      timeMin: 10.9,
      cumulativeTimeMin: 15.1,
      eta: "2026-10-17T09:18:06.000Z",
      fuelL: 5.1,
      fuelRemainingL: 69.5,
      suggestedAltitudeFt: null,
      crossings: [
        {
          airspace: R_ZONE,
          entryNm: 12.1,
          exitNm: 17.3,
          aircraftMinAltFt: 2500,
          aircraftMaxAltFt: 2500,
          relation: "INSIDE",
          status: "WARNING",
          requirement: "Zone réglementée : pénétration soumise à conditions. Activité : inconnue — vérifier le NOTAM, le SUP AIP et, pour le RTBA, l'activité AZBA du jour.",
          activityKnown: false,
        },
        {
          airspace: { ...TMA_PARIS, id: "as-tma-paris-2", name: "TMA PARIS 2", floor: limit("AMSL", 3500, "3500 ft AMSL") },
          entryNm: 0,
          exitNm: 6,
          aircraftMinAltFt: 2500,
          aircraftMaxAltFt: 2500,
          relation: "BELOW",
          status: "OK",
          requirement: "",
          activityKnown: true,
        },
      ],
    }),
    leg({
      index: 2,
      from: P1,
      to: LFOC,
      distanceNm: 22.9,
      trueCourseDeg: 204.3,
      magneticCourseDeg: 202.4,
      windCorrectionDeg: -8.6,
      trueHeadingDeg: 195.7,
      magneticHeadingDeg: 193.8,
      groundSpeedKt: 98,
      timeMin: 14.5,
      cumulativeTimeMin: 29.6,
      eta: "2026-10-17T09:32:36.000Z",
      fuelL: 6.3,
      fuelRemainingL: 63.2,
      segments: [
        { phase: "CRUISE", fromNm: 0, toNm: 15.4, startAltFt: 2500, endAltFt: 2500, tasKt: 105, gsKt: 98, timeMin: 9.4, fuelL: 4.4 },
        { phase: "DESCENT", fromNm: 15.4, toNm: 22.9, startAltFt: 2500, endAltFt: 1433, tasKt: 100, gsKt: 93, timeMin: 5.1, fuelL: 1.9 },
      ],
    }),
  ],
  alternateLeg: leg({
    index: 3,
    from: LFOC,
    to: LFOT,
    distanceNm: 44.1,
    trueCourseDeg: 214.8,
    magneticCourseDeg: 212.9,
    windCorrectionDeg: -8,
    trueHeadingDeg: 206.8,
    magneticHeadingDeg: 204.9,
    groundSpeedKt: 96,
    timeMin: 27.6,
    cumulativeTimeMin: 57.2,
    eta: "2026-10-17T10:00:12.000Z",
    fuelL: 12.9,
    fuelRemainingL: 50.3,
  }),
  profile: [
    { distanceNm: 0, altitudeFt: 538, label: "LFPN" },
    { distanceNm: 3.9, altitudeFt: 2500, label: "TOC" },
    { distanceNm: 37.9, altitudeFt: 2500, label: "TOD" },
    { distanceNm: 45.4, altitudeFt: 1433, label: "LFOC" },
  ],
  totalDistanceNm: 45.4,
  totalTimeMin: 29.6,
  fuel: {
    taxiL: 3,
    tripL: 13.8,
    contingencyL: 0,
    alternateL: 12.9,
    finalReserveL: 12,
    finalReserveMin: 30,
    clubMarginL: 0,
    minimumBlockL: 41.7,
    loadedL: 80,
    extraL: 38.3,
    landingL: 63.2,
    landingAtAlternateL: 50.3,
    usableL: 107,
    enduranceMin: 165,
    status: "OK",
    messages: [],
  },
  massBalance: {
    lines: [
      { stationId: "empty", label: "Avion à vide", massKg: 560, armM: 0.335, momentKgm: 187.6 },
      { stationId: "front", label: "Sièges avant", massKg: 160, armM: 0.41, momentKgm: 65.6 },
      { stationId: "rear", label: "Sièges arrière", massKg: 75, armM: 1.19, momentKgm: 89.25 },
      { stationId: "baggage", label: "Bagages", massKg: 10, armM: 1.9, momentKgm: 19 },
      { stationId: "fuel-main", label: "Carburant (80 L)", massKg: 57.6, armM: 1.12, momentKgm: 64.512 },
    ],
    takeoff: { massKg: 862.6, momentKgm: 425.962, cgM: 0.4938, withinEnvelope: true, marginKg: 37.4, marginCgMm: 70.2 },
    landing: { massKg: 833.8, momentKgm: 393.706, cgM: 0.4722, withinEnvelope: true, marginKg: 66.2, marginCgMm: 91.8 },
    zeroFuel: { massKg: 805, momentKgm: 361.45, cgM: 0.449, withinEnvelope: true, marginKg: 95, marginCgMm: 115 },
    envelope: {
      category: "NORMAL",
      points: [
        { armM: 0.205, massKg: 550 },
        { armM: 0.205, massKg: 780 },
        { armM: 0.427, massKg: 900 },
        { armM: 0.564, massKg: 900 },
        { armM: 0.564, massKg: 550 },
      ],
    },
    status: "OK",
    messages: [],
  },
  weather: [
    {
      icao: "LFPN",
      metar: "LFPN 170830Z 27012KT 9999 FEW030 12/06 Q1018 NOSIG",
      taf: "TAF LFPN 170500Z 1706/1715 26010KT 9999 SCT035\n  TEMPO 1709/1713 27015G25KT",
      observedAt: "2026-10-17T08:30:00.000Z",
    },
    { icao: "LFOC", metar: "LFOC 170830Z AUTO 26010KT 9999 NCD 13/07 Q1019", taf: null, observedAt: "2026-10-17T08:30:00.000Z" },
    { icao: "LFOT", metar: "LFOT 170830Z 25008KT CAVOK 14/07 Q1020", taf: "TAF LFOT 170500Z 1706/1715 25008KT CAVOK", observedAt: "2026-10-17T08:30:00.000Z" },
  ],
  windSource: "DWD ICON-EU, run 2026-10-17T06Z (CC BY 4.0)",
  navdata: NAVDATA,
  engineVersion: "navplan-1.0.0",
  status: "WARNING",
  notices: [
    { code: "QNH_DEFAULTED", status: "WARNING", message: "QNH du METAR de LFPN utilisé : 1018 hPa." },
  ],
  encodedPolyline: "",
}

export const BLOCKING_RESULT: FlightPlanResult = {
  ...RESULT,
  status: "BLOCKING",
  fuel: { ...RESULT.fuel, loadedL: 50, extraL: -2.3, landingL: 9.7, status: "BLOCKING", messages: ["Carburant insuffisant : il manque 2,3 L.", "Atterrissage prévu avec 9,7 L, sous la réserve finale de 12,0 L."] },
  massBalance: {
    ...RESULT.massBalance,
    takeoff: { massKg: 1009.2, momentKgm: 612.4, cgM: 0.6068, withinEnvelope: false, marginKg: -9.2, marginCgMm: -42.8 },
    landing: { massKg: 980.4, momentKgm: 580.2, cgM: 0.5918, withinEnvelope: false, marginKg: -80.4, marginCgMm: -27.8 },
    status: "BLOCKING",
    messages: ["Masse au décollage 1 009,2 kg > masse maximale 1 000 kg.", "Centrage arrière hors limites : 0,6068 m > 0,564 m."],
  },
  notices: [{ code: "PERF_NOT_VALIDATED", status: "WARNING", message: "Performances de F-TEST non validées par un administrateur." }],
}

export const PERFORMANCE: AircraftPerformance = {
  aircraftId: 7,
  templateCode: "TEST",
  fuel: {
    type: "AVGAS_100LL",
    densityKgPerL: 0.72,
    tanks: [{ id: "main", label: "Réservoir principal", usableL: 107, unusableL: 3, armM: 1.12 }],
    taxiFuelL: 3,
    burnOrder: [],
  },
  climb: {
    iasKt: 70,
    table: [
      { pressureAltFt: 0, timeMin: 0, fuelL: 0, distanceNm: 0 },
      { pressureAltFt: 2000, timeMin: 3, fuelL: 1.9, distanceNm: 4 },
      { pressureAltFt: 4000, timeMin: 6.5, fuelL: 3.9, distanceNm: 8 },
      { pressureAltFt: 6000, timeMin: 10.5, fuelL: 6.2, distanceNm: 13 },
    ],
    seaLevelRateFpm: null,
    ceilingRateFpm: null,
    fuelFlowLph: null,
  },
  cruise: {
    normalSetting: "2400 tr/min",
    rows: [
      { pressureAltFt: 2000, setting: "2400 tr/min", isaDeviationC: 0, tasKt: 105, fuelFlowLph: 28 },
      { pressureAltFt: 4000, setting: "2400 tr/min", isaDeviationC: 0, tasKt: 107, fuelFlowLph: 27 },
      { pressureAltFt: 2000, setting: "2200 tr/min", isaDeviationC: 0, tasKt: 96, fuelFlowLph: 24 },
    ],
  },
  descent: { iasKt: 100, rateFpm: 500, fuelFlowLph: 22 },
  reserve: { holdingFuelFlowLph: 24, maxContinuousFuelFlowLph: 34 },
  arrivalFuelL: 0,
  serviceCeilingFt: 13000,
  calibration: [],
  source: "Avion d'essai fictif (document de conception § 4.5)",
  validatedAt: "2026-10-10T14:00:00.000Z",
  validatedBy: "Admin Démo",
}

export const MASS_BALANCE: AircraftMassBalance = {
  aircraftId: 7,
  emptyMassKg: 560,
  emptyArmM: 0.335,
  weighingDate: "2026-03-12T00:00:00.000Z",
  weighingRef: "Pesée 2026-03",
  mtowKg: 1000,
  mlwKg: 1000,
  mzfwKg: null,
  stations: [
    { id: "front", label: "Sièges avant", kind: "SEAT", armM: 0.41, maxKg: null, tankId: null },
    { id: "rear", label: "Sièges arrière", kind: "SEAT", armM: 1.19, maxKg: null, tankId: null },
    { id: "baggage", label: "Bagages", kind: "BAGGAGE", armM: 1.9, maxKg: 60, tankId: null },
    { id: "fuel-main", label: "Carburant", kind: "FUEL", armM: 1.12, maxKg: null, tankId: "main" },
  ],
  combinedLimits: [],
  envelopes: [RESULT.massBalance.envelope],
  validatedAt: "2026-10-10T14:00:00.000Z",
  validatedBy: "Admin Démo",
}

export const SETTINGS: FlightPlanningSettings = {
  reserveVfrDayLocalMin: 10,
  reserveVfrDayMin: 30,
  reserveVfrNightMin: 45,
  contingencyPercent: 0,
  contingencyMinL: 0,
  alternateRequiredVfr: false,
  clubMarginMin: 0,
  verticalMarginFt: 300,
  defaultCircuitHeightFt: 1000,
}

export const SAVED_PLAN: FlightPlan = {
  id: 41,
  flightId: 120,
  input: {
    aircraftId: 7,
    reservationId: 55,
    departureTime: "2026-10-17T09:00:00.000Z",
    departure: { navPointId: LFPN.id },
    destination: { navPointId: LFOC.id },
    alternate: { navPointId: LFOT.id },
    waypoints: [{ navPointId: RBT.id }, { lat: P1.lat, lon: P1.lon, name: "P1" }],
    legs: [{ altitudeFt: 2500 }, { altitudeFt: 2500 }, { altitudeFt: 2500 }],
    reserveCase: "VFR_DAY",
    qnhHpa: null,
    loads: [
      { stationId: "front", massKg: 160 },
      { stationId: "rear", massKg: 75 },
      { stationId: "baggage", massKg: 10 },
    ],
    fuel: [{ tankId: "main", liters: 80 }],
    envelopeCategory: "NORMAL",
    extraFuelNote: null,
  },
  result: RESULT,
  createdAt: "2026-10-16T18:00:00.000Z",
  updatedAt: "2026-10-16T18:05:00.000Z",
}

// GraphQL type of each object, by the field that holds it: what the API adds as __typename and
// what Apollo needs to match the fragments of the documents (src/graphql/fragments/navplan.ts).
const TYPENAMES: Record<string, string> = {
  result: "FlightPlanResult",
  legs: "Leg",
  alternateLeg: "Leg",
  from: "NavPoint",
  to: "NavPoint",
  wind: "Wind",
  segments: "PhaseSegment",
  crossings: "AirspaceCrossing",
  airspace: "Airspace",
  floor: "AltitudeLimit",
  ceiling: "AltitudeLimit",
  frequencies: "RadioFrequency",
  profile: "ProfilePoint",
  fuel: "FuelPlan",
  massBalance: "MassBalanceResult",
  lines: "MassBalanceLine",
  takeoff: "MassBalanceState",
  landing: "MassBalanceState",
  zeroFuel: "MassBalanceState",
  envelope: "Envelope",
  points: "EnvelopePoint",
  weather: "WeatherReport",
  navdata: "NavdataInfo",
  notices: "Notice",
}

const annotate = (value: unknown, typename?: string): unknown => {
  if (Array.isArray(value)) return value.map((item) => annotate(item, typename))
  if (value === null || typeof value !== "object") return value
  const entries = Object.entries(value).map(([key, item]) =>
    // The saved input is a JSON scalar: returned as it is, without types.
    key === "input" || key === "geometry" ? [key, item] : [key, annotate(item, TYPENAMES[key])],
  )
  return { ...Object.fromEntries(entries), ...(typename ? { __typename: typename } : {}) }
}

/** A FlightPlan (or FlightPlanResult) as the API returns it, with its __typename fields. */
export const asApiPlan = (plan: FlightPlan) => annotate(plan, "FlightPlan")
export const asApiResult = (result: FlightPlanResult) => annotate(result, "FlightPlanResult")
