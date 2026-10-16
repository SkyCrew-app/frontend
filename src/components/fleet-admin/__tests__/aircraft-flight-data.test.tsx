import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import {
  AIRCRAFT_FLIGHT_DATA,
  AIRCRAFT_TYPE_TEMPLATES,
  APPLY_AIRCRAFT_TEMPLATE,
  SAVE_AIRCRAFT_MASS_BALANCE,
  VALIDATE_AIRCRAFT_DATA,
} from "@/graphql/aircraft-data"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { MASS_BALANCE, PERFORMANCE } from "@/test/fixtures/flight-plan"
import { AircraftFlightData } from "../AircraftFlightData"

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
// Radix Select reads these, which jsdom lacks.
Element.prototype.hasPointerCapture = jest.fn(() => false)
Element.prototype.releasePointerCapture = jest.fn()
Element.prototype.scrollIntoView = jest.fn()

const aircraftRow = {
  __typename: "Aircraft",
  id: 7,
  registration_number: "F-TEST",
  model: "Avion d'essai",
  availability_status: "AVAILABLE",
  maintenance_status: "OPERATIONAL",
  hourly_cost: 150,
  year_of_manufacture: 2001,
  total_flight_hours: 1000,
  image_url: null,
  documents_url: [],
  consumption: 28,
  cruiseSpeed: 105,
  maxAltitude: 13000,
  fuel_capacity: 110,
  fuel_type: "AVGAS",
  empty_weight: 560,
  max_takeoff_weight: 1000,
  maintenances: [],
}

const fleetMock: MockedResponse = { request: { query: GET_AIRCRAFTS }, result: { data: { getAircrafts: [aircraftRow] } } }
const templatesMock: MockedResponse = {
  request: { query: AIRCRAFT_TYPE_TEMPLATES },
  result: { data: { aircraftTypeTemplates: [{ __typename: "AircraftTypeTemplate", code: "DR400-140B", label: "Robin DR400-140B", source: null }] } },
}

const typed = <T extends object>(value: T, typename: string) => JSON.parse(JSON.stringify({ ...value, __typename: typename }))

const dataMock = (performance: unknown, massBalance: unknown): MockedResponse => ({
  request: { query: AIRCRAFT_FLIGHT_DATA, variables: { aircraftId: 7 } },
  result: { data: { aircraftPerformance: performance, aircraftMassBalance: massBalance } },
  maxUsageCount: 5,
})

const notValidated = () =>
  dataMock(typed({ ...PERFORMANCE, validatedAt: null, validatedBy: null }, "AircraftPerformance"), typed({ ...MASS_BALANCE, validatedAt: null, validatedBy: null }, "AircraftMassBalance"))

const renderPage = (mocks: MockedResponse[]) =>
  render(
    <MockedProvider mocks={[fleetMock, templatesMock, ...mocks]}>
      <AircraftFlightData aircraftId={7} />
    </MockedProvider>,
  )

beforeEach(() => mockToast.mockReset())

describe("aircraft flight data (administration)", () => {
  it("explains that unconfirmed values cannot be used, and confirms them after a warning", async () => {
    let validated = false
    renderPage([
      notValidated(),
      {
        request: { query: VALIDATE_AIRCRAFT_DATA, variables: { aircraftId: 7 } },
        result: () => {
          validated = true
          return { data: { validateAircraftData: true } }
        },
      },
    ])

    expect(await screen.findByRole("heading", { level: 1, name: "Données de vol de F-TEST" })).toBeInTheDocument()
    expect(screen.getByText("À confirmer")).toBeInTheDocument()
    expect(screen.getByText(/tant qu'elles ne sont pas confirmées, l'avion ne peut pas servir au calcul de masse et centrage/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Confirmer les valeurs de cet avion" }))
    const dialog = screen.getByRole("alertdialog", { name: "Confirmer les valeurs de F-TEST ?" })
    expect(dialog).toHaveTextContent("manuel de vol et le rapport de pesée")
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmer les valeurs de cet avion" }))
    await waitFor(() => expect(validated).toBe(true))
  })

  it("does not offer the confirmation while changes are not saved", async () => {
    renderPage([notValidated()])
    const emptyMass = await screen.findByLabelText("Masse à vide (kg)")
    await userEvent.clear(emptyMass)
    await userEvent.type(emptyMass, "565")

    expect(screen.getByRole("button", { name: "Confirmer les valeurs de cet avion" })).toBeDisabled()
    expect(screen.getByText("Enregistrez d'abord vos modifications.")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /Masse et centrage \(modifications non enregistrées\)/ })).toBeInTheDocument()
  })

  it("saves the mass and balance in kilograms and metres whatever the units shown", async () => {
    let sent: Record<string, unknown> | null = null
    renderPage([
      notValidated(),
      {
        request: { query: SAVE_AIRCRAFT_MASS_BALANCE },
        variableMatcher: (variables) => {
          sent = variables.input
          return true
        },
        result: { data: { saveAircraftMassBalance: typed({ ...MASS_BALANCE, emptyMassKg: 565, validatedAt: null, validatedBy: null }, "AircraftMassBalance") } },
      },
    ])
    await screen.findByLabelText("Masse à vide (kg)")
    await userEvent.click(screen.getByRole("radio", { name: "lb" }))
    await userEvent.click(screen.getByRole("radio", { name: "in" }))
    const emptyMass = screen.getByLabelText("Masse à vide (lb)")
    expect(emptyMass).toHaveValue("1234.6")
    await userEvent.clear(emptyMass)
    await userEvent.type(emptyMass, "1245.6")
    expect(screen.getByLabelText("Bras à vide (in)")).toHaveValue("13.19")

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))
    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.emptyMassKg).toBeCloseTo(565, 0)
    expect(sent!.emptyArmM).toBeCloseTo(0.335, 6)
    expect(sent!.weighingDate).toBe("2026-03-12T00:00:00.000Z")
    expect(sent).not.toHaveProperty("validatedAt")
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Données de vol enregistrées" }))
  })

  it("refuses to save an envelope whose sides cross, and draws it as typed", async () => {
    const save = jest.fn(() => ({ data: { saveAircraftMassBalance: null } }))
    renderPage([notValidated(), { request: { query: SAVE_AIRCRAFT_MASS_BALANCE }, variableMatcher: () => true, result: save }])
    await screen.findByLabelText("Masse à vide (kg)")

    expect(screen.getByRole("img", { name: "Aperçu de l'enveloppe" })).toBeInTheDocument()
    // Point 3 moved down below point 2: the sides cross.
    const mass = screen.getByLabelText("Masse, ligne 3 (kg)")
    await userEvent.clear(mass)
    await userEvent.type(mass, "500")
    expect(screen.getByText("Les côtés de l'enveloppe se croisent : vérifiez l'ordre des points.")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }))
    expect(save).not.toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Enregistrement impossible" }))
    expect(screen.getByText("Une enveloppe est incomplète ou incohérente.")).toBeInTheDocument()
  })

  it("applies a type template after a confirmation", async () => {
    let applied: unknown = null
    renderPage([
      dataMock(null, null),
      {
        request: { query: APPLY_AIRCRAFT_TEMPLATE, variables: { aircraftId: 7, templateCode: "DR400-140B" } },
        result: () => {
          applied = true
          return { data: { applyAircraftTemplate: typed({ ...PERFORMANCE, validatedAt: null, validatedBy: null }, "AircraftPerformance") } }
        },
      },
    ])
    expect(await screen.findByText("À renseigner")).toBeInTheDocument()
    // Starts from what the fleet record already knows.
    expect(screen.getByLabelText("Masse à vide (kg)")).toHaveValue("560")

    await userEvent.click(screen.getByRole("combobox", { name: "Gabarit de type" }))
    await userEvent.click(await screen.findByRole("option", { name: "Robin DR400-140B" }))
    await userEvent.click(screen.getByRole("button", { name: "Appliquer le gabarit" }))
    const dialog = screen.getByRole("alertdialog", { name: "Appliquer le gabarit ?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Appliquer le gabarit" }))
    await waitFor(() => expect(applied).toBe(true))
  })
})
