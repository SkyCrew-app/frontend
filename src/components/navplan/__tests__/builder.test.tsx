import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { COMPUTE_FLIGHT_PLAN } from "@/graphql/navplan"
import { draftFromPlan, emptyDraft } from "@/lib/navplan/draft"
import type { FlightPlanInput, FlightPlanResult } from "@/lib/navplan/types"
import type { AeroMapProps } from "@/components/map/types"
import { BLOCKING_RESULT, MASS_BALANCE, NIGHT_RESULT, PERFORMANCE, RESULT, SAVED_PLAN, SETTINGS } from "@/test/fixtures/flight-plan"
import { FlightPlanBuilder, type BuilderAircraft } from "../FlightPlanBuilder"

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// The map needs WebGL: a stand-in exposes what the pilot does on it.
jest.mock("next/dynamic", () => () => {
  const MapStandIn = (props: AeroMapProps) => (
    <div data-testid="map">
      <span>{props.points.map((point) => point.ident).join(" ")}</span>
      <button type="button" onClick={() => props.onAddPoint?.({ lat: 48.3, lon: 1.5 })}>
        clic carte
      </button>
      <button type="button" onClick={() => props.onInsertPoint?.(0, 48.6, 1.9)}>
        insérer
      </button>
    </div>
  )
  return MapStandIn
})

const computeMock = (result: FlightPlanResult, sent: FlightPlanInput[] = []): MockedResponse => ({
  request: { query: COMPUTE_FLIGHT_PLAN },
  variableMatcher: (variables) => {
    sent.push(variables.input)
    return true
  },
  result: { data: { computeFlightPlan: result } },
  maxUsageCount: 20,
})

const aircraft = (overrides: Partial<BuilderAircraft> = {}): BuilderAircraft => ({
  id: 7,
  registration: "F-TEST",
  performance: PERFORMANCE,
  massBalance: MASS_BALANCE,
  ...overrides,
})

const renderBuilder = ({
  mocks = [computeMock(RESULT)],
  draft = draftFromPlan(SAVED_PLAN),
  onSave = jest.fn(),
  isAdmin = false,
  ...overrides
}: Partial<React.ComponentProps<typeof FlightPlanBuilder>> & { mocks?: MockedResponse[]; draft?: ReturnType<typeof emptyDraft> } = {}) =>
  render(
    <MockedProvider mocks={mocks}>
      <FlightPlanBuilder
        initialDraft={draft}
        aircraft={aircraft()}
        settings={SETTINGS}
        navdata={null}
        isAdmin={isAdmin}
        saving={false}
        onSave={onSave}
        {...overrides}
      />
    </MockedProvider>,
  )

describe("FlightPlanBuilder", () => {
  it("asks the API for a preview once the pilot pauses, and shows the results", async () => {
    const sent: FlightPlanInput[] = []
    renderBuilder({ mocks: [computeMock(RESULT, sent)] })

    expect(await screen.findByText("Bilan : À vérifier", {}, { timeout: 2000 })).toBeInTheDocument()
    expect(sent[0]).toMatchObject({ aircraftId: 7, reservationId: 55, departure: { navPointId: "ap-lfpn" }, fuel: [{ tankId: "main", liters: 80 }] })
    expect(sent[0].legs).toHaveLength(sent[0].waypoints.length + 1)
    expect(screen.getByRole("table", { name: "Log de navigation, branche par branche" })).toHaveTextContent("RBT → P1")
    expect(screen.getByText(/Aide à la préparation du vol/)).toBeInTheDocument()
  })

  it("sends a point clicked on the map in the next computation", async () => {
    const sent: FlightPlanInput[] = []
    renderBuilder({ mocks: [computeMock(RESULT, sent)] })
    await screen.findByText("Bilan : À vérifier", {}, { timeout: 2000 })

    await userEvent.click(screen.getByRole("button", { name: "clic carte" }))
    await waitFor(() => expect(sent.at(-1)?.waypoints).toHaveLength(3), { timeout: 2000 })
    expect(sent.at(-1)?.waypoints[2]).toEqual({ lat: 48.3, lon: 1.5, name: "P2" })
    expect(screen.getByTestId("map")).toHaveTextContent("LFPN RBT P1 P2 LFOC")
  })

  it("saves the plan as entered", async () => {
    const onSave = jest.fn()
    renderBuilder({ onSave })
    await screen.findByText("Bilan : À vérifier", {}, { timeout: 2000 })

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ aircraftId: 7, waypoints: SAVED_PLAN.input.waypoints }))
  })

  it("imposes the night reserve when the API finds the flight partly at night, and says why with the times", async () => {
    const sent: FlightPlanInput[] = []
    const onSave = jest.fn()
    renderBuilder({ onSave, mocks: [computeMock(NIGHT_RESULT, sent)] })

    expect(
      await screen.findByText(
        "Vol en partie de nuit à partir de 19:00Z (à LFPN : fin du crépuscule civil 17:29Z, début 05:44Z) : la réserve finale de nuit (45 min) s'applique.",
        {},
        { timeout: 2000 },
      ),
    ).toBeInTheDocument()
    expect(sent[0].reserveCase).toBe("VFR_DAY")
    await waitFor(() => expect(sent[sent.length - 1].reserveCase).toBe("VFR_NIGHT"), { timeout: 2000 })
    expect(screen.getByRole("combobox", { name: "Type de vol pour la réserve finale" })).toHaveTextContent("VFR de nuit")

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reserveCase: "VFR_NIGHT" }))
  })

  it("asks before saving a blocking plan, as a draft", async () => {
    const onSave = jest.fn()
    renderBuilder({ onSave, mocks: [computeMock(BLOCKING_RESULT)] })
    await screen.findByText("Bilan : Bloquant", {}, { timeout: 2000 })

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }))
    const dialog = screen.getByRole("alertdialog", { name: "Enregistrer un plan bloquant ?" })
    expect(dialog).toHaveTextContent("NE PAS PARTIR")
    expect(onSave).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer quand même" }))
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it("does not compute or save without both aerodromes, and says what is missing", async () => {
    const onSave = jest.fn()
    const sent: FlightPlanInput[] = []
    renderBuilder({ onSave, mocks: [computeMock(RESULT, sent)], draft: emptyDraft({ aircraftId: 7, reservationId: 55 }) })

    expect(screen.getByText(/Choisissez au moins l'aérodrome de départ et celui d'arrivée/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer le plan" }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText("Complétez les champs signalés avant d'enregistrer.")).toBeInTheDocument()
    expect(screen.getByText("Choisissez l'aérodrome de départ.")).toBeInTheDocument()
    expect(sent).toEqual([])
  })

  it("explains to a pilot why mass and balance is not available yet", () => {
    render(
      <MockedProvider mocks={[computeMock(RESULT)]}>
        <FlightPlanBuilder
          initialDraft={draftFromPlan(SAVED_PLAN)}
          aircraft={aircraft({ massBalance: { ...MASS_BALANCE, validatedAt: null } })}
          settings={SETTINGS}
          navdata={null}
          isAdmin={false}
          saving={false}
          onSave={jest.fn()}
        />
      </MockedProvider>,
    )
    expect(screen.getByText("Données de vol de F-TEST non confirmées")).toBeInTheDocument()
    expect(screen.getByText(/la masse et le centrage ne sont pas utilisables/)).toBeInTheDocument()
    expect(screen.getByText(/Demandez à un administrateur du club/)).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Saisir les données de l'avion" })).toBeNull()
  })

  it("sends an administrator to the aircraft data when they are missing", () => {
    render(
      <MockedProvider mocks={[computeMock(RESULT)]}>
        <FlightPlanBuilder
          initialDraft={draftFromPlan(SAVED_PLAN)}
          aircraft={aircraft({ performance: null, massBalance: null })}
          settings={SETTINGS}
          navdata={{ ...RESULT.navdata, stale: true }}
          isAdmin
          saving={false}
          onSave={jest.fn()}
        />
      </MockedProvider>,
    )
    expect(screen.getByText("Données de vol de F-TEST absentes")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Saisir les données de l'avion" })).toHaveAttribute("href", "/administration/planes/7/flight-data")
    expect(screen.getByText(/PÉRIMÉES/)).toBeInTheDocument()
    expect(screen.getByText(/Les stations de chargement et les réservoirs de cet avion ne sont pas encore renseignés/)).toBeInTheDocument()
  })
})
