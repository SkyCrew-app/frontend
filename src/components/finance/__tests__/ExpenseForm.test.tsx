import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import ExpenseForm from "../ExpenseForm"
import { CREATE_EXPENSE } from "@/graphql/finance"
import { toast } from "@/components/hooks/use-toast"

jest.mock("@/components/hooks/use-toast", () => ({
  toast: jest.fn(),
}))

// Radix Select needs layout APIs jsdom does not have: a native select keeps the same contract.
jest.mock("@/components/ui/select", () => {
  type SelectProps = { value: string; onValueChange: (value: string) => void; children: React.ReactNode }
  type ItemProps = { value: string; children: React.ReactNode }
  const Select = ({ value, onValueChange, children }: SelectProps) => (
    <select aria-label="Catégorie" value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  )
  const SelectItem = ({ value, children }: ItemProps) => <option value={value}>{children}</option>
  const Passthrough = ({ children }: { children: React.ReactNode }) => <>{children}</>
  return {
    Select,
    SelectItem,
    SelectContent: Passthrough,
    SelectTrigger: () => null,
    SelectValue: () => null,
  }
})

const REAL_TIMERS = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "setImmediate",
  "clearImmediate",
  "nextTick",
  "queueMicrotask",
  "performance",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
] as const

const renderForm = (mocks: MockedResponse[] = [], props: React.ComponentProps<typeof ExpenseForm> = {}) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ExpenseForm {...props} />
    </MockedProvider>,
  )

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Enregistrer la dépense" }))

describe("ExpenseForm", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Half past midnight, local time: the UTC day is still the day before east of Greenwich.
    jest.useFakeTimers({ now: new Date(2026, 9, 12, 0, 30), doNotFake: [...REAL_TIMERS] })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("doit signaler le montant et la catégorie manquants sans rien envoyer", async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    renderForm([], { onSuccess })

    await submit(user)

    expect(screen.getByText("Indiquez le montant de la dépense.")).toBeInTheDocument()
    expect(screen.getByText("Choisissez une catégorie.")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })

  it("doit refuser un montant nul", async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText(/Montant/), "0")
    await user.selectOptions(screen.getByLabelText("Catégorie"), "carburant")
    await submit(user)

    expect(screen.getByText("Le montant doit être supérieur à 0 €.")).toBeInTheDocument()
  })

  it("doit enregistrer la dépense avec le jour local choisi puis prévenir le parent", async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    const mocks: MockedResponse[] = [
      {
        request: {
          query: CREATE_EXPENSE,
          variables: {
            input: {
              expense_date: "2026-10-12",
              amount: 120.5,
              category: "carburant",
              description: "Plein du F-GABC",
            },
          },
        },
        result: {
          data: {
            createExpense: {
              id: "1",
              expense_date: "2026-10-12",
              amount: 120.5,
              category: "carburant",
              sub_category: null,
              description: "Plein du F-GABC",
            },
          },
        },
      },
    ]
    renderForm(mocks, { onSuccess })

    await user.type(screen.getByLabelText(/Montant/), "120.5")
    await user.selectOptions(screen.getByLabelText("Catégorie"), "carburant")
    await user.type(screen.getByLabelText("Description"), "Plein du F-GABC")
    await submit(user)

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Dépense enregistrée" }))
  })

  it("doit afficher un message clair quand le serveur refuse, sans fermer le formulaire", async () => {
    const user = userEvent.setup()
    const onSuccess = jest.fn()
    const mocks: MockedResponse[] = [
      {
        request: {
          query: CREATE_EXPENSE,
          variables: {
            input: { expense_date: "2026-10-12", amount: 50, category: "autres", description: "" },
          },
        },
        error: new Error("ECONNREFUSED 10.0.0.1"),
      },
    ]
    renderForm(mocks, { onSuccess })

    await user.type(screen.getByLabelText(/Montant/), "50")
    await user.selectOptions(screen.getByLabelText("Catégorie"), "autres")
    await submit(user)

    expect(await screen.findByText(/La dépense n'a pas pu être enregistrée/)).toBeInTheDocument()
    expect(screen.queryByText(/ECONNREFUSED/)).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("doit appeler onCancel quand on annule", async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()
    renderForm([], { onCancel })

    await user.click(screen.getByRole("button", { name: "Annuler" }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
