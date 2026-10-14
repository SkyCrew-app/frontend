import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"
import { ReservationDetail } from "../reservation-detail"
import { apiRefusalMessage } from "../api-refusal"
import { ApolloError } from "@apollo/client"
import { GraphQLError } from "graphql"
import type { Reservation } from "@/interfaces/reservation"

const HOUR = 60 * 60 * 1000

const reservation = (startsInHours: number, overrides: Partial<Reservation> = {}): Reservation => ({
  id: 1,
  user_id: 42,
  aircraft_id: 3,
  start_time: new Date(Date.now() + startsInHours * HOUR).toISOString(),
  end_time: new Date(Date.now() + (startsInHours + 1) * HOUR).toISOString(),
  purpose: "Tour de piste",
  status: "CONFIRMED",
  flight_category: "LOCAL",
  charged_amount: 150,
  aircraft: { id: 3, registration_number: "F-ABCD" },
  user: { id: 42, first_name: "Alex", last_name: "Martin" },
  flights: [],
  ...overrides,
})

const renderDetail = (
  booking: Reservation,
  props: { canEdit: boolean; isOwner?: boolean; isAdmin?: boolean; isInstructor?: boolean },
) =>
  render(
    <ReservationDetail open onOpenChange={jest.fn()} reservation={booking} onEdit={jest.fn()} onDelete={jest.fn()} {...props} />,
  )

const action = (name: string) => screen.queryByRole("button", { name })

describe("Détail d'une réservation — ce que l'API accepterait", () => {
  it("laisse son titulaire modifier et annuler une réservation à venir, et lui montre le prix payé", () => {
    renderDetail(reservation(24), { canEdit: true })

    expect(action("Modifier")).toBeInTheDocument()
    expect(action("Annuler la réservation")).toBeInTheDocument()
    expect(screen.getByText("Prix payé")).toBeInTheDocument()
    expect(screen.getByText(/150,00\s€/)).toBeInTheDocument()
  })

  it("n'offre plus rien au titulaire une fois la réservation commencée, et dit pourquoi", () => {
    renderDetail(reservation(-1), { canEdit: true })

    expect(action("Modifier")).not.toBeInTheDocument()
    expect(action("Annuler la réservation")).not.toBeInTheDocument()
    expect(screen.getByText(/seul un administrateur peut l'annuler/)).toBeInTheDocument()
  })

  it("laisse un administrateur annuler la réservation commencée d'un autre membre, sans la modifier", () => {
    renderDetail(reservation(-1), { canEdit: false, isAdmin: true })

    expect(action("Annuler la réservation")).toBeInTheDocument()
    expect(action("Modifier")).not.toBeInTheDocument()
  })

  it("ne propose rien, même à un administrateur, quand le vol est clôturé", () => {
    renderDetail(reservation(-3, { flights: [{ id: 9, closed_at: new Date().toISOString() }] }), {
      canEdit: true,
      isAdmin: true,
    })

    expect(action("Annuler la réservation")).not.toBeInTheDocument()
    expect(action("Modifier")).not.toBeInTheDocument()
  })

  describe("avec un instructeur", () => {
    const instructor = { id: 8, first_name: "Marie", last_name: "Laurent" }

    it("montre l'instructeur du vol à tout le monde", () => {
      renderDetail(reservation(24, { instructor }), { canEdit: false })

      expect(screen.getByText("Instructeur")).toBeInTheDocument()
      expect(screen.getByText("Marie Laurent")).toBeInTheDocument()
    })

    it("laisse l'instructeur décliner le vol avant son début, sans le modifier ni voir le prix", () => {
      renderDetail(reservation(24, { instructor }), { canEdit: false, isInstructor: true })

      expect(action("Décliner le vol")).toBeInTheDocument()
      expect(action("Modifier")).not.toBeInTheDocument()
      expect(screen.queryByText("Prix payé")).not.toBeInTheDocument()
      expect(screen.getByText(/la réservation est annulée et l'élève est remboursé/)).toBeInTheDocument()
    })

    it("ne prétend rien sur le remboursement quand l'instructeur décline sans voir le prix", () => {
      renderDetail(reservation(24, { instructor, charged_amount: undefined }), { canEdit: false, isInstructor: true })

      fireEvent.click(action("Décliner le vol")!)

      const dialog = screen.getByRole("alertdialog")
      expect(dialog).toHaveTextContent(/L'élève sera prévenu et remboursé/)
      expect(dialog).not.toHaveTextContent(/Rien ne sera remboursé/)
    })

    it("ne laisse plus l'instructeur décliner une fois le vol commencé", () => {
      renderDetail(reservation(-1, { instructor }), { canEdit: false, isInstructor: true })

      expect(action("Décliner le vol")).not.toBeInTheDocument()
      expect(action("Annuler la réservation")).not.toBeInTheDocument()
    })
  })

  it("laisse un administrateur modifier la réservation à venir d'un autre membre", () => {
    renderDetail(reservation(24), { canEdit: true, isOwner: false, isAdmin: true })

    expect(action("Modifier")).toBeInTheDocument()
    expect(action("Annuler la réservation")).toBeInTheDocument()
  })

  it("annonce, avant d'annuler, le montant qui sera remboursé", () => {
    renderDetail(reservation(24), { canEdit: true })

    fireEvent.click(action("Annuler la réservation")!)

    const dialog = screen.getByRole("alertdialog")
    expect(dialog).toHaveTextContent("Annuler cette réservation ?")
    expect(dialog).toHaveTextContent(/150,00\s€ vous seront remboursés sur votre solde/)
  })

  it("dit qu'il n'y a rien à rembourser quand rien n'a été débité", () => {
    renderDetail(reservation(24, { charged_amount: null }), { canEdit: true })

    fireEvent.click(action("Annuler la réservation")!)

    expect(screen.getByRole("alertdialog")).toHaveTextContent(/Rien ne sera remboursé/)
  })

  it("ne montre ni action ni prix à un autre membre", () => {
    renderDetail(reservation(24), { canEdit: false })

    expect(action("Annuler la réservation")).not.toBeInTheDocument()
    expect(screen.queryByText("Prix payé")).not.toBeInTheDocument()
  })
})

describe("apiRefusalMessage", () => {
  const refused = (message: string, code: string) =>
    new ApolloError({ graphQLErrors: [new GraphQLError(message, { extensions: { code } })] })

  it("reprend le refus écrit par l'API pour le membre", () => {
    expect(apiRefusalMessage(refused("Le club est fermé ce jour-là", "BAD_REQUEST"), "Réessayez.")).toBe(
      "Le club est fermé ce jour-là",
    )
  })

  it("garde le message de l'écran pour une panne technique", () => {
    expect(apiRefusalMessage(refused("relation does not exist", "INTERNAL_SERVER_ERROR"), "Réessayez.")).toBe("Réessayez.")
    expect(apiRefusalMessage(new Error("Failed to fetch"), "Réessayez.")).toBe("Réessayez.")
  })
})
