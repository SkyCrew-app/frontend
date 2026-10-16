import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { AIRCRAFT_FLIGHT_DATA, FLIGHT_PLANNING_SETTINGS } from "@/graphql/aircraft-data"
import { NAVDATA_INFO } from "@/graphql/navdata"
import { COMPUTE_FLIGHT_PLAN, FLIGHT_PLAN, SAVE_FLIGHT_PLAN } from "@/graphql/navplan"
import { GET_USER_RESERVATIONS } from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import type { AeroMapProps } from "@/components/map/types"
import { MASS_BALANCE, NAVDATA, PERFORMANCE, RESULT, SAVED_PLAN, SETTINGS, asApiPlan, asApiResult } from "@/test/fixtures/flight-plan"
import FlightPlanBuilderPage from "../page"

const mockPush = jest.fn()
let mockSearch = ""
jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "55" }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockSearch),
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

const reservation = {
  __typename: "Reservation",
  id: 55,
  start_time: "2026-10-17T09:00:00.000Z",
  end_time: "2026-10-17T11:00:00.000Z",
  purpose: "Navigation",
  flight_category: "LOCAL",
  status: "CONFIRMED",
  notes: null,
  charged_amount: 300,
  aircraft: { __typename: "Aircraft", id: 7, registration_number: "F-TEST" },
  user: { __typename: "User", id: 42, first_name: "Jean", last_name: "Dupont" },
  instructor: null,
  flights: [],
}

const typed = <T extends object>(value: T, typename: string) => ({ ...JSON.parse(JSON.stringify(value)), __typename: typename })

const common = (reservations = [reservation]): MockedResponse[] => [
  { request: { query: GET_USER_RESERVATIONS, variables: { userId: 42 } }, result: { data: { userReservations: reservations } }, maxUsageCount: 3 },
  {
    request: { query: AIRCRAFT_FLIGHT_DATA, variables: { aircraftId: 7 } },
    result: {
      data: {
        aircraftPerformance: typed({ ...PERFORMANCE, fuel: { ...PERFORMANCE.fuel, tanks: PERFORMANCE.fuel.tanks.map((tank) => typed(tank, "FuelTank")) } }, "AircraftPerformance"),
        aircraftMassBalance: typed(MASS_BALANCE, "AircraftMassBalance"),
      },
    },
  },
  { request: { query: FLIGHT_PLANNING_SETTINGS }, result: { data: { flightPlanningSettings: typed(SETTINGS, "FlightPlanningSettings") } } },
  { request: { query: NAVDATA_INFO }, result: { data: { navdataInfo: typed(NAVDATA, "NavdataInfo") } } },
  { request: { query: COMPUTE_FLIGHT_PLAN }, variableMatcher: () => true, result: { data: { computeFlightPlan: asApiResult(RESULT) } }, maxUsageCount: 10 },
]

beforeEach(() => {
  mockSearch = ""
  mockPush.mockReset()
})

describe("flight plan builder page", () => {
  it("prepares the flight of the booking: aircraft and off-block time come from it", async () => {
    render(
      <MockedProvider mocks={common()}>
        <FlightPlanBuilderPage />
      </MockedProvider>,
    )
    expect(await screen.findByRole("heading", { level: 1, name: "Créer un plan de vol" })).toBeInTheDocument()
    expect(screen.getByText(/Pour la réservation de F-TEST/)).toBeInTheDocument()
    expect(await screen.findByLabelText("Heure de départ bloc (heure locale)")).toBeInTheDocument()
    expect(screen.getByText(/Soit 09:00 UTC/)).toBeInTheDocument()
    expect(screen.getByLabelText("Sièges avant (kg)")).toBeInTheDocument()
    expect(screen.getByText(/Choisissez au moins l'aérodrome de départ/)).toBeInTheDocument()
  })

  it("says so when the booking is not the member's", async () => {
    render(
      <MockedProvider mocks={common([])}>
        <FlightPlanBuilderPage />
      </MockedProvider>,
    )
    expect(await screen.findByText("Réservation introuvable")).toBeInTheDocument()
  })

  it("re-opens a saved plan, saves it in place and opens the flight", async () => {
    mockSearch = "plan=41"
    let sent: Record<string, unknown> | null = null
    render(
      <MockedProvider
        mocks={[
          ...common(),
          { request: { query: FLIGHT_PLAN, variables: { id: 41 } }, result: { data: { flightPlan: asApiPlan(SAVED_PLAN) } } },
          { request: { query: GET_AIRCRAFTS }, result: { data: { getAircrafts: [] } } },
          {
            request: { query: SAVE_FLIGHT_PLAN },
            variableMatcher: (variables) => {
              sent = variables
              return true
            },
            result: { data: { saveFlightPlan: { __typename: "FlightPlan", id: 41, flightId: 120 } } },
          },
        ]}
      >
        <FlightPlanBuilderPage />
      </MockedProvider>,
    )
    expect(await screen.findByRole("heading", { level: 1, name: "Modifier la préparation du vol" })).toBeInTheDocument()
    expect(await screen.findByText("Bilan : À vérifier", {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByTestId("map")).toHaveTextContent("LFPN RBT P1 LFOC")

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/reservations/flight-plans/120"))
    expect(sent).toMatchObject({ flightPlanId: 41, input: { reservationId: 55, aircraftId: 7, waypoints: SAVED_PLAN.input.waypoints } })
    expect(mockToast).toHaveBeenCalledWith({ title: "Préparation enregistrée" })
  })
})
