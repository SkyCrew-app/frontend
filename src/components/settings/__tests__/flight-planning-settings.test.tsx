import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { FLIGHT_PLANNING_SETTINGS, SAVE_FLIGHT_PLANNING_SETTINGS } from "@/graphql/aircraft-data"
import { SETTINGS } from "@/test/fixtures/flight-plan"
import { FlightPlanningSettingsForm } from "../flight-planning-settings"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: (...args: unknown[]) => mockToast(...args) }),
}))

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const settingsMock: MockedResponse = {
  request: { query: FLIGHT_PLANNING_SETTINGS },
  result: { data: { flightPlanningSettings: { ...SETTINGS, __typename: "FlightPlanningSettings" } } },
  maxUsageCount: 3,
}

beforeEach(() => mockToast.mockReset())

describe("club flight preparation settings", () => {
  it("shows the AMC defaults and refuses a reserve below them", async () => {
    const save = jest.fn(() => ({ data: { saveFlightPlanningSettings: SETTINGS } }))
    render(
      <MockedProvider mocks={[settingsMock, { request: { query: SAVE_FLIGHT_PLANNING_SETTINGS }, variableMatcher: () => true, result: save }]}>
        <FlightPlanningSettingsForm />
      </MockedProvider>,
    )
    const day = await screen.findByLabelText("VFR de jour (min)")
    expect(day).toHaveValue("30")
    expect(screen.getByLabelText("VFR de nuit (min)")).toHaveValue("45")
    expect(screen.getByLabelText("VFR de jour, local en vue du terrain (min)")).toHaveValue("10")

    await userEvent.clear(day)
    await userEvent.type(day, "20")
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    expect(screen.getByText("Au moins 30 min (AMC1 NCO.OP.125).")).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it("saves a stricter club rule", async () => {
    let sent: unknown = null
    render(
      <MockedProvider
        mocks={[
          settingsMock,
          {
            request: { query: SAVE_FLIGHT_PLANNING_SETTINGS },
            variableMatcher: (variables) => {
              sent = variables.input
              return true
            },
            result: { data: { saveFlightPlanningSettings: { ...SETTINGS, contingencyPercent: 10, reserveVfrDayMin: 45, __typename: "FlightPlanningSettings" } } },
          },
        ]}
      >
        <FlightPlanningSettingsForm />
      </MockedProvider>,
    )
    const contingency = await screen.findByLabelText("Contingence (% du délestage)")
    await userEvent.clear(contingency)
    await userEvent.type(contingency, "10")
    const day = screen.getByLabelText("VFR de jour (min)")
    await userEvent.clear(day)
    await userEvent.type(day, "45")
    await userEvent.click(screen.getByRole("switch", { name: "Exiger un dégagement en VFR" }))
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(sent).toEqual({ ...SETTINGS, contingencyPercent: 10, reserveVfrDayMin: 45, alternateRequiredVfr: true }))
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith({ title: "Règles de préparation enregistrées" }))
  })

  it("says where the taxi fuel is set", async () => {
    render(
      <MockedProvider mocks={[settingsMock]}>
        <FlightPlanningSettingsForm />
      </MockedProvider>,
    )
    expect(await screen.findByText(/Le carburant de roulage se règle avion par avion/)).toBeInTheDocument()
  })
})
