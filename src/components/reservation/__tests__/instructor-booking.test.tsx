import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { NewReservationForm, type NewReservationPrefill } from "../new-reservation-form"
import { InstructorField, useInstructorRequired } from "../instructor-field"
import { GET_BOOKABLE_INSTRUCTORS, GET_MAY_BOOK_WITHOUT_INSTRUCTOR } from "@/graphql/reservation"

// jsdom lacks these APIs, used by the Radix select.
window.HTMLElement.prototype.hasPointerCapture = jest.fn(() => false)
window.HTMLElement.prototype.releasePointerCapture = jest.fn()
window.HTMLElement.prototype.scrollIntoView = jest.fn()

const instructorsMock: MockedResponse = {
  request: { query: GET_BOOKABLE_INSTRUCTORS },
  result: {
    data: {
      bookableInstructors: [
        { id: 3, first_name: "Marie", last_name: "Laurent" },
        { id: 7, first_name: "Camille", last_name: "Petit" },
      ],
    },
  },
}

const rightsMock = (mayBookWithoutInstructor: boolean): MockedResponse => ({
  request: { query: GET_MAY_BOOK_WITHOUT_INSTRUCTOR },
  result: { data: { mayBookWithoutInstructor } },
})

// A day far ahead, so the form never refuses the slot as past.
const DAY = new Date(2031, 4, 14)
const aircrafts = [{ id: 1, registration_number: "F-ABCD", model: "Robin DR400" }]

const renderForm = (
  props: { instructorRequired?: boolean; prefill?: NewReservationPrefill; pilotId?: number } = {},
  onSubmit = jest.fn().mockResolvedValue(undefined),
) => {
  render(
    <MockedProvider mocks={[instructorsMock]} addTypename={false}>
      <NewReservationForm
        open
        onOpenChange={jest.fn()}
        aircrafts={aircrafts}
        currentDate={DAY}
        prefill={{ aircraftId: "1", startTime: "10:00", endTime: "11:00", ...props.prefill }}
        isClosedDay={() => false}
        onSubmit={onSubmit}
        isSubmitting={false}
        instructorRequired={props.instructorRequired}
        pilotId={props.pilotId}
      />
    </MockedProvider>,
  )
  return onSubmit
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Créer la réservation" }))
const instructorList = () => screen.getByRole("combobox", { name: /Avec un instructeur/ })
const categoryList = () => screen.getByRole("combobox", { name: /Catégorie de vol/ })

describe("Réserver avec un instructeur", () => {
  it("exige un instructeur du membre sans licence valide, et dit pourquoi", async () => {
    const onSubmit = renderForm({ instructorRequired: true })

    expect(screen.getByText(/Sans licence valide, vous volez avec un instructeur/)).toBeInTheDocument()
    expect(instructorList()).toHaveAttribute("aria-required", "true")

    await submit()
    expect(await screen.findByText("Veuillez choisir un instructeur.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    // The list holds the active instructors, and no "without instructor" choice.
    await userEvent.click(instructorList())
    expect(screen.queryByRole("option", { name: "Sans instructeur" })).not.toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Camille Petit" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("option", { name: "Marie Laurent" }))

    // With an instructor the flight is an instruction flight: the category is set and locked.
    expect(categoryList()).toHaveTextContent("Instruction")
    expect(categoryList()).toBeDisabled()

    await submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      aircraftId: 1,
      instructorId: "3",
      flightCategory: "INSTRUCTION",
    })
  })

  it("laisse le membre licencié réserver sans instructeur, ou en ajouter un", async () => {
    const onSubmit = renderForm()

    expect(instructorList()).toHaveTextContent("Sans instructeur")
    expect(screen.getByText(/Facultatif/)).toBeInTheDocument()

    await userEvent.click(categoryList())
    await userEvent.click(await screen.findByRole("option", { name: "Local" }))
    await submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ instructorId: "", flightCategory: "LOCAL" })
  })

  it("ne propose pas au membre d'être son propre instructeur", async () => {
    renderForm({ pilotId: 3 })

    await userEvent.click(instructorList())
    expect(await screen.findByRole("option", { name: "Camille Petit" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "Marie Laurent" })).not.toBeInTheDocument()
  })

  it("réserve l'avion d'un cours pour son élève et son instructeur, sans les redemander", async () => {
    const onSubmit = renderForm({
      instructorRequired: true,
      prefill: {
        date: "2031-05-20",
        course: { id: 12, studentName: "Emma Girard", instructorName: "Marie Laurent" },
      },
    })

    expect(screen.getByRole("note")).toHaveTextContent(
      "Réservation de l'avion du cours de Emma Girard avec Marie Laurent.",
    )
    expect(screen.queryByRole("combobox", { name: /Avec un instructeur/ })).not.toBeInTheDocument()
    expect(categoryList()).toBeDisabled()

    await submit()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values).toMatchObject({ courseId: 12, flightCategory: "INSTRUCTION" })
    // The day of the course, not the day the calendar was showing.
    expect(values.startTime).toEqual(new Date(2031, 4, 20, 10, 0))
  })
})

describe("useInstructorRequired", () => {
  const Probe = () => <p>{useInstructorRequired() ? "instructeur requis" : "libre"}</p>
  const renderProbe = (mocks: MockedResponse[]) =>
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <Probe />
      </MockedProvider>,
    )

  it("suit la réponse de l'API", async () => {
    renderProbe([rightsMock(false)])
    expect(await screen.findByText("instructeur requis")).toBeInTheDocument()
  })

  it("n'impose rien tant que l'API n'a pas répondu, ni quand elle autorise", async () => {
    renderProbe([rightsMock(true)])
    expect(screen.getByText("libre")).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(screen.getByText("libre")).toBeInTheDocument()
  })
})

describe("InstructorField", () => {
  it("affiche l'erreur sous le champ", () => {
    render(
      <MockedProvider mocks={[instructorsMock]} addTypename={false}>
        <InstructorField id="i" value="" onChange={jest.fn()} required error="Veuillez choisir un instructeur." />
      </MockedProvider>,
    )

    expect(within(screen.getByRole("alert")).getByText("Veuillez choisir un instructeur.")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-invalid", "true")
  })
})
