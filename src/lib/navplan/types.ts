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
  // Activities the SIA publishes at a point (parachuting, model aircraft...): their extent is not published.
  | "PARACHUTING"
  | "AEROBATICS"
  | "WINCH"
  | "MODEL_AIRCRAFT"
  | "BALLOON"
  | "DRONE"
  | "LOW_OVERFLIGHT"
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
  /** H24, HO, HX, HJ, NOTAM, with the published text. */
  hoursCode?: string | null
  hours?: string | null
  /** Coverage, sector, "Absence ATS"... */
  remark?: string | null
  /** An auxiliary frequency (SIA "supplétive"). */
  auxiliary?: boolean | null
}

export interface GeoPoint {
  lat: number
  lon: number
}

/** One direction of a runway (QFU) with its declared distances: what is usable, not the physical length. */
export interface RunwayEnd {
  designator: string
  trueBearingDeg?: number | null
  magneticBearingDeg?: number | null
  toraM?: number | null
  todaM?: number | null
  asdaM?: number | null
  ldaM?: number | null
  thresholdElevationFt?: number | null
  displacedThreshold: boolean
  /** Why the distances are reduced. */
  remarks?: string | null
}

export interface Runway {
  designator: string
  trueHeadingDeg?: number | null
  lengthM?: number | null
  widthM?: number | null
  surface?: string | null
  main?: boolean | null
  ends: RunwayEnd[]
}

/** AD 2 data of an aerodrome (SIA), texts in the reader's language. */
export interface AerodromeSheet {
  icao: string
  name?: string | null
  elevationFt?: number | null
  source: string
  /** CAP, RST, PRV, MIL, OFF; null when unknown (OurAirports). */
  status?: string | null
  vfr?: boolean | null
  ifr?: boolean | null
  privateFlights?: boolean | null
  magneticVariationDeg?: number | null
  magneticVariationYear?: string | null
  atsHoursCode?: string | null
  atsHours?: string | null
  fuelHours?: string | null
  fuel?: string | null
  fuelRemarks?: string | null
  fuelTypes: string[]
  remarks?: string | null
  phone?: string | null
  operator?: string | null
  runways: Runway[]
  frequencies: RadioFrequency[]
  vacUrl?: string | null
  chartsUrl: string
  /** What the nav log prints for it (tower, else AFIS, else A/A; both when the tower hours are not H24). */
  navLogFrequency?: string | null
}

export interface AerodromeDetails {
  point: NavPoint
  sheet: AerodromeSheet
}

/** Head and cross wind on a runway direction from the METAR wind. */
export interface RunwayWind {
  designator: string
  /** Positive: head wind; negative: tail wind. */
  headwindKt: number
  /** Positive: from the right; negative: from the left. */
  crosswindKt: number
  gustHeadwindKt?: number | null
  gustCrosswindKt?: number | null
  best: boolean
}

export interface AerodromeConditions {
  station: string
  observedAt?: string | null
  windDirectionDeg?: number | null
  windSpeedKt?: number | null
  gustKt?: number | null
  windVariable: boolean
  temperatureC?: number | null
  dewpointC?: number | null
  qnhHpa?: number | null
  pressureAltitudeFt?: number | null
  densityAltitudeFt?: number | null
  runways: RunwayWind[]
}

export interface PlanAerodrome {
  role: AerodromeRole
  icao: string
  sheet?: AerodromeSheet | null
  conditions?: AerodromeConditions | null
  /** Take-off (departure) or landing (destination, alternate) distances; absent from older plans. */
  distances?: AerodromeDistances | null
}

export type RunwaySurfaceKind = "PAVED" | "GRASS" | "UNPAVED" | "UNKNOWN"

/** A correction applied to the manual's distance, and where it comes from. */
export interface DistanceFactor {
  code?: string
  /** Written out by the API: what it is and its source. */
  label: string
  factor: number
  source?: "MANUAL" | "CAA_SSL7" | "CLUB" | string
}

/** Take-off or landing distance on one runway direction. */
export interface RunwayDistance {
  designator: string
  suggested: boolean
  surface?: RunwaySurfaceKind | string
  surfaceText?: string | null
  wet?: boolean
  slopePercent?: number | null
  headwindKt?: number | null
  tableGroundRollM?: number | null
  tableDistance15mM?: number | null
  factors: DistanceFactor[]
  requiredGroundRollM?: number | null
  requiredDistance15mM?: number | null
  /** Take-off: TORA; landing: none. */
  availableRunM?: number | null
  /** Take-off: TODA; landing: LDA. */
  availableDistanceM?: number | null
  marginM?: number | null
  status: CheckStatus
  messages: string[]
}

export interface AerodromeDistances {
  kind: "TAKEOFF" | "LANDING" | string
  massKg?: number | null
  massSource?: string
  pressureAltitudeFt: number
  temperatureC: number
  conditionsSource: "METAR" | "ISA" | string
  safetyFactor: number
  /** The aircraft has no table: to be entered from the flight manual. */
  dataMissing: boolean
  tableSource?: string | null
  runways: RunwayDistance[]
  status: CheckStatus
  messages: string[]
}

/** The 0 °C isotherm from the winds aloft forecast. */
export interface FreezingLevel {
  place: "DEPARTURE" | "ROUTE" | "DESTINATION"
  ident?: string | null
  at: string
  altitudeFt?: number | null
  state: "LEVEL" | "SURFACE" | "ABOVE" | "UNKNOWN"
  topFt?: number | null
}

/** An obstacle of the SIA (map). */
export interface Obstacle {
  ident: string
  type: string
  lat: number
  lon: number
  amslFt: number
  aglFt?: number | null
  count: number
  lighting?: string | null
}

/** Obstacles near a leg whose top is less than 500 ft below its altitude (grouped: a wind farm once). */
export interface LegObstacle {
  type: string
  count: number
  ident?: string
  amslFt: number
  aglFt?: number | null
  lat?: number
  lon?: number
  lighting?: string | null
  alongNm: number
  offsetNm: number
  marginFt: number
  status: CheckStatus
}

export interface Airspace {
  id: string
  name: string
  type: AirspaceType
  icaoClass?: string | null
  floor: AltitudeLimit
  ceiling: AltitudeLimit
  activity?: string | null
  /** Published hours, apart from the activity. */
  hours?: string | null
  frequencies: RadioFrequency[]
  remarks?: string | null
  geometry?: GeoJsonMultiPolygon | null
  /** Without an outline: the published point (activities, protected areas). */
  referencePoint?: GeoPoint | null
  /** An activity published at a point: the distance the plans look around it. */
  radiusNm?: number | null
  /** false: the SIA publishes no outline (géométrie inconnue); the area is never drawn nor "not crossed". */
  outlineKnown?: boolean
}

/** An area near the route whose outline is not published: to be found on the chart. */
export interface UnverifiedAirspace {
  airspace: Airspace
  /** Distance from the route to its published point; null when it cannot be located. */
  distanceNm?: number | null
  status: CheckStatus
  message: string
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

/** One line of a take-off or landing table of the flight manual. */
export interface DistanceRow {
  pressureAltFt: number
  temperatureC: number
  massKg?: number | null
  groundRollM: number
  /** Take-off: to 15 m (50 ft); landing: from 15 m. */
  distance15mM: number
}

export interface RunwayDistanceTable {
  rows: DistanceRow[]
  referenceMassKg?: number | null
  /** Lift-off speed (take-off) or speed at 15 m (landing), kt IAS. */
  speedKt?: number | null
  headwindPercentPerKt?: number | null
  tailwindPercentPerKt?: number | null
  grassPercent?: number | null
  wetGrassPercent?: number | null
  slopePercentPerPercent?: number | null
  source?: string | null
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
  takeoff?: RunwayDistanceTable | null
  landing?: RunwayDistanceTable | null
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
  takeoff?: RunwayDistanceTable | null
  landing?: RunwayDistanceTable | null
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
  /** Minimum safe altitude: corridor either side of the track (NM) and margin above its highest point (ft). */
  msaCorridorNm: number
  msaMarginFt: number
  /** Applied to the manual's take-off and landing distances. */
  takeoffSafetyFactor: number
  landingSafetyFactor: number
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
  /** Obstacles within 2 NM less than 500 ft under the leg (absent from older plans). */
  obstacles?: LegObstacle[]
  highestObstacleFt?: number | null
  /** Minimum safe altitude of the leg (absent from older plans). */
  terrain?: LegTerrain | null
}

/** Highest terrain or obstacle in the club's corridor plus its margin, rounded up to 100 ft. */
export interface LegTerrain {
  /** KNOWN, or UNKNOWN where the corridor leaves the terrain coverage. */
  state: "KNOWN" | "UNKNOWN" | string
  corridorNm: number
  marginFt: number
  highestTerrainFt?: number | null
  highestObstacleFt?: number | null
  msaFt?: number | null
  /** Planned altitude minus the MSA (negative: below). */
  marginToMsaFt?: number | null
  status: CheckStatus
}

export interface TerrainProfilePoint {
  distanceNm: number
  terrainFt?: number | null
  obstacleFt?: number | null
}

export interface TerrainSource {
  name?: string
  /** To be shown wherever the terrain is used. */
  attribution: string
  cellArcSec?: number
}

export interface ProfilePoint {
  distanceNm: number
  altitudeFt: number
  label?: string | null
}

export interface FuelPlan {
  /** The case the reserve was computed for: the pilot's, or VFR_NIGHT when part of the flight is at night. */
  reserveCase?: ReserveCase | null
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
  tafValidFrom?: string | null
  tafValidTo?: string | null
}

export type AerodromeRole = "departure" | "destination" | "alternate"

/** Twilight, sunrise and sunset (UTC) of an aerodrome of the plan, on the day the aircraft is there. */
export interface AerodromeSun {
  icao: string
  role: AerodromeRole | string
  /** Off-block at the departure, landing at the destination, arrival at the alternate. */
  at: string
  date: string
  civilDawn?: string | null
  sunrise?: string | null
  sunset?: string | null
  civilDusk?: string | null
}

export interface Daylight {
  aerodromes: AerodromeSun[]
  /** Part of the flight is in the aviation night (end of evening to beginning of morning civil twilight). */
  night: boolean
  nightFrom?: string | null
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
  /** Absent from plans computed before it existed. */
  unverifiedAirspaces?: UnverifiedAirspace[]
  encodedPolyline: string
  /** QNH the plan was computed with (the pilot's, the departure METAR's or standard). */
  qnhHpa?: number | null
  qnhSource?: "INPUT" | "METAR" | "DEFAULT" | string | null
  qnhStation?: string | null
  qnhObservedAt?: string | null
  daylight?: Daylight | null
  /** Departure, destination, alternate: AD 2 data and METAR conditions (absent from older plans). */
  aerodromes?: PlanAerodrome[]
  freezingLevels?: FreezingLevel[]
  /** The terrain along the route (empty or absent on older plans) and its source. */
  terrainProfile?: TerrainProfilePoint[]
  terrainSource?: TerrainSource | null
}

export interface FlightPlan {
  id: number
  flightId?: number | null
  input: FlightPlanInput
  result: FlightPlanResult
  createdAt: string
  updatedAt: string
}
