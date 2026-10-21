import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { RunwayDistanceList, RunwayDistancesSummary } from "../RunwayDistances"
import { TerrainProfileChart, tickStep } from "../TerrainProfileChart"
import { DistanceTableEditor } from "@/components/fleet-admin/flight-data/DistanceTableEditor"
import { RESULT } from "@/test/fixtures/flight-plan"
import type { AerodromeDistances, FlightPlanResult, PlanAerodrome, RunwayDistanceTable } from "@/lib/navplan/types"

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const ATTRIBUTION = "Contient des données Copernicus DEM GLO-90 © DLR e.V. 2010-2014"

const withTerrain = (): FlightPlanResult => {
  const terrain = { state: "KNOWN", corridorNm: 5, marginFt: 1000, highestObstacleFt: null, status: "OK" as const }
  return {
    ...RESULT,
    legs: RESULT.legs.map((leg, i) => ({
      ...leg,
      terrain: i === 0 ? { ...terrain, highestTerrainFt: 2600, msaFt: 3600, marginToMsaFt: -1100, status: "WARNING" as const } : { ...terrain, highestTerrainFt: 400, msaFt: 1400, marginToMsaFt: 1100 },
    })),
    terrainProfile: Array.from({ length: 21 }, (_, i) => ({ distanceNm: (45.4 * i) / 20, terrainFt: i === 5 ? 2600 : 400, obstacleFt: i === 8 ? 900 : null })),
    terrainSource: { attribution: ATTRIBUTION },
  }
}

const takeoff = (changes: Partial<AerodromeDistances> = {}): AerodromeDistances => ({
  kind: "TAKEOFF",
  massKg: 1050,
  pressureAltitudeFt: 300,
  temperatureC: 15,
  conditionsSource: "METAR",
  safetyFactor: 1.33,
  dataMissing: false,
  tableSource: "Manuel p. 5.5",
  status: "BLOCKING",
  messages: [],
  runways: [
    {
      designator: "06",
      suggested: true,
      factors: [{ label: "Herbe sèche (facteur générique UK CAA Safety Sense Leaflet 7)", factor: 1.2 }],
      requiredGroundRollM: 420,
      requiredDistance15mM: 760,
      availableRunM: 700,
      availableDistanceM: 700,
      marginM: -60,
      status: "BLOCKING",
      messages: [],
    },
    {
      designator: "24",
      suggested: false,
      factors: [],
      requiredGroundRollM: 380,
      requiredDistance15mM: 640,
      availableRunM: 700,
      availableDistanceM: 700,
      marginM: 60,
      status: "WARNING",
      messages: [],
    },
  ],
  ...changes,
})

describe("vertical profile", () => {
  it("draws the planned altitude over the terrain with the MSA, and credits the terrain data", () => {
    const { container } = render(<TerrainProfileChart result={withTerrain()} />)
    const chart = screen.getByRole("img", { name: /Profil vertical/ })
    expect(chart).toHaveAccessibleName(expect.stringContaining("2 600 ft"))
    expect(chart).toHaveAccessibleName(expect.stringContaining("Une branche est prévue sous son altitude minimale de sécurité"))
    // One dashed MSA line per leg, the one under its MSA in red.
    const msaLines = container.querySelectorAll('line[stroke-dasharray="6 4"]')
    expect(msaLines).toHaveLength(RESULT.legs.length)
    expect(msaLines[0]).toHaveClass("stroke-destructive")
    expect(screen.getByText(ATTRIBUTION)).toBeInTheDocument()
    expect(screen.getByRole("list", { name: "Légende du profil" })).toHaveTextContent("Altitude prévue")
  })

  it("draws nothing for a plan without a profile", () => {
    const { container } = render(<TerrainProfileChart result={{ ...RESULT, profile: [], terrainProfile: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("chooses round ticks", () => {
    expect(tickStep(4000)).toBe(1000)
    expect(tickStep(9000)).toBe(2500)
    expect(tickStep(45, 5)).toBe(10)
  })
})

describe("take-off and landing distances", () => {
  it("shows the suggested runway of each aerodrome with what is needed and available", () => {
    const aerodromes: PlanAerodrome[] = [
      { role: "departure", icao: "LFPN", distances: takeoff() },
      { role: "destination", icao: "LFOT", distances: { ...takeoff({ kind: "LANDING", status: "OK" }), runways: [{ ...takeoff().runways[1], suggested: true, status: "OK", availableRunM: null }] } },
    ]
    render(<RunwayDistancesSummary aerodromes={aerodromes} />)
    const departure = screen.getByText("Décollage LFPN").closest("li") as HTMLElement
    expect(departure).toHaveTextContent("Piste conseillée 06")
    expect(departure).toHaveTextContent(/passage des 15 m 760 m \/ TODA 700 m/)
    expect(departure).toHaveTextContent(/marge -60 m/)
    expect(within(departure).getByText("Bloquant")).toBeInTheDocument()
    const arrival = screen.getByText("Atterrissage LFOT").closest("li") as HTMLElement
    expect(arrival).toHaveTextContent(/Depuis 15 m 640 m \/ LDA 700 m/)
  })

  it("asks for the manual's tables, never shows OK without them", () => {
    render(<RunwayDistancesSummary aerodromes={[{ role: "departure", icao: "LFPN", distances: takeoff({ dataMissing: true, status: "WARNING", runways: [] }) }]} />)
    expect(screen.getAllByText(/Non renseigné — à saisir depuis le manuel de vol/).length).toBeGreaterThan(0)
    expect(screen.getByText("À vérifier")).toBeInTheDocument()
  })

  it("lists every runway on the aerodrome sheet, the suggested one first, with the factors", () => {
    render(<RunwayDistanceList distances={takeoff()} />)
    const items = screen.getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("06")
    expect(items[0]).toHaveTextContent("Herbe sèche (facteur générique UK CAA Safety Sense Leaflet 7) ×1,2")
    expect(items[1]).toHaveTextContent("24")
  })
})

describe("distance table editor", () => {
  function Harness({ initial }: { initial: RunwayDistanceTable | null }) {
    const [value, setValue] = useState<RunwayDistanceTable | null>(initial)
    return (
      <>
        <DistanceTableEditor kind="takeoff" value={value} onChange={setValue} />
        <output data-testid="value">{JSON.stringify(value)}</output>
      </>
    )
  }
  const stored = () => JSON.parse(screen.getByTestId("value").textContent ?? "null")

  it("starts a table, adds and removes rows, and says what is wrong", async () => {
    const user = userEvent.setup()
    render(<Harness initial={null} />)
    expect(screen.getByText("Non renseigné — à saisir depuis le manuel de vol.")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Saisir le tableau de décollage" }))
    await user.click(screen.getByRole("button", { name: "Ajouter une ligne" }))
    await user.type(screen.getByRole("textbox", { name: "Roulement, ligne 1 (m)" }), "300")
    await user.type(screen.getByRole("textbox", { name: "Passage des 15 m, ligne 1 (m)" }), "250")
    expect(screen.getByText(/ne peut être plus courte que le roulement/)).toBeInTheDocument()
    await user.clear(screen.getByRole("textbox", { name: "Passage des 15 m, ligne 1 (m)" }))
    await user.type(screen.getByRole("textbox", { name: "Passage des 15 m, ligne 1 (m)" }), "550")
    expect(screen.queryByText(/ne peut être plus courte/)).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Ajouter une ligne" }))
    expect(stored().rows).toHaveLength(2)
    expect(stored().rows[1]).toMatchObject({ pressureAltFt: 0, temperatureC: 10, groundRollM: 300, distance15mM: 550 })
    await user.click(screen.getByRole("button", { name: "Supprimer la ligne 2" }))
    expect(stored().rows).toHaveLength(1)
    await user.type(screen.getByRole("textbox", { name: /Herbe sèche/ }), "15")
    expect(stored().grassPercent).toBe(15)
    await user.click(screen.getByRole("button", { name: "Retirer le tableau de décollage" }))
    expect(stored()).toBeNull()
  })
})
