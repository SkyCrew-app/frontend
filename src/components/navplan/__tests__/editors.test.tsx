import { useState } from "react"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { NAV_SEARCH } from "@/graphql/navdata"
import { appendWaypoint, emptyRoute, routePointFromNavPoint, setDeparture, setDestination, type RouteDraft } from "@/lib/navplan/route"
import type { MassUnit, VolumeUnit } from "@/lib/navplan/units"
import { LFOC, LFPN, MASS_BALANCE, P1, PERFORMANCE, RBT, RESULT } from "@/test/fixtures/flight-plan"
import { LoadEditor } from "../LoadEditor"
import { NumberField } from "../NumberField"
import { RouteEditor } from "../RouteEditor"

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// cmdk scrolls the active option into view.
Element.prototype.scrollIntoView = jest.fn()

const searchMock = (query: string, results: unknown[]): MockedResponse => ({
  request: { query: NAV_SEARCH },
  variableMatcher: (variables) => variables.query === query,
  result: { data: { navSearch: results } },
})

const baseRoute = (): RouteDraft =>
  setDestination(setDeparture(emptyRoute(2500), routePointFromNavPoint(LFPN)), routePointFromNavPoint(LFOC))

function RouteHarness({ initial, onRoute, ...props }: { initial: RouteDraft; onRoute?: (route: RouteDraft) => void } & Partial<React.ComponentProps<typeof RouteEditor>>) {
  const [route, setRoute] = useState(initial)
  return (
    <RouteEditor
      route={route}
      onChange={(next) => {
        setRoute(next)
        onRoute?.(next)
      }}
      {...props}
    />
  )
}

describe("RouteEditor", () => {
  it("finds a point in our data and adds it before the destination", async () => {
    const onRoute = jest.fn()
    render(
      <MockedProvider mocks={[searchMock("RBT", [{ ...RBT, __typename: "NavPoint" }])]}>
        <RouteHarness initial={baseRoute()} onRoute={onRoute} />
      </MockedProvider>,
    )
    await userEvent.click(screen.getByRole("combobox", { name: /Ajouter un point/ }))
    await userEvent.type(screen.getByPlaceholderText("Code OACI, nom, identifiant…"), "RBT")
    await userEvent.click(await screen.findByRole("option", { name: /RBT/ }, { timeout: 2000 }))

    const route = onRoute.mock.calls.at(-1)[0] as RouteDraft
    expect(route.waypoints.map((point) => point.ident)).toEqual(["RBT"])
    expect(route.legs).toHaveLength(2)
    expect(screen.getByRole("list", { name: "Points et branches" })).toHaveTextContent("RBT")
  })

  it("adds a free point from typed coordinates", async () => {
    const onRoute = jest.fn()
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={baseRoute()} onRoute={onRoute} />
      </MockedProvider>,
    )
    await userEvent.click(screen.getByRole("combobox", { name: /Ajouter un point/ }))
    await userEvent.type(screen.getByPlaceholderText("Code OACI, nom, identifiant…"), "48.42 1.62")
    await userEvent.click(await screen.findByRole("option", { name: "Point tournant à 48.4200, 1.6200" }))

    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).waypoints[0]).toEqual({ type: "USER", ident: "P1", name: "P1", lat: 48.42, lon: 1.62 })
  })

  it("moves and removes points with labelled buttons", async () => {
    const onRoute = jest.fn()
    const initial = appendWaypoint(appendWaypoint(baseRoute(), routePointFromNavPoint(RBT)), routePointFromNavPoint({ ...P1, type: "VRP", id: "vrp-1", ident: "W" }))
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={initial} onRoute={onRoute} />
      </MockedProvider>,
    )
    // A point of the strip opens on its place in the route and its removal.
    await userEvent.click(screen.getByRole("button", { name: /^Point tournant 1 : RBT/ }))
    expect(screen.getByRole("button", { name: "Déplacer RBT vers le départ" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Déplacer RBT vers l'arrivée" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).waypoints.map((point) => point.ident)).toEqual(["W", "RBT"])
    await userEvent.keyboard("{Escape}")
    await userEvent.click(screen.getByRole("button", { name: /^Point tournant 1 : W/ }))
    await userEvent.click(screen.getByRole("button", { name: "Retirer W" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).waypoints.map((point) => point.ident)).toEqual(["RBT"])
  })

  it("sets one cruise altitude for every leg, and another one for a leg the pilot opens", async () => {
    const onRoute = jest.fn()
    const initial = appendWaypoint(baseRoute(), routePointFromNavPoint(RBT))
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={initial} onRoute={onRoute} showErrors />
      </MockedProvider>,
    )
    // A leg is one chip of the strip; its own altitude only once opened.
    expect(screen.queryByLabelText("Altitude RBT → LFOC")).toBeNull()
    const toggle = screen.getByRole("button", { name: /^Branche RBT → LFOC :/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute("aria-expanded", "true")

    const second = screen.getByLabelText("Altitude RBT → LFOC")
    await userEvent.clear(second)
    await userEvent.type(second, "3500")
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs.map((leg) => leg.altitudeFt)).toEqual([2500, 3500])
    // A leg off the cruise altitude says so on its line.
    expect(toggle).toHaveTextContent(/3\s500 ft/)

    await userEvent.clear(second)
    await userEvent.type(second, "30000")
    expect(screen.getAllByText(/Indiquez une altitude entre 0 et 19\s500 ft\./).length).toBeGreaterThan(0)
    await userEvent.keyboard("{Escape}")

    const cruise = screen.getByLabelText("Altitude de croisière")
    await userEvent.clear(cruise)
    await userEvent.type(cruise, "4500")
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs.map((leg) => leg.altitudeFt)).toEqual([4500, 4500])
  })

  it("writes the course, distance and time of each leg, only while they are those of its two points", () => {
    const computed = [RESULT.legs[0]]
    const { rerender } = render(
      <MockedProvider mocks={[]}>
        <RouteEditor route={setDestination(baseRoute(), routePointFromNavPoint(RBT))} onChange={jest.fn()} computedLegs={computed} />
      </MockedProvider>,
    )
    expect(screen.getByRole("button", { name: /^Branche LFPN → RBT :/ })).toHaveTextContent(/Rm \d{3}° · 5,2 NM · \d+ min/)
    rerender(
      <MockedProvider mocks={[]}>
        <RouteEditor route={baseRoute()} onChange={jest.fn()} computedLegs={computed} />
      </MockedProvider>,
    )
    expect(screen.getByRole("button", { name: /^Branche LFPN → LFOC :/ })).toHaveTextContent("en attente du calcul")
  })

  it("offers the semicircular suggestion of the API and a typed wind", async () => {
    const onRoute = jest.fn()
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness
          initial={baseRoute()}
          onRoute={onRoute}
          computedLegs={[{ ...RESULT.legs[0], from: LFPN, to: LFOC, suggestedAltitudeFt: 4500 }]}
        />
      </MockedProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: /^Branche LFPN → LFOC :/ }))
    expect(screen.getByText(/Niveau conseillé : 4\s500 ft/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Utiliser" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs[0].altitudeFt).toBe(4500)

    expect(screen.getByRole("radio", { name: "Prévision" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(screen.getByRole("radio", { name: "Saisi" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs[0].windOverride).toEqual({ directionDeg: 270, speedKt: 15 })
    await userEvent.click(screen.getByRole("radio", { name: "Prévision" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs[0].windOverride).toBeNull()
  })

  it("renames a turning point from its chip", async () => {
    const onRoute = jest.fn()
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={appendWaypoint(baseRoute(), routePointFromNavPoint(P1))} onRoute={onRoute} />
      </MockedProvider>,
    )
    await userEvent.click(screen.getByRole("button", { name: /^Point tournant 1 : P1/ }))
    const name = screen.getByLabelText("Nom du point 1")
    await userEvent.clear(name)
    await userEvent.type(name, "Château{Enter}")
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).waypoints[0].ident).toBe("Château")
    // The strip wraps onto new lines: it never scrolls inside itself.
    expect(screen.getByRole("list", { name: "Points et branches" })).toHaveClass("flex-wrap")
  })

  it("says which aerodrome is missing", () => {
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={emptyRoute()} showErrors />
      </MockedProvider>,
    )
    expect(screen.getByText("Choisissez l'aérodrome de départ.")).toBeInTheDocument()
    expect(screen.getByText("Choisissez l'aérodrome d'arrivée.")).toBeInTheDocument()
  })
})

function LoadHarness({ onLoad, onFuel }: { onLoad: jest.Mock; onFuel: jest.Mock }) {
  const [loads, setLoads] = useState<Record<string, number | null>>({ front: 160, rear: null, baggage: 70 })
  const [fuel, setFuel] = useState<Record<string, number | null>>({ main: null })
  const [massUnit, setMassUnit] = useState<MassUnit>("kg")
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("L")
  return (
    <LoadEditor
      stations={MASS_BALANCE.stations}
      tanks={PERFORMANCE.fuel.tanks}
      loads={loads}
      fuel={fuel}
      massUnit={massUnit}
      volumeUnit={volumeUnit}
      onMassUnitChange={setMassUnit}
      onVolumeUnitChange={setVolumeUnit}
      onLoadChange={(id, value) => {
        setLoads((current) => ({ ...current, [id]: value }))
        onLoad(id, value)
      }}
      onFuelChange={(id, value) => {
        setFuel((current) => ({ ...current, [id]: value }))
        onFuel(id, value)
      }}
    />
  )
}

describe("LoadEditor", () => {
  it("asks a mass per seat and baggage area, with the limit of each", () => {
    render(<LoadHarness onLoad={jest.fn()} onFuel={jest.fn()} />)
    expect(screen.getByLabelText("Sièges avant (kg)")).toHaveValue("160")
    expect(screen.getByLabelText("Bagages (kg)")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Maximum 60 kg")).toBeInTheDocument()
    // Fuel is entered by tank, not as a station.
    expect(screen.queryByLabelText("Carburant (kg)")).toBeNull()
  })

  it("converts pounds and US gallons to kilograms and litres", async () => {
    const onLoad = jest.fn()
    const onFuel = jest.fn()
    render(<LoadHarness onLoad={onLoad} onFuel={onFuel} />)

    await userEvent.click(screen.getByRole("radio", { name: "lb" }))
    expect(screen.getByLabelText("Sièges avant (lb)")).toHaveValue("352.7")
    const rear = screen.getByLabelText("Sièges arrière (lb)")
    await userEvent.type(rear, "165")
    expect(onLoad).toHaveBeenLastCalledWith("rear", expect.closeTo(74.843, 3))

    await userEvent.click(screen.getByRole("radio", { name: "USG" }))
    await userEvent.type(screen.getByLabelText("Réservoir principal (USG)"), "20")
    expect(onFuel).toHaveBeenLastCalledWith("main", expect.closeTo(75.708, 3))
  })

  it("fills a tank to its usable capacity", async () => {
    const onFuel = jest.fn()
    render(<LoadHarness onLoad={jest.fn()} onFuel={onFuel} />)
    await userEvent.click(screen.getByRole("button", { name: "Plein" }))
    expect(onFuel).toHaveBeenLastCalledWith("main", 107)
    expect(screen.getByLabelText("Réservoir principal (L)")).toHaveValue("107")
  })
})

describe("NumberField", () => {
  it("accepts a decimal comma and keeps what is being typed", async () => {
    const onValueChange = jest.fn()
    render(
      <>
        <label htmlFor="arm">Bras</label>
        <NumberField id="arm" value={null} onValueChange={onValueChange} />
      </>,
    )
    await userEvent.type(screen.getByLabelText("Bras"), "0,41")
    expect(screen.getByLabelText("Bras")).toHaveValue("0,41")
    expect(onValueChange).toHaveBeenLastCalledWith(0.41)
    await userEvent.clear(screen.getByLabelText("Bras"))
    expect(onValueChange).toHaveBeenLastCalledWith(null)
  })
})

describe("route list", () => {
  it("lists the departure first, then the points in order, then the destination, as a strip that wraps", () => {
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={appendWaypoint(baseRoute(), routePointFromNavPoint(RBT))} />
      </MockedProvider>,
    )
    const strip = screen.getByRole("list", { name: "Points et branches" })
    const items = within(strip).getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("LFPN")
    // Departure ▸ leg ▸ point ▸ leg ▸ destination, then the chips to add a point and the alternate.
    expect(items[4]).toHaveTextContent("LFOC")
    expect(strip).toHaveTextContent(/^Aérodrome de départ.*LFPN.*RBT.*Aérodrome d'arrivée.*LFOC.*Ajouter un point.*Dégagement/)
  })
})
