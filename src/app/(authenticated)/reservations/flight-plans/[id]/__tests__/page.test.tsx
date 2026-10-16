import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { GET_FLIGHT_PLAN_BY_ID } from "@/graphql/flights"
import { FLIGHT_PLANNING_SETTINGS } from "@/graphql/aircraft-data"
import { EXPORT_FLIGHT_PLAN_PDF, FLIGHT_PLAN_BY_FLIGHT } from "@/graphql/navplan"
import type { AeroMapProps } from "@/components/map/types"
import { SAVED_PLAN, SETTINGS, asApiPlan } from "@/test/fixtures/flight-plan"
import FlightPlanDetails from "../page"

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "120" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))
jest.mock("@/components/hooks/userHooks", () => ({
  useCurrentUser: () => "pilote@example.com",
  useUserData: () => ({ id: 42, role: { role_name: "Pilote" } }),
}))
const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}))
const mockDownload = jest.fn()
jest.mock("@/lib/download", () => ({ downloadBase64Pdf: (...args: unknown[]) => mockDownload(...args) }))
// The map needs WebGL: a stand-in lists the points it was given.
jest.mock("next/dynamic", () => () =>
  function MapStandIn(props: AeroMapProps) {
    return <div data-testid="map">{props.points.map((point) => point.ident).join(" ")}</div>
  },
)

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const flight = (overrides: Record<string, unknown> = {}) => ({
  __typename: "Flight",
  id: 120,
  remarks: null,
  closed_at: null,
  flight_hours: 1,
  flight_type: "VFR",
  origin_icao: "LFPN",
  destination_icao: "LFOC",
  weather_conditions: null,
  number_of_passengers: 1,
  encoded_polyline: "",
  distance_km: 84,
  estimated_flight_time: 0.5,
  departure_time: "2026-10-17T09:00:00.000Z",
  arrival_time: "2026-10-17T09:30:00.000Z",
  waypoints: null,
  departure_airport_info: null,
  arrival_airport_info: null,
  detailed_waypoints: null,
  fuel_policy: null,
  wind_summary: null,
  performance_profile: null,
  estimated_fuel_liters: 14,
  plan_engine: "navplan-1",
  user: { __typename: "User", id: 42, first_name: "Jean", last_name: "Dupont", email: "pilote@example.com" },
  instructor: null,
  reservation: {
    __typename: "Reservation",
    id: 55,
    start_time: "2099-10-17T09:00:00.000Z",
    end_time: "2099-10-17T11:00:00.000Z",
    purpose: "Navigation",
    status: "CONFIRMED",
    notes: null,
    flight_category: "LOCAL",
    instructor: null,
    aircraft: {
      __typename: "Aircraft",
      id: 7,
      registration_number: "F-TEST",
      model: "Avion d'essai",
      cruiseSpeed: 105,
      consumption: 28,
      maxAltitude: 13000,
      total_flight_hours: 1000,
      image_url: null,
    },
  },
  ...overrides,
})

const mocks = (plan: unknown, flightOverrides: Record<string, unknown> = {}): MockedResponse[] => [
  { request: { query: GET_FLIGHT_PLAN_BY_ID, variables: { id: 120 } }, result: { data: { getFlightById: flight(flightOverrides) } } },
  { request: { query: FLIGHT_PLAN_BY_FLIGHT, variables: { flightId: 120 } }, result: { data: { flightPlanByFlight: plan ? asApiPlan(plan as typeof SAVED_PLAN) : null } } },
  { request: { query: FLIGHT_PLANNING_SETTINGS }, result: { data: { flightPlanningSettings: { ...SETTINGS, __typename: "FlightPlanningSettings" } } } },
]

describe("flight plan page", () => {
  it("shows the computed plan, its nav log and mass and balance, and lets the pilot change it", async () => {
    render(
      <MockedProvider mocks={mocks(SAVED_PLAN)}>
        <FlightPlanDetails />
      </MockedProvider>,
    )
    expect(await screen.findByRole("heading", { level: 1, name: /LFPN → LFOC/ })).toBeInTheDocument()
    expect(screen.getByRole("table", { name: "Log de navigation, branche par branche" })).toHaveTextContent("LFPN → RBT")
    expect(screen.getByTestId("map")).toHaveTextContent("LFPN RBT P1 LFOC")
    expect(screen.getByRole("link", { name: "Modifier la préparation" })).toHaveAttribute("href", "/reservations/flight-plans/create/55?plan=41")
    // On screen, and again on the printed log.
    expect(screen.getAllByText(/Aide à la préparation du vol/)).toHaveLength(2)
    expect(screen.queryByText("Ancien calcul")).toBeNull()
    // The booking has not started: closing is not offered.
    expect(screen.queryByRole("link", { name: "Clôturer le vol" })).toBeNull()
  })

  it("downloads the flight briefing PDF made by the API", async () => {
    render(
      <MockedProvider
        mocks={[
          ...mocks(SAVED_PLAN),
          { request: { query: EXPORT_FLIGHT_PLAN_PDF, variables: { flightPlanId: 41, format: "A4" } }, result: { data: { exportFlightPlanPdf: "JVBERi0=" } } },
        ]}
      >
        <FlightPlanDetails />
      </MockedProvider>,
    )
    await userEvent.click(await screen.findByRole("button", { name: /Imprimer/ }))
    await userEvent.click(await screen.findByRole("menuitem", { name: "Dossier A4" }))
    await waitFor(() => expect(mockDownload).toHaveBeenCalledWith("JVBERi0=", expect.stringMatching(/^dossier-de-vol-LFPN-LFOC-.*\.pdf$/)))
  })

  it("keeps showing a plan of the former generator, marked as such", async () => {
    render(
      <MockedProvider
        mocks={mocks(null, {
          plan_engine: "legacy",
          waypoints: JSON.stringify([
            { ident: "LFPN", type: "APT", lat: 48.75, lon: 2.1, alt: 538, name: "Toussus" },
            { ident: "LFOC", type: "APT", lat: 48.06, lon: 1.38, alt: 433, name: "Châteaudun" },
          ]),
        })}
      >
        <FlightPlanDetails />
      </MockedProvider>,
    )
    expect(await screen.findByRole("heading", { level: 1, name: /LFPN → LFOC/ })).toBeInTheDocument()
    expect(screen.getAllByText("Ancien calcul").length).toBeGreaterThan(0)
    expect(screen.getByText(/ses calculs ne sont pas garantis/)).toBeInTheDocument()
    expect(screen.getByTestId("map")).toHaveTextContent("LFPN LFOC")
    expect(screen.queryByRole("link", { name: "Modifier la préparation" })).toBeNull()
  })

  it("offers to close the flight once its booking has started", async () => {
    render(
      <MockedProvider
        mocks={mocks(SAVED_PLAN, {
          reservation: { ...flight().reservation, start_time: "2020-10-17T09:00:00.000Z", end_time: "2020-10-17T11:00:00.000Z" },
        })}
      >
        <FlightPlanDetails />
      </MockedProvider>,
    )
    expect(await screen.findByRole("link", { name: "Clôturer le vol" })).toHaveAttribute("href", "/close_flight/120")
  })
})
