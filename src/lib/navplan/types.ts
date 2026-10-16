// Types of the flight preparation API (design § 3.2, mirrored in src/graphql/schema.graphql).
// Internal units everywhere: NM, kt, ft, litres, kg, metres, degrees.

export type NavPointType = "AERODROME" | "VOR" | "VOR_DME" | "NDB" | "DME" | "TACAN" | "VRP" | "USER"
export type AirspaceType =
  | "P"
  | "R"
  | "D"
  | "CTR"
  | "TMA"
  | "CTA"
  | "SIV"
  | "RMZ"
  | "TMZ"
  | "TRA"
  | "TSA"
  | "PROTECTED"
  | "GLIDING"
  | "OTHER"
export type AltitudeRef = "SFC" | "AGL" | "AMSL" | "FL"
export type FuelType = "AVGAS_100LL" | "UL91" | "JET_A1" | "MOGAS"
export type StationKind = "SEAT" | "BAGGAGE" | "FUEL" | "OTHER"
export type EnvelopeCategory = "NORMAL" | "UTILITY" | "AEROBATIC"
export type FlightPhase = "CLIMB" | "CRUISE" | "DESCENT"
export type CheckStatus = "OK" | "WARNING" | "BLOCKING"
export type AirspaceRelation = "INSIDE" | "NEAR_FLOOR" | "NEAR_CEILING" | "UNKNOWN_VERTICAL" | "BELOW" | "ABOVE"
export type ReserveCase = "VFR_DAY_LOCAL" | "VFR_DAY" | "VFR_NIGHT"
export type DataSourceKind = "METAR" | "TAF" | "MODEL" | "PILOT" | "NONE"
export type PdfFormat = "A4" | "A5"

export interface NavdataInfo {
  airac: string
  effectiveFrom: string
  effectiveTo: string
  stale: boolean
  source: string
}

export interface AltitudeLimit {
  ref: AltitudeRef
  value: number
  label: string
}

export interface NavPoint {
  id: string
  type: NavPointType
  ident: string
  name?: string | null
  lat: number
  lon: number
  elevationFt?: number | null
  frequency?: string | null
  aerodromeIcao?: string | null
  mandatory?: boolean | null
}

export interface RadioFrequency {
  service: string
  callsign?: string | null
  mhz: string
}

export interface Airspace {
  id: string
  name: string
  type: AirspaceType
  icaoClass?: string | null
  floor: AltitudeLimit
  ceiling: AltitudeLimit
  activity?: string | null
  frequencies: RadioFrequency[]
  remarks?: string | null
  geometry?: GeoJsonMultiPolygon | null
}

export interface GeoJsonMultiPolygon {
  type: "MultiPolygon" | "Polygon"
  coordinates: number[][][][] | number[][][]
}

// ---------- Aircraft data ----------
export interface FuelTank {
  id: string
  label: string
  usableL: number
  unusableL: number
  armM: number
}
export interface FuelData {
  type: FuelType
  densityKgPerL: number
  tanks: FuelTank[]
  taxiFuelL: number
  burnOrder: string[]
}
export interface ClimbRow {
  pressureAltFt: number
  timeMin: number
  fuelL: number
  distanceNm: number
}
export interface ClimbData {
  iasKt: number
  table?: ClimbRow[] | null
  seaLevelRateFpm?: number | null
  ceilingRateFpm?: number | null
  fuelFlowLph?: number | null
}
export interface CruiseRow {
  pressureAltFt: number
  setting: string
  isaDeviationC: number
  tasKt: number
  fuelFlowLph: number
}
export interface CruiseData {
  normalSetting: string
  rows: CruiseRow[]
}
export interface DescentData {
  iasKt: number
  rateFpm: number
  fuelFlowLph: number
}
export interface CalibrationRow {
  iasKt: number
  casKt: number
}
export interface ReserveData {
  holdingFuelFlowLph: number
  maxContinuousFuelFlowLph: number
}

export interface AircraftPerformance {
  aircraftId: number
  templateCode?: string | null
  fuel: FuelData
  climb: ClimbData
  cruise: CruiseData
  descent: DescentData
  reserve: ReserveData
  arrivalFuelL: number
  serviceCeilingFt?: number | null
  calibration: CalibrationRow[]
  source?: string | null
  validatedAt?: string | null
  validatedBy?: string | null
}

export interface Station {
  id: string
  label: string
  kind: StationKind
  armM: number
  maxKg?: number | null
  tankId?: string | null
}
export interface CombinedLimit {
  stationIds: string[]
  maxKg: number
  label: string
}
export interface EnvelopePoint {
  armM: number
  massKg: number
}
export interface Envelope {
  category: EnvelopeCategory
  points: EnvelopePoint[]
}

export interface AircraftMassBalance {
  aircraftId: number
  emptyMassKg?: number | null
  emptyArmM?: number | null
  weighingDate?: string | null
  weighingRef?: string | null
  mtowKg?: number | null
  mlwKg?: number | null
  mzfwKg?: number | null
  stations: Station[]
  combinedLimits: CombinedLimit[]
  envelopes: Envelope[]
  validatedAt?: string | null
  validatedBy?: string | null
}

export interface AircraftTypeTemplate {
  code: string
  label: string
  source?: string | null
}

export interface AircraftPerformanceInput {
  fuel: FuelData
  climb: ClimbData
  cruise: CruiseData
  descent: DescentData
  reserve: ReserveData
  arrivalFuelL: number
  serviceCeilingFt?: number | null
  calibration: CalibrationRow[]
  source?: string | null
}

export interface AircraftMassBalanceInput {
  emptyMassKg: number
  emptyArmM: number
  weighingDate: string
  weighingRef?: string | null
  mtowKg: number
  mlwKg: number
  mzfwKg?: number | null
  stations: Station[]
  combinedLimits: CombinedLimit[]
  envelopes: Envelope[]
}

// ---------- Club settings ----------
export interface FlightPlanningSettings {
  reserveVfrDayLocalMin: number
  reserveVfrDayMin: number
  reserveVfrNightMin: number
  contingencyPercent: number
  contingencyMinL: number
  alternateRequiredVfr: boolean
  clubMarginMin: number
  verticalMarginFt: number
  defaultCircuitHeightFt: number
}

// ---------- Flight plan ----------
export interface RoutePointInput {
  navPointId?: string | null
  lat?: number | null
  lon?: number | null
  name?: string | null
}
export interface WindInput {
  directionDeg: number
  speedKt: number
  temperatureC?: number | null
}
export interface LegInput {
  altitudeFt: number
  cruiseSetting?: string | null
  windOverride?: WindInput | null
}
export interface LoadInput {
  stationId: string
  massKg?: number | null
}
export interface FuelLoadInput {
  tankId: string
  liters: number
}
export interface FlightPlanInput {
  aircraftId: number
  reservationId?: number | null
  departureTime: string
  departure: RoutePointInput
  destination: RoutePointInput
  alternate?: RoutePointInput | null
  waypoints: RoutePointInput[]
  legs: LegInput[]
  reserveCase: ReserveCase
  qnhHpa?: number | null
  loads: LoadInput[]
  fuel: FuelLoadInput[]
  envelopeCategory: EnvelopeCategory
  extraFuelNote?: string | null
}

export interface Wind {
  directionDeg: number
  speedKt: number
  temperatureC?: number | null
  source: DataSourceKind
  validAt?: string | null
}

export interface PhaseSegment {
  phase: FlightPhase
  fromNm: number
  toNm: number
  startAltFt: number
  endAltFt: number
  tasKt: number
  gsKt: number
  timeMin: number
  fuelL: number
}

export interface AirspaceCrossing {
  airspace: Airspace
  entryNm: number
  exitNm: number
  aircraftMinAltFt: number
  aircraftMaxAltFt: number
  relation: AirspaceRelation
  status: CheckStatus
  requirement: string
  activityKnown: boolean
}

export interface Leg {
  index: number
  from: NavPoint
  to: NavPoint
  distanceNm: number
  trueCourseDeg: number
  variationDeg: number
  magneticCourseDeg: number
  wind: Wind
  windCorrectionDeg: number
  trueHeadingDeg: number
  magneticHeadingDeg: number
  tasKt: number
  groundSpeedKt: number
  altitudeFt: number
  suggestedAltitudeFt?: number | null
  segments: PhaseSegment[]
  timeMin: number
  cumulativeTimeMin: number
  eta: string
  fuelL: number
  fuelRemainingL: number
  crossings: AirspaceCrossing[]
}

export interface ProfilePoint {
  distanceNm: number
  altitudeFt: number
  label?: string | null
}

export interface FuelPlan {
  taxiL: number
  tripL: number
  contingencyL: number
  alternateL: number
  finalReserveL: number
  finalReserveMin: number
  clubMarginL: number
  minimumBlockL: number
  loadedL: number
  extraL: number
  landingL: number
  landingAtAlternateL?: number | null
  usableL: number
  enduranceMin: number
  status: CheckStatus
  messages: string[]
}

export interface MassBalanceLine {
  stationId: string
  label: string
  massKg: number
  armM: number
  momentKgm: number
}
export interface MassBalanceState {
  massKg: number
  momentKgm: number
  cgM: number
  withinEnvelope: boolean
  marginKg: number
  marginCgMm: number
}
export interface MassBalanceResult {
  lines: MassBalanceLine[]
  takeoff: MassBalanceState
  landing: MassBalanceState
  zeroFuel: MassBalanceState
  envelope: Envelope
  status: CheckStatus
  messages: string[]
}

export interface Notice {
  code: string
  status: CheckStatus
  message: string
}

export interface WeatherReport {
  icao: string
  metar?: string | null
  taf?: string | null
  observedAt?: string | null
}

export interface FlightPlanResult {
  legs: Leg[]
  alternateLeg?: Leg | null
  profile: ProfilePoint[]
  totalDistanceNm: number
  totalTimeMin: number
  fuel: FuelPlan
  massBalance: MassBalanceResult
  weather: WeatherReport[]
  windSource: string
  navdata: NavdataInfo
  engineVersion: string
  status: CheckStatus
  notices: Notice[]
  encodedPolyline: string
  /** QNH the plan was computed with (the pilot's, the departure METAR's or standard). */
  qnhHpa?: number | null
}

export interface FlightPlan {
  id: number
  flightId?: number | null
  input: FlightPlanInput
  result: FlightPlanResult
  createdAt: string
  updatedAt: string
}
