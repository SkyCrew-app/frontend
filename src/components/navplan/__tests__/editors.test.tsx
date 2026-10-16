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
    await userEvent.click(await screen.findByRole("option", { name: "Point libre à 48.4200, 1.6200" }))

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
    expect(screen.getByRole("button", { name: "Monter RBT" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Descendre RBT" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).waypoints.map((point) => point.ident)).toEqual(["W", "RBT"])
    await userEvent.click(screen.getByRole("button", { name: "Retirer W" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).waypoints.map((point) => point.ident)).toEqual(["RBT"])
  })

  it("sets the altitude of one leg, or of all of them, and refuses an impossible one", async () => {
    const onRoute = jest.fn()
    const initial = appendWaypoint(baseRoute(), routePointFromNavPoint(RBT))
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={initial} onRoute={onRoute} showErrors />
      </MockedProvider>,
    )
    const second = screen.getByLabelText("Altitude RBT → LFOC")
    await userEvent.clear(second)
    await userEvent.type(second, "3500")
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs.map((leg) => leg.altitudeFt)).toEqual([2500, 3500])

    await userEvent.clear(second)
    await userEvent.type(second, "30000")
    expect(screen.getByText(/Indiquez une altitude entre 0 et 19\s500 ft\./)).toBeInTheDocument()

    const cruise = screen.getByLabelText("Altitude de croisière")
    await userEvent.clear(cruise)
    await userEvent.type(cruise, "4500")
    await userEvent.click(screen.getByRole("button", { name: "Appliquer à toutes les branches" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs.map((leg) => leg.altitudeFt)).toEqual([4500, 4500])
  })

  it("offers the semicircular suggestion of the API and a typed wind", async () => {
    const onRoute = jest.fn()
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness
          initial={baseRoute()}
          onRoute={onRoute}
          computedLegs={[{ ...RESULT.legs[0], suggestedAltitudeFt: 4500 }]}
        />
      </MockedProvider>,
    )
    expect(screen.getByText(/Niveau conseillé : 4\s500 ft/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Utiliser" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs[0].altitudeFt).toBe(4500)

    await userEvent.click(screen.getByRole("switch", { name: "Vent saisi" }))
    expect((onRoute.mock.calls.at(-1)[0] as RouteDraft).legs[0].windOverride).toEqual({ directionDeg: 270, speedKt: 15 })
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
  it("lists the departure first and the destination last", () => {
    render(
      <MockedProvider mocks={[]}>
        <RouteHarness initial={appendWaypoint(baseRoute(), routePointFromNavPoint(RBT))} />
      </MockedProvider>,
    )
    const items = within(screen.getByRole("list", { name: "Points et branches" })).getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("LFPN")
    expect(items.at(-1)).toHaveTextContent("LFOC")
  })
})
