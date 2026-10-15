import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { NewReservationForm } from "../new-reservation-form"
import { ReservationForm } from "../reservation-form"
import { GET_MAY_BOOK_WITHOUT_INSTRUCTOR } from "@/graphql/reservation"
import { GET_PLAN } from "@/graphql/plan"

// jsdom lacks these APIs, used by the Radix select.
window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
window.HTMLElement.prototype.releasePointerCapture = jest.fn()
window.HTMLElement.prototype.scrollIntoView = jest.fn()

const clubPlan: MockedResponse = {
  request: { query: GET_PLAN },
  result: {
    data: {
      plan: { plan: "CLUB", features: [], maxAircraft: 3, aircraftInService: 2, maxMembers: null, activeMembers: 10 },
    },
  },
}

const UNTIL = new Date(2031, 4, 14, 11, 0)
const rightsMock = (mayBookWithoutInstructor: boolean): MockedResponse => ({
  request: { query: GET_MAY_BOOK_WITHOUT_INSTRUCTOR, variables: { until: UNTIL.toISOString() } },
  result: { data: { mayBookWithoutInstructor } },
})

const renderNewForm = (licensed: boolean, onSubmit = jest.fn().mockResolvedValue(undefined)) => {
  render(
    <MockedProvider mocks={[clubPlan, rightsMock(licensed)]} addTypename={false}>
      <NewReservationForm
        open
        onOpenChange={jest.fn()}
        aircrafts={[{ id: 1, registration_number: "F-ABCD", model: "Robin DR400", hourly_cost: 165 }]}
        currentDate={new Date(2031, 4, 14)}
        prefill={{ aircraftId: "1", startTime: "10:00", endTime: "11:00" }}
        isClosedDay={() => false}
        onSubmit={onSubmit}
        isSubmitting={false}
      />
    </MockedProvider>,
  )
  return onSubmit
}

const licenceNote = /Sans licence valide jusqu'à la fin de ce vol, vous ne pouvez pas réserver/

describe("Réserver dans la formule Club (sans instruction)", () => {
  it("ne propose pas d'instructeur au pilote licencié, qui réserve seul", async () => {
    const onSubmit = renderNewForm(true)

    await userEvent.click(await screen.findByRole("combobox", { name: /Catégorie de vol/ }))
    await userEvent.click(await screen.findByRole("option", { name: "Local" }))
    expect(screen.queryByRole("combobox", { name: /Avec un instructeur/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Créer la réservation" }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ instructorId: "", flightCategory: "LOCAL" })
  })

  it("dit au membre sans licence valide qu'il ne peut pas réserver, au lieu de lui demander un instructeur", async () => {
    const onSubmit = renderNewForm(false)

    expect(await screen.findByRole("alert")).toHaveTextContent(licenceNote)
    expect(screen.queryByRole("combobox", { name: /Avec un instructeur/ })).not.toBeInTheDocument()

    expect(screen.getByRole("button", { name: "Créer la réservation" })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByText("Veuillez choisir un instructeur.")).not.toBeInTheDocument()
  })

  it("fait de même dans le formulaire du planning", async () => {
    const onSubmit = jest.fn()
    render(
      <MockedProvider mocks={[clubPlan]} addTypename={false}>
        <ReservationForm
          open
          onOpenChange={jest.fn()}
          title="Nouvelle réservation"
          purpose=""
          setPurpose={jest.fn()}
          notes=""
          setNotes={jest.fn()}
          flightCategory="LOCAL"
          setFlightCategory={jest.fn()}
          onSubmit={onSubmit}
          isSubmitting={false}
          instructorId=""
          setInstructorId={jest.fn()}
          instructorRequired
        />
      </MockedProvider>,
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(licenceNote)
    expect(screen.queryByRole("combobox", { name: /Avec un instructeur/ })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Créer la réservation" })).toBeDisabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
