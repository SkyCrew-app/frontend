import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AirspaceCrossings, airspacesNotChecked, crossedAirspaces, crossingsStatus } from "../AirspaceCrossings"
import { FuelSummary } from "../FuelSummary"
import { ChecksList } from "../PlanSummary"
import { MassBalanceChart, labelBelow } from "../MassBalanceChart"
import { PrintableNavLog, printedQnh } from "../PrintableNavLog"
import { MassBalancePanel } from "../MassBalancePanel"
import { NavLogTable, legProfileNotes } from "../NavLogTable"
import { NavdataAge, NoticesList } from "../NoticesBanner"
import { ResultsPanel } from "../ResultsPanel"
import { WeatherPanel } from "../WeatherPanel"
import { FlightConditions } from "../FlightConditions"
import { BLOCKING_RESULT, NAVDATA, NIGHT_RESULT, RESULT, SETTINGS, SAVED_PLAN } from "@/test/fixtures/flight-plan"

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const LOG = "Log de navigation, point par point"
// R 97 MONCE, AIRAC 2610: its activity as the API gives it once cleaned.
const R_ZONE_ACTIVITY = { ...RESULT.legs[1].crossings[0].airspace, name: "R 97 MONCE", activity: "Activités vélivoles.\nGliding activities" }
const rowOf = (table: HTMLElement, point: RegExp) => within(table).getByRole("rowheader", { name: point }).closest("tr") as HTMLElement
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell").map((cell) => cell.textContent)

describe("NavLogTable", () => {
  it("writes one line per point, as on the paper log, with the figures of the leg that reaches it", () => {
    render(<NavLogTable legs={RESULT.legs} alternateLeg={RESULT.alternateLeg} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    const table = screen.getByRole("table", { name: LOG })
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Point",
      "Fréq.MHz",
      "Alt.ft",
      "Rv",
      "Rm",
      "Vent°/kt",
      "X",
      "Cm",
      "Vpkt",
      "Vskt",
      "Dist.NM",
      "Tempsmin",
      "HE prévueUTC",
      "HE réelleUTC",
      "Carb. restantL",
      "Carb. réelL",
    ])
    // The abbreviations of the paper log are spelt out.
    expect(within(table).getByTitle("Route magnétique")).toHaveTextContent("Rm")
    expect(within(table).getByTitle("Cap magnétique à tenir")).toHaveTextContent("Cm")

    // P1 is reached by the RBT → P1 leg: its own figures, not those of the next one (defect of the former log).
    const p1 = cellsOf(rowOf(table, /^P1/))
    expect(p1.slice(1, 13)).toEqual([expect.stringMatching(/^2\s500$/), "225°", "223°", "270/15", "−7°", "215°", "105", "95", expect.stringMatching(/^17,3Σ /), "11Σ 15", "09:18", ""])
    expect(p1[13]).toBe("70")
    // Blank boxes for the actual time and fuel, written in flight.
    expect(p1[12]).toBe("")
    expect(p1[14]).toBe("")
    // The departure line: the fuel when the first leg starts, nothing else computed.
    expect(cellsOf(rowOf(table, /^LFPN/))[13]).toBe("77")
    expect(rowOf(table, /^Dégagement LFOT/)).toBeInTheDocument()
    expect(within(table).getByRole("rowheader", { name: "Total" }).closest("tr")).toHaveTextContent("45,4")
  })

  it("gives the frequency of a navaid and of the areas to contact on its line", () => {
    render(<NavLogTable legs={RESULT.legs} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    const table = screen.getByRole("table", { name: LOG })
    // And of the areas to contact on the leg that reaches it.
    expect(cellsOf(rowOf(table, /^RBT/))[0]).toBe("114.70 · TMA PARIS 1 119.850")
  })

  it("never shows a calm wind assumed without a forecast as a forecast", () => {
    const [first, ...others] = RESULT.legs
    const noForecast = { ...first, wind: { ...first.wind, directionDeg: 0, speedKt: 0, source: "NONE" as const } }
    render(<NavLogTable legs={[noForecast, ...others]} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    const table = screen.getByRole("table", { name: LOG })
    expect(rowOf(table, /^RBT/)).toHaveTextContent("0 (sans prévision)")
    expect(rowOf(table, /^P1/)).toHaveTextContent("270/15")
  })

  it("tells where the climb ends and the descent starts", () => {
    expect(legProfileNotes(RESULT.legs[0])).toEqual({ toc: 3.9 })
    expect(legProfileNotes(RESULT.legs[2])).toEqual({ tod: 15.4 })
    render(<NavLogTable legs={RESULT.legs} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    expect(screen.getAllByText("Fin de montée à 3,9 NM").length).toBeGreaterThan(0)
  })

  it("gives the phone one card per leg with heading, time and fuel first", () => {
    render(<NavLogTable legs={RESULT.legs} totalDistanceNm={45.4} totalTimeMin={29.6} />)
    const cards = screen.getByRole("list", { name: LOG })
    const first = within(cards).getAllByRole("listitem")[0]
    expect(first).toHaveTextContent("LFPN → RBT")
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

describe("labels of the envelope chart", () => {
  it("puts a label under its point when an earlier point is close, so DÉC and ATT do not overlap", () => {
    expect(labelBelow([[100, 100]], [108, 104])).toBe(true)
    expect(labelBelow([[100, 100]], [200, 100])).toBe(false)
    expect(labelBelow([], [100, 100])).toBe(false)
  })
})

describe("paper nav log", () => {
  it("prints the QNH the plan was computed with, the departure METAR's when the pilot left it blank", () => {
    expect(printedQnh(1021)).toBe("1021 hPa")
    expect(printedQnh(1013.25)).toBe("1013 hPa")
    expect(printedQnh(null)).toBe("—")
  })

  it("prints where the QNH comes from, and no AIRAC cycle for aerodromes-only data", () => {
    render(
      <PrintableNavLog
        result={{ ...RESULT, qnhObservedAt: "2026-10-16T17:30:00.000Z", navdata: { ...NAVDATA, airac: "OURAIRPORTS", effectiveFrom: "2026-10-16T00:00:00.000Z" } }}
        input={SAVED_PLAN.input}
        aircraft="F-GAER"
        pilot="Jean Dupont"
        format="A5"
      />,
    )
    const log = document.querySelector(".navlog-print")!
    expect(log).toHaveTextContent("QNH : 1018 hPa (METAR LFPN de 16/10 17:30Z)")
    expect(log).toHaveTextContent("Données aérodromes OurAirports du 16 oct. 2026, pas de cycle AIRAC")
    expect(log).not.toHaveTextContent("AIRAC : OURAIRPORTS")
  })

  it("has the columns and the lines of the nav log on screen", () => {
    render(
      <>
        <NavLogTable legs={RESULT.legs} alternateLeg={RESULT.alternateLeg} totalDistanceNm={45.4} totalTimeMin={29.6} />
        <PrintableNavLog result={RESULT} input={SAVED_PLAN.input} aircraft="F-GAER" pilot="Jean Dupont" format="A5" />
      </>,
    )
    const printed = document.querySelector(".navlog-print table") as HTMLTableElement
    const screenTable = screen.getByRole("table", { name: LOG })
    const texts = (table: HTMLTableElement) => [...table.querySelectorAll("thead th")].map((cell) => cell.textContent)
    expect(texts(printed)).toEqual(texts(screenTable as HTMLTableElement))
    const firstCells = (table: Element) => [...table.querySelectorAll("tbody tr")].map((row) => row.firstElementChild?.textContent)
    expect(firstCells(printed)).toEqual(firstCells(screenTable))
    expect(printed.querySelectorAll("tbody tr")[2].textContent).toContain("09:18")
  })

  it("is printed from <body> with its reserve and endurance line, which a <footer> would lose", () => {
    render(<PrintableNavLog result={RESULT} input={SAVED_PLAN.input} aircraft="F-GAER" pilot="Jean Dupont" format="A5" />)
    const log = document.querySelector(".navlog-print")!
    expect(log.parentElement).toBe(document.body)
    expect(log.querySelector("footer")).toBeNull()
    expect(log).toHaveTextContent("Réserve finale")
    expect(log).toHaveTextContent("NOTAM et SUP AIP consultés")
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

  it("names each area crossed once, with its worst crossing, and leaves out those flown over or under", () => {
    const again = { ...RESULT.legs[0].crossings[0], entryNm: 0, status: "BLOCKING" as const }
    const legs = [RESULT.legs[0], { ...RESULT.legs[1], crossings: [...RESULT.legs[1].crossings, again] }]
    expect(crossedAirspaces(legs).map((crossing) => [crossing.airspace.name, crossing.status])).toEqual([
      ["TMA PARIS 1", "BLOCKING"],
      ["R 45 A", "WARNING"],
    ])
  })

  it("names the first three frequencies of an area and how many more (TMA PARIS: fifteen sectors)", () => {
    const frequencies = ["135.405", "135.550", "127.080", "131.180", "128.875"].map((mhz) => ({ service: "ACS", callsign: "PARIS Contrôle", mhz }))
    const crossing = { ...RESULT.legs[0].crossings[0], airspace: { ...RESULT.legs[0].crossings[0].airspace, frequencies } }
    render(<AirspaceCrossings legs={[{ ...RESULT.legs[0], crossings: [crossing] }]} />)
    expect(
      screen.getByText(/^PARIS Contrôle 135.405 · PARIS Contrôle 135.550 · PARIS Contrôle 127.080 \(\+ 2 autres fréquences\)$/),
    ).toBeInTheDocument()
  })

  it("writes the activity published by the SIA on its lines, French then English", () => {
    const crossing = { ...RESULT.legs[1].crossings[0], airspace: { ...R_ZONE_ACTIVITY } }
    render(<AirspaceCrossings legs={[{ ...RESULT.legs[1], crossings: [crossing] }]} />)
    const activity = screen.getByText(/Activité publiée/)
    expect(activity).toHaveClass("whitespace-pre-line")
    expect(activity.textContent).toBe("Activité publiée : Activités vélivoles.\nGliding activities")
  })

  it("is blocking with a prohibited area", () => {
    const legs = [{ ...RESULT.legs[0], crossings: [{ ...RESULT.legs[0].crossings[0], status: "BLOCKING" as const }] }]
    expect(crossingsStatus(legs)).toBe("BLOCKING")
    expect(crossingsStatus([{ ...RESULT.legs[2] }])).toBe("OK")
  })
})

describe("areas without a published outline", () => {
  const park = {
    airspace: { ...RESULT.legs[0].crossings[0].airspace, id: "prn-390", name: "PRN 390 PARC NATIONAL DES CEVENNES", type: "PROTECTED" as const, outlineKnown: false },
    distanceNm: 12.4,
    status: "WARNING" as const,
    message: "Zone non vérifiée : PRN 390 PARC NATIONAL DES CEVENNES, tracé non disponible — la repérer sur la carte en vigueur.",
  }

  it("lists them in the airspace section, never says no area is crossed, and is not OK", () => {
    const legs = [{ ...RESULT.legs[2], crossings: [] }]
    render(<AirspaceCrossings legs={legs} unverified={[park, { ...park, airspace: { ...park.airspace, id: "lta" }, distanceNm: null }]} />)
    const section = screen.getByRole("region", { name: "Zones non vérifiées : tracé non disponible" })
    expect(within(section).getAllByText(/^Zone non vérifiée : PRN 390 PARC NATIONAL DES CEVENNES, tracé non disponible/)).toHaveLength(2)
    expect(section).toHaveTextContent("point publié à 12,4 NM de la route")
    expect(section).toHaveTextContent("position non localisable")
    expect(screen.queryByText("Aucune zone traversée sur la route prévue.")).toBeNull()
    expect(crossingsStatus(legs, false, [park])).toBe("WARNING")
    expect(crossingsStatus(legs, false, [])).toBe("OK")
  })
})

describe("points to check", () => {
  it("puts a non-breaking space before the colon of the status and a space after it", () => {
    render(<ChecksList checks={[{ key: "a", status: "WARNING", message: "Aucune donnée d’espace aérien importée" }]} />)
    const item = screen.getByRole("listitem")
    expect(item.textContent).toBe("À vérifier\u00a0: Aucune donnée d’espace aérien importée")
    // The space is not inside the hidden prefix, where a browser drops it from the text read out and copied.
    const prefix = item.querySelector(".sr-only")!
    expect(prefix.textContent).toBe("À vérifier\u00a0:")
    expect(prefix.nextSibling?.textContent?.startsWith(" ")).toBe(true)
  })
})

describe("airspaces without airspace data", () => {
  it("says the route was not checked, never that no area is crossed, and is not OK", () => {
    const legs = [{ ...RESULT.legs[2], crossings: [] }]
    render(<AirspaceCrossings legs={legs} notChecked />)
    expect(screen.getByText("Zones non vérifiées")).toBeInTheDocument()
    expect(screen.queryByText("Aucune zone traversée sur la route prévue.")).toBeNull()
    expect(airspacesNotChecked([{ code: "NAVDATA_NO_AIRSPACE" }])).toBe(true)
    expect(airspacesNotChecked([{ code: "DISCLAIMER" }])).toBe(false)
    expect(crossingsStatus(legs, true)).toBe("WARNING")
    expect(crossingsStatus(legs)).toBe("OK")
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

  it("gives the validity of each TAF", () => {
    render(<WeatherPanel reports={RESULT.weather} roles={{ LFPN: "departure" }} windSource={RESULT.windSource} />)
    expect(screen.getAllByText(/Valable du 17\/10 06:00Z au 17\/10 15:00Z/)).toHaveLength(2)
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

  it("shows the reserve the API applied to a night flight, not the day case chosen", async () => {
    render(<ResultsPanel result={NIGHT_RESULT} reserveCase="VFR_DAY" roles={{}} departureTime="2026-10-17T18:30:00.000Z" />)
    await userEvent.click(screen.getByRole("tab", { name: /Carburant/ }))
    expect(screen.getByText(/^VFR de nuit : 45 min au débit d'attente/)).toBeInTheDocument()
    expect(screen.queryByText(/^VFR de jour : /)).toBeNull()
  })

  it("puts a blocking result in red", () => {
    render(<ResultsPanel result={BLOCKING_RESULT} reserveCase="VFR_DAY" roles={{}} />)
    expect(screen.getByText("Bilan : Bloquant")).toBeInTheDocument()
    expect(screen.getByText("Masse et centrage", { selector: "dt" }).nextSibling).toHaveTextContent("Hors limites")
  })
})

describe("FlightConditions", () => {
  it("gives day or night, the twilight, sunrise and sunset of each aerodrome, and the QNH source", () => {
    render(<FlightConditions result={RESULT} departureTime="2026-10-17T09:00:00.000Z" />)
    expect(screen.getByText(/^Vol entièrement de jour/)).toBeInTheDocument()
    const table = screen.getByRole("table", { name: "Crépuscule civil, lever et coucher du soleil aux aérodromes du plan (UTC)" })
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Aérodrome",
      "Début crép. civil",
      "Lever",
      "Coucher",
      "Fin crép. civil",
    ])
    const departure = within(table).getByRole("row", { name: /LFPN/ })
    expect(departure).toHaveTextContent("LFPN Départ · 17/10 09:00Z")
    expect(within(departure).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["05:44Z", "06:15Z", "16:58Z", "17:29Z"])
    expect(screen.getByText("QNH 1018 hPa : METAR LFPN de 08:30Z.")).toBeInTheDocument()
  })

  it("says when the flight is partly at night, with the time", () => {
    render(<FlightConditions result={NIGHT_RESULT} departureTime="2026-10-17T18:30:00.000Z" />)
    expect(screen.getByText(/^Vol en partie de nuit à partir de 19:00Z/)).toBeInTheDocument()
  })

  it("names an old METAR's day and a QNH left to the standard atmosphere", () => {
    const { rerender } = render(<FlightConditions result={{ ...RESULT, qnhObservedAt: "2026-10-16T17:30:00.000Z" }} departureTime="2026-10-17T09:00:00.000Z" />)
    expect(screen.getByText("QNH 1018 hPa : METAR LFPN de 16/10 17:30Z.")).toBeInTheDocument()
    rerender(<FlightConditions result={{ ...RESULT, qnhHpa: 1013.25, qnhSource: "DEFAULT", qnhStation: null }} />)
    expect(screen.getByText("QNH 1013 hPa : inconnu, atmosphère standard.")).toBeInTheDocument()
  })
})
