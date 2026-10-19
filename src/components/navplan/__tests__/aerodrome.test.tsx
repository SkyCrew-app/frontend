import { render, screen, within } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"
import { AERODROME_DETAILS } from "@/graphql/navdata"
import { frequenciesByService, pointLabel } from "@/lib/navplan/aerodrome"
import type { AerodromeConditions, AerodromeSheet, Leg } from "@/lib/navplan/types"
import { AerodromeSheetCard, AerodromeSheetContent, RunwayWindLines } from "../AerodromeSheet"
import { AirspaceCrossings, crossingsStatus } from "../AirspaceCrossings"
import { navLogRows } from "../navlog-rows"
import { WeatherPanel } from "../WeatherPanel"
import { activityFeatures, obstacleFeatures } from "@/components/map/layers/activities"
import { LFPN, RESULT, R_ZONE } from "@/test/fixtures/flight-plan"

// LFOP of AIRAC 2610 as the API gives it: A/A and tower on 120.200, grass runway 05/23 (LDA 815 m).
const LFOP: AerodromeSheet = {
  icao: "LFOP",
  name: "ROUEN VALLEE DE SEINE",
  elevationFt: 512,
  source: "SIA",
  status: "CAP",
  vfr: true,
  ifr: true,
  privateFlights: true,
  magneticVariationDeg: 1.44,
  magneticVariationYear: "2025",
  atsHoursCode: null,
  atsHours: "TWR : voir NOTAM",
  fuelHours: "HOR AVT : LUN - VEN : 0745 - 1630",
  fuel: "Carburants : 100LL - JET A1",
  fuelRemarks: null,
  fuelTypes: ["100LL", "JET A1"],
  remarks: null,
  phone: null,
  operator: null,
  runways: [
    {
      designator: "05/23",
      trueHeadingDeg: 43.82,
      lengthM: 900,
      widthM: 80,
      surface: "gazon",
      main: false,
      ends: [
        { designator: "05", trueBearingDeg: 43.82, magneticBearingDeg: 42.38, toraM: 900, todaM: 900, asdaM: 900, ldaM: 815, thresholdElevationFt: null, displacedThreshold: true, remarks: null },
        { designator: "23", trueBearingDeg: 223.82, magneticBearingDeg: 222.38, toraM: 900, todaM: 900, asdaM: 900, ldaM: 815, thresholdElevationFt: null, displacedThreshold: true, remarks: null },
      ],
    },
  ],
  frequencies: [
    { service: "A/A", callsign: "ROUEN", mhz: "120.200", hoursCode: "HX", remark: "Absence ATS" },
    { service: "VDF", callsign: "ROUEN Gonio", mhz: "118.575", hoursCode: "HX" },
    { service: "TWR", callsign: "ROUEN Tour", mhz: "120.200", hoursCode: "HO" },
    { service: "ATIS", callsign: "ROUEN", mhz: "120.730", hoursCode: "HX" },
  ],
  vacUrl: "https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_01_OCT_2026/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.LFOP.pdf",
  chartsUrl: "https://www.sia.aviation-civile.gouv.fr/",
  navLogFrequency: "TWR / A/A 120.200 · ATIS 120.730",
}

const CONDITIONS: AerodromeConditions = {
  station: "LFOP",
  windDirectionDeg: 250,
  windSpeedKt: 15,
  gustKt: 25,
  windVariable: false,
  temperatureC: 12,
  dewpointC: 8,
  qnhHpa: 1009,
  pressureAltitudeFt: 623,
  densityAltitudeFt: 450,
  runways: [
    { designator: "23", headwindKt: 14, crosswindKt: 7, gustHeadwindKt: 23, gustCrosswindKt: 11, best: true },
    { designator: "05", headwindKt: -14, crosswindKt: -7, gustHeadwindKt: -23, gustCrosswindKt: -11, best: false },
  ],
}

describe("aerodrome sheet", () => {
  it("shows status, the nav log frequency and its rule, frequencies by service, declared distances, fuel and the VAC", () => {
    render(<AerodromeSheetContent sheet={LFOP} role="destination" conditions={CONDITIONS} />)
    expect(screen.getByText("Ouvert à la CAP")).toBeInTheDocument()
    expect(screen.getByText("Sur le log : TWR / A/A 120.200 · ATIS 120.730")).toBeInTheDocument()
    expect(screen.getByText(/l'auto-information \(A\/A\)/)).toBeInTheDocument()
    // VDF (direction finding) is not a frequency to call.
    expect(screen.queryByText(/Gonio/)).not.toBeInTheDocument()
    expect(screen.getByText(/Absence ATS/)).toBeInTheDocument()
    expect(screen.getAllByText(/LDA 815\s?m/)).toHaveLength(2)
    expect(screen.getAllByText(/QFU 042°/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/seuil décalé/).length).toBeGreaterThan(0)
    expect(screen.getByText("100LL · JET A1")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Carte VAC/ })).toHaveAttribute("href", LFOP.vacUrl)
    expect(screen.getByText(/Altitude densité 450 ft/)).toBeInTheDocument()
  })

  it("puts a restricted or military aerodrome forward", () => {
    render(<AerodromeSheetContent sheet={{ ...LFOP, status: "MIL", vfr: false }} />)
    expect(screen.getByText("Militaire")).toBeInTheDocument()
    expect(screen.getByText(/accès sur autorisation \(PPR\)/)).toBeInTheDocument()
    expect(screen.getByText("Non ouvert au trafic VFR selon le SIA")).toBeInTheDocument()
  })

  it("suggests the runway into the wind, with head and cross wind", () => {
    render(<RunwayWindLines conditions={CONDITIONS} />)
    const best = screen.getByText(/^23 :/)
    expect(best.textContent).toMatch(/14 kt face, travers 7 kt de droite/)
    expect(within(best).getByText("piste conseillée")).toBeInTheDocument()
    expect(screen.getByText(/^05 :/).textContent).toMatch(/14 kt arrière, travers 7 kt de gauche/)
  })

  it("says when there is no METAR", () => {
    render(<RunwayWindLines conditions={null} />)
    expect(screen.getByText(/Pas de METAR pour ce terrain/)).toBeInTheDocument()
  })

  it("asks the API for the sheet of an aerodrome", async () => {
    render(
      <MockedProvider
        mocks={[{ request: { query: AERODROME_DETAILS, variables: { icao: "LFOP" } }, result: { data: { aerodrome: null } } }]}
      >
        <AerodromeSheetCard icao="LFOP" />
      </MockedProvider>,
    )
    expect(await screen.findByText("Fiche indisponible pour LFOP.")).toBeInTheDocument()
  })

  it("orders the frequencies as a pilot uses them", () => {
    expect(frequenciesByService(LFOP.frequencies).map((group) => group.service)).toEqual(["ATIS", "TWR", "A/A"])
  })
})

describe("VFR reporting points and nav log", () => {
  it("writes a VFR point with its aerodrome", () => {
    expect(pointLabel({ type: "VRP", ident: "S", aerodromeIcao: "LFPN" })).toBe("LFPN S")
    expect(pointLabel({ type: "AERODROME", ident: "LFPN", aerodromeIcao: null })).toBe("LFPN")
    const vrp = { ...RESULT.legs[0].to, type: "VRP" as const, ident: "S", aerodromeIcao: "LFPN" }
    const rows = navLogRows({ legs: [{ ...RESULT.legs[0], from: { ...LFPN, frequency: "TWR 120.755 · GND 122.130" }, to: vrp }], alternateLeg: null })
    expect(rows.map((row) => row.ident)).toEqual(["LFPN", "LFPN S"])
    expect(rows[0].frequencies).toBe("TWR 120.755 · GND 122.130")
  })
})

const withObstacle: Leg = {
  ...RESULT.legs[1],
  obstacles: [{ type: "Eolienne(s)", count: 3, amslFt: 2150, lat: 48.5, lon: 1.8, alongNm: 5, offsetNm: 1, marginFt: 350, status: "WARNING" }],
}

describe("zones and obstacles", () => {
  it("gives hours, activity and the SIA instructions of an area, and the obstacles of a leg", () => {
    const zone = { ...R_ZONE, hours: "SR-SS", activity: "Tirs", remarks: "Contournement obligatoire.\nTEL 01 02 03 04 05" }
    const leg = { ...withObstacle, crossings: [{ ...RESULT.legs[1].crossings[0], airspace: zone }] }
    render(<AirspaceCrossings legs={[RESULT.legs[0], leg]} />)
    expect(screen.getByText("Horaires : SR-SS")).toBeInTheDocument()
    expect(screen.getByText("Activité : Tirs")).toBeInTheDocument()
    expect(screen.getByText("Consignes du SIA")).toBeInTheDocument()
    expect(screen.getByText(/Contournement obligatoire/)).toBeInTheDocument()
    expect(screen.getByText(/Eolienne\(s\) ×3 — sommet 2\s150 ft/)).toBeInTheDocument()
    expect(crossingsStatus([{ ...RESULT.legs[0], crossings: [] }, { ...withObstacle, crossings: [] }])).toBe("WARNING")
  })

  it("says how far around a parachuting zone published at a point the route is checked", () => {
    const pje = { ...R_ZONE, id: "pje", name: "Pje 215", type: "PARACHUTING" as const, outlineKnown: false, radiusNm: 3 }
    render(<AirspaceCrossings legs={[{ ...RESULT.legs[0], crossings: [{ ...RESULT.legs[0].crossings[0], airspace: pje }] }]} />)
    expect(screen.getByText(/signalée à moins de 3 NM de la route/)).toBeInTheDocument()
  })
})

describe("weather: freezing level and leg temperatures", () => {
  it("gives the 0 °C isotherm and the temperature at each leg altitude", () => {
    render(
      <WeatherPanel
        reports={[]}
        roles={{}}
        windSource="ICON-EU"
        legs={RESULT.legs}
        freezingLevels={[
          { place: "DEPARTURE", ident: "LFPN", at: "2026-10-17T09:00:00Z", altitudeFt: 7500, state: "LEVEL", topFt: null },
          { place: "ROUTE", ident: null, at: "2026-10-17T09:10:00Z", altitudeFt: null, state: "ABOVE", topFt: 13800 },
        ]}
      />,
    )
    expect(screen.getByText(/vers 7\s500 ft/)).toBeInTheDocument()
    expect(screen.getByText(/au-dessus de 13\s800 ft/)).toBeInTheDocument()
    expect(screen.getAllByText(/à 2\s500 ft : 8 °C/).length).toBeGreaterThan(0)
  })
})

describe("map information layers", () => {
  const pje = { ...R_ZONE, id: "pje", name: "Pje 215", type: "PARACHUTING" as const, outlineKnown: false, radiusNm: 3, referencePoint: { lat: 48.5, lon: 1.8 } }
  it("hides the activities unless switched on or met by the route", () => {
    expect(activityFeatures([pje], {}).features).toEqual([])
    expect(activityFeatures([pje], { activities: true }).features.map((f) => f.geometry.type)).toEqual(["Polygon", "Point"])
    expect(activityFeatures([pje], {}, { pje: "WARNING" }).features[1].properties).toMatchObject({ crossed: "WARNING", label: "PJE 3000 ft AMSL" })
    expect(activityFeatures([pje], { model: true }).features).toEqual([])
  })

  it("draws the obstacles a plan warns of in red", () => {
    const features = obstacleFeatures([], withObstacle.obstacles).features
    expect(features).toHaveLength(1)
    expect(features[0].properties).toMatchObject({ warned: true, color: "#dc2626", label: "2150 ×3" })
  })
})
