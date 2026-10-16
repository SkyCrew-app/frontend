import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AirspaceCrossings, crossingsStatus } from "../AirspaceCrossings"
import { FuelSummary } from "../FuelSummary"
import { MassBalanceChart } from "../MassBalanceChart"
import { MassBalancePanel } from "../MassBalancePanel"
import { NavLogTable, legProfileNotes } from "../NavLogTable"
import { NavdataAge, NoticesList } from "../NoticesBanner"
import { ResultsPanel } from "../ResultsPanel"
import { WeatherPanel } from "../WeatherPanel"
import { BLOCKING_RESULT, NAVDATA, RESULT, SETTINGS } from "@/test/fixtures/flight-plan"

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("NavLogTable", () => {
  it("shows each leg with its own magnetic course, heading, ground speed, time and fuel", () => {
    render(<NavLogTable legs={RESULT.legs} alternateLeg={RESULT.alternateLeg} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    const table = screen.getByRole("table", { name: "Log de navigation, branche par branche" })
    const row = within(table).getByRole("row", { name: /RBT → P1/ })
    // The figures of the RBT → P1 leg, not those of the next one (defect of the former log).
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "RBT → P1",
      "2 500 ft".replace(" ", " "),
      "223°",
      "270/15",
      "−7°",
      "215°",
      "95 kt",
      "17,3 NM",
      "11 min",
      "09:18Z",
      "5,1 L",
      "69,5 L",
    ])
    expect(within(table).getByRole("row", { name: /Dégagement LFOC → LFOT/ })).toBeInTheDocument()
    expect(within(table).getByRole("row", { name: /Total/ })).toHaveTextContent("45,4 NM")
  })

  it("tells where the climb ends and the descent starts", () => {
    expect(legProfileNotes(RESULT.legs[0])).toEqual({ toc: 3.9 })
    expect(legProfileNotes(RESULT.legs[2])).toEqual({ tod: 15.4 })
    render(<NavLogTable legs={RESULT.legs} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    expect(screen.getAllByText("Fin de montée à 3,9 NM").length).toBeGreaterThan(0)
  })

  it("gives the phone one card per leg with heading, time and fuel first", () => {
    render(<NavLogTable legs={RESULT.legs} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    const cards = screen.getByRole("list", { name: "Log de navigation, branche par branche" })
    const first = within(cards).getAllByRole("listitem")[0]
    expect(within(first).getAllByRole("term").slice(0, 3).map((term) => term.textContent)).toEqual(["Cm", "Temps", "Carb. restant"])
    expect(first).toHaveTextContent("225°")
  })
})

describe("mass and balance", () => {
  it("plots take-off and landing on the envelope with a text alternative", () => {
    render(
      <MassBalanceChart
        envelope={RESULT.massBalance.envelope.points}
        points={[
          { armM: 0.4938, massKg: 862.6, label: "DÉC", name: "Décollage", within: true },
          { armM: 0.6068, massKg: 1009.2, label: "ATT", name: "Atterrissage", within: false, shape: "square" },
        ]}
        showPath
      />,
    )
    const chart = screen.getByRole("img", { name: "Enveloppe de centrage" })
    expect(chart).toHaveAccessibleDescription(expect.stringContaining("Décollage : 862,6 kg, centrage 0,494 m, Dans les limites."))
    expect(chart).toHaveAccessibleDescription(expect.stringMatching(/Atterrissage : 1\s009,2 kg/))
    expect(chart).toHaveAccessibleDescription(expect.stringContaining("Hors limites"))
    expect(chart.querySelector("polygon")).not.toBeNull()
  })

  it("says plainly when the aircraft is within limits", () => {
    render(<MassBalancePanel massBalance={RESULT.massBalance} weighingDate="2026-03-12T00:00:00.000Z" />)
    expect(screen.getByText("Masse et centrage dans les limites au décollage et à l'atterrissage.")).toBeInTheDocument()
    expect(screen.getByText(/pesée du 12 mars 2026/)).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Chargement, station par station" })).toHaveTextContent("Sièges arrière")
  })

  it("says 'not computed', not 'out of limits', when the API refused unconfirmed aircraft data", () => {
    const refused = {
      ...BLOCKING_RESULT.massBalance,
      lines: [],
      envelope: { category: "NORMAL" as const, points: [] },
      messages: ["Masse et centrage refusés : données de l'avion non confirmées."],
    }
    render(<MassBalancePanel massBalance={refused} />)
    expect(screen.getByText("Masse et centrage non calculés")).toBeInTheDocument()
    expect(screen.getByText(/données de l'avion non confirmées/)).toBeInTheDocument()
    expect(screen.queryByText("HORS LIMITES — NE PAS PARTIR")).toBeNull()
  })

  it("shows out of limits in red with the reasons and NE PAS PARTIR", () => {
    render(<MassBalancePanel massBalance={BLOCKING_RESULT.massBalance} />)
    expect(screen.getByText("HORS LIMITES — NE PAS PARTIR")).toBeInTheDocument()
    expect(screen.getByText(/Centrage arrière hors limites/)).toBeInTheDocument()
    expect(screen.getAllByText("Hors limites").length).toBeGreaterThanOrEqual(2)
  })
})

describe("FuelSummary", () => {
  it("adds up the minimum block fuel and writes the rule applied", () => {
    render(<FuelSummary fuel={RESULT.fuel} reserveCase="VFR_DAY" settings={{ ...SETTINGS, contingencyPercent: 10 }} />)
    expect(screen.getByText("Réserve finale (30 min)")).toBeInTheDocument()
    expect(screen.getByText(/VFR de jour : 30 min au débit d'attente à 1 500 ft/)).toBeInTheDocument()
    expect(screen.getByText("Règle du club : 10 % du délestage, au moins 0 L.")).toBeInTheDocument()
    expect(screen.getByText("Minimum requis au bloc").nextSibling).toHaveTextContent("41,7 L")
    expect(screen.getByText("Supplément").nextSibling).toHaveTextContent("38,3 L")
  })

  it("shows what is missing when the fuel on board is not enough (case 6 of the design)", () => {
    render(<FuelSummary fuel={BLOCKING_RESULT.fuel} reserveCase="VFR_DAY" />)
    expect(screen.getByText("Manque").nextSibling).toHaveTextContent("2,3 L")
    expect(screen.getByText("Bloquant")).toBeInTheDocument()
    expect(screen.getByText(/il manque 2,3 L/)).toBeInTheDocument()
  })
})

describe("AirspaceCrossings", () => {
  it("lists the crossings with what they require and never calls an unknown activity fine", () => {
    render(<AirspaceCrossings legs={RESULT.legs} />)
    const restricted = screen.getByText("R 45 A").closest("li")!
    expect(restricted).toHaveTextContent("Activité inconnue")
    expect(restricted).toHaveTextContent("vérifier le NOTAM, le SUP AIP")
    expect(screen.getByText("TMA PARIS 1").closest("li")).toHaveTextContent("Clairance requise — contacter Paris Approche 119.850.")
    expect(screen.getByRole("link", { name: /SOFIA Briefing/ })).toHaveAttribute("href", "https://sofia-briefing.aviation-civile.gouv.fr")
    expect(screen.getByText(/Activité inconnue ≠ zone inactive/)).toBeInTheDocument()
    // An area flown under is listed apart.
    expect(screen.queryByText("TMA PARIS 2")).toBeNull()
    expect(crossingsStatus(RESULT.legs)).toBe("WARNING")
  })

  it("is blocking with a prohibited area", () => {
    const legs = [{ ...RESULT.legs[0], crossings: [{ ...RESULT.legs[0].crossings[0], status: "BLOCKING" as const }] }]
    expect(crossingsStatus(legs)).toBe("BLOCKING")
    expect(crossingsStatus([{ ...RESULT.legs[2] }])).toBe("OK")
  })
})

describe("weather and data age", () => {
  it("shows the raw METAR and TAF of each aerodrome with its role", () => {
    render(<WeatherPanel reports={RESULT.weather} roles={{ LFPN: "departure", LFOC: "destination", LFOT: "alternate" }} windSource={RESULT.windSource} />)
    expect(screen.getByText("LFPN 170830Z 27012KT 9999 FEW030 12/06 Q1018 NOSIG")).toBeInTheDocument()
    expect(screen.getByText("Dégagement")).toBeInTheDocument()
    expect(screen.getByText("Prévision automatique non validée par un prévisionniste.")).toBeInTheDocument()
    expect(screen.getByText(/DWD ICON-EU/)).toBeInTheDocument()
  })

  it("warns in full when the aeronautical data are out of date", () => {
    const { rerender } = render(<NavdataAge navdata={NAVDATA} />)
    expect(screen.getByText(/cycle AIRAC 2610, en vigueur du 1 oct. 2026 au 29 oct. 2026/)).toBeInTheDocument()
    rerender(<NavdataAge navdata={{ ...NAVDATA, stale: true }} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Données aéronautiques du cycle 2610 (1 oct. 2026) PÉRIMÉES")
  })

  it("names the data actually imported when there is no SIA cycle", () => {
    const { rerender } = render(<NavdataAge navdata={{ ...NAVDATA, airac: "OURAIRPORTS", source: "OurAirports, téléchargé le 2026-10-08" }} />)
    expect(screen.getByText(/aérodromes seulement, aucune zone ni balise importée · OurAirports/)).toBeInTheDocument()
    rerender(<NavdataAge navdata={{ ...NAVDATA, airac: "NONE", stale: true }} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Aucune donnée aéronautique importée")
    expect(screen.queryByText(/PÉRIMÉES/)).toBeNull()
  })

  it("keeps the disclaimer notice out (each screen writes it) and shows information quietly", () => {
    render(
      <NoticesList
        notices={[
          { code: "DISCLAIMER", status: "OK", message: "Aide à la préparation" },
          { code: "WIND_PILOT", status: "OK", message: "Vent saisi par le pilote" },
        ]}
      />,
    )
    expect(screen.queryByText("Aide à la préparation")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByText("Vent saisi par le pilote")).toBeInTheDocument()
  })

  it("puts blocking notices first and apart", () => {
    render(
      <NoticesList
        notices={[
          { code: "QNH_DEFAULTED", status: "WARNING", message: "QNH par défaut" },
          { code: "WMM_EXPIRED", status: "BLOCKING", message: "Modèle magnétique expiré" },
        ]}
      />,
    )
    const [blocking, warnings] = screen.getAllByRole("alert")
    expect(blocking).toHaveTextContent("Points bloquants")
    expect(blocking).toHaveTextContent("Modèle magnétique expiré")
    expect(warnings).toHaveTextContent("QNH par défaut")
  })
})

describe("ResultsPanel", () => {
  it("sums up the plan and opens each result in its tab", async () => {
    render(<ResultsPanel result={RESULT} reserveCase="VFR_DAY" roles={{ LFPN: "departure" }} />)
    expect(screen.getByText("Bilan : À vérifier")).toBeInTheDocument()
    expect(screen.getByText("Carburant minimum").nextSibling).toHaveTextContent("41,7 L")
    expect(screen.getByRole("tab", { name: /Zones \(À vérifier\)/ })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Masse et centrage \(Conforme\)/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("tab", { name: /Carburant/ }))
    expect(screen.getByText("Minimum requis au bloc")).toBeInTheDocument()
    expect(screen.getByText(/Données aéronautiques : cycle AIRAC 2610/)).toBeInTheDocument()
  })

  it("puts a blocking result in red", () => {
    render(<ResultsPanel result={BLOCKING_RESULT} reserveCase="VFR_DAY" roles={{}} />)
    expect(screen.getByText("Bilan : Bloquant")).toBeInTheDocument()
    expect(screen.getByText("Masse et centrage", { selector: "dt" }).nextSibling).toHaveTextContent("Hors limites")
  })
})
