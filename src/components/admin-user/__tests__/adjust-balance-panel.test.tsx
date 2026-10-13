import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { GraphQLError } from "graphql"
import { AdjustBalancePanel, parseAmountCents } from "../adjust-balance-panel"
import { ADJUST_MEMBER_BALANCE } from "@/graphql/account"

const mockToast = jest.fn()
jest.mock("@/components/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}))

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

const member = { id: "7", first_name: "Camille", last_name: "Martin", user_account_balance: 80 }

const adjustment = (input: object, result: MockedResponse["result"]): MockedResponse => ({
  request: { query: ADJUST_MEMBER_BALANCE, variables: { input } },
  result,
})

const payment = {
  id: 12,
  amount: 250,
  kind: "manual_credit",
  reason: "Chèque n° 1234",
  payment_method: "cheque",
  payment_date: "2026-10-13T10:00:00",
  user: { id: 7, user_account_balance: 330 },
}

const renderPanel = (mocks: MockedResponse[], onAdjusted = jest.fn(), onOpenChange = jest.fn()) => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AdjustBalancePanel open onOpenChange={onOpenChange} member={member} onAdjusted={onAdjusted} />
    </MockedProvider>,
  )
  return { onAdjusted, onOpenChange }
}

const fill = (amount: string, reason: string) => {
  fireEvent.change(screen.getByLabelText(/Montant/), { target: { value: amount } })
  fireEvent.change(screen.getByLabelText(/Motif/), { target: { value: reason } })
}

describe("parseAmountCents", () => {
  it("lit un montant positif à deux décimales au plus", () => {
    expect(parseAmountCents("250")).toBe(25000)
    expect(parseAmountCents("12,5")).toBe(1250)
    expect(parseAmountCents("0.01")).toBe(1)
    for (const text of ["", "0", "-5", "1.005", "abc", "1e3"]) expect(parseAmountCents(text)).toBeNull()
  })
})

describe("Créditer ou débiter le compte d'un membre", () => {
  beforeEach(() => jest.clearAllMocks())

  it("présente le membre et son solde", () => {
    renderPanel([])
    const panel = screen.getByRole("dialog", { name: "Créditer ou débiter le compte" })
    expect(panel).toHaveTextContent(/Camille Martin · solde actuel 80,00\s€/)
  })

  it("exige un montant valide et un motif avant d'envoyer quoi que ce soit", async () => {
    const { onAdjusted } = renderPanel([])

    fill("-20", "  ")
    fireEvent.click(screen.getByRole("button", { name: "Créditer" }))

    expect(await screen.findByText("Indiquez un montant positif, avec deux décimales au plus.")).toBeInTheDocument()
    expect(screen.getByText("Indiquez le motif de l'opération.")).toBeInTheDocument()
    expect(onAdjusted).not.toHaveBeenCalled()
    expect(mockToast).not.toHaveBeenCalled()
  })

  it("crédite le compte avec le mode de règlement et le motif", async () => {
    const { onAdjusted, onOpenChange } = renderPanel([
      adjustment(
        { user_id: 7, amount: 250, credit: true, payment_method: "cheque", reason: "Chèque n° 1234" },
        { data: { adjustMemberBalance: payment } },
      ),
    ])

    fill("250", " Chèque n° 1234 ")
    expect(screen.getByText(/Nouveau solde : 330,00\s€/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("radio", { name: "Chèque" }))
    fireEvent.click(screen.getByRole("button", { name: "Créditer" }))

    await waitFor(() => expect(onAdjusted).toHaveBeenCalledTimes(1))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockToast).toHaveBeenCalledWith({
      title: "Compte crédité",
      description: expect.stringMatching(/^250,00\s€ ajoutés au compte de Camille Martin\.$/),
    })
  })

  it("refuse un débit supérieur au solde sans appeler l'API", async () => {
    const { onAdjusted } = renderPanel([])

    fireEvent.click(screen.getByRole("radio", { name: "Débiter le compte" }))
    fill("80,01", "Correction d'une erreur de saisie")
    fireEvent.click(screen.getByRole("button", { name: "Débiter" }))

    expect(await screen.findByText("Le débit dépasse le solde du membre.")).toBeInTheDocument()
    expect(onAdjusted).not.toHaveBeenCalled()
  })

  it("affiche le refus de l'API et garde le panneau ouvert", async () => {
    const { onAdjusted, onOpenChange } = renderPanel([
      adjustment(
        { user_id: 7, amount: 50, credit: false, payment_method: "cash", reason: "Erreur de caisse" },
        {
          errors: [
            new GraphQLError("Le solde du membre est insuffisant pour ce débit", {
              extensions: { code: "BAD_REQUEST" },
            }),
          ],
        },
      ),
    ])

    fireEvent.click(screen.getByRole("radio", { name: "Débiter le compte" }))
    fill("50", "Erreur de caisse")
    fireEvent.click(screen.getByRole("button", { name: "Débiter" }))

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Opération impossible",
        description: "Le solde du membre est insuffisant pour ce débit",
      }),
    )
    expect(onAdjusted).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })
})
