import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"
import { MockedProvider } from "@apollo/client/testing"
import { ClosedFlightAdmin, parseFlightTime } from "../closed-flight-admin"
import { REMOVE_FLIGHT, UPDATE_FLIGHT } from "@/graphql/flights"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}))

const flight = {
  id: 19,
  origin_icao: "LFPG",
  destination_icao: "LFPO",
  closed_at: "2026-10-12T19:30:00.000Z",
  flight_hours: 0.5,
  number_of_passengers: 1,
  departure_time: null,
  arrival_time: null,
  remarks: "RAS",
  user: { first_name: "Jean", last_name: "Dupont" },
}

describe("parseFlightTime", () => {
  it("lit les heures et minutes comme les heures décimales", () => {
    expect(parseFlightTime("1:30")).toBe(1.5)
    expect(parseFlightTime("1 h 30")).toBe(1.5)
    expect(parseFlightTime("1,5")).toBe(1.5)
    expect(parseFlightTime("0:75")).toBeNull()
    expect(parseFlightTime("")).toBeNull()
  })
})

describe("ClosedFlightAdmin", () => {
  beforeEach(() => mockToast.mockClear())

  it("corrige le temps de vol d'un vol clôturé et prévient l'administrateur", async () => {
    const updated = jest.fn(() => ({ data: { updateFlight: { id: 19, flight_hours: 0.75 } } }))
    const onChanged = jest.fn()
    render(
      <MockedProvider
        addTypename={false}
        mocks={[
          {
            request: {
              query: UPDATE_FLIGHT,
              variables: { updateFlightInput: { id: 19, flight_hours: 0.75, number_of_passengers: 1, remarks: "RAS" } },
            },
            result: updated,
          },
        ]}
      >
        <ClosedFlightAdmin flight={flight} onChanged={onChanged} onDeleted={jest.fn()} />
      </MockedProvider>,
    )

    expect(screen.getByText(/compte 30 min dans son carnet de vol/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Corriger le vol" }))
    const panel = within(await screen.findByRole("dialog", { name: "Corriger le vol" }))
    const hours = panel.getByLabelText(/Temps de vol/)
    // Hours and minutes, exact to the minute, not a long decimal.
    expect(hours).toHaveValue("0:30")
    await userEvent.clear(hours)
    await userEvent.click(panel.getByRole("button", { name: "Enregistrer" }))
    expect(await panel.findByText(/temps de vol supérieur à zéro/)).toBeInTheDocument()
    expect(updated).not.toHaveBeenCalled()

    await userEvent.type(hours, "0:45")
    await userEvent.click(panel.getByRole("button", { name: "Enregistrer" }))

    await waitFor(() => expect(updated).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Vol corrigé" }))
  })

  it("demande confirmation, en disant ce qui sort du carnet, avant de supprimer", async () => {
    const removed = jest.fn(() => ({ data: { removeFlight: true } }))
    const onDeleted = jest.fn()
    render(
      <MockedProvider addTypename={false} mocks={[{ request: { query: REMOVE_FLIGHT, variables: { id: 19 } }, result: removed }]}>
        <ClosedFlightAdmin flight={flight} onChanged={jest.fn()} onDeleted={onDeleted} />
      </MockedProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Supprimer le vol" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("Le vol LFPG → LFPO de Jean Dupont sera retiré de son carnet de vol, avec ses 30 min.")
    expect(removed).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Supprimer le vol" }))
    await waitFor(() => expect(removed).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })
})
