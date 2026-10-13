import { accountLineKind, accountLineLabel, accountLineSign, accountTotals, paymentMethodLabel } from "../payment-labels"
import { toTransactions } from "../TransactionHistory"

const line = (kind: string, amount: number, overrides: object = {}) => ({
  id: `${kind}-${amount}`,
  kind,
  amount,
  payment_method: kind === "top_up" ? "stripe" : "account_balance",
  payment_status: "completed",
  payment_date: "2026-10-12T10:00:00",
  ...overrides,
})

// A member who tops up 200, books for 150, cancels, books for 90, is credited 50 by cheque
// and gets 20 of the top-up back on their card: the balance is 200 - 90 + 50 - 20 = 140.
const HISTORY = [
  line("top_up", 200),
  line("booking", 150),
  line("booking_refund", 150),
  line("booking", 90),
  line("manual_credit", 50, { payment_method: "cheque", reason: "Chèque n° 1234" }),
  line("provider_refund", 20, { payment_method: "stripe" }),
  // An attempt that never went through moved nothing.
  line("top_up", 500, { payment_status: "pending" }),
  line("top_up", 500, { payment_status: "failed" }),
]

describe("lignes du compte", () => {
  it("donne à chaque ligne son sens sur le solde", () => {
    expect(HISTORY.map(accountLineSign)).toEqual([1, -1, 1, -1, 1, -1, 0, 0])
  })

  it("fait concorder les totaux et le solde", () => {
    const totals = accountTotals(HISTORY)
    // A cancelled booking is not a spend, a refunded top-up is not a deposit.
    expect(totals).toEqual({ toppedUp: 230, spent: 90 })
    expect(totals.toppedUp - totals.spent).toBe(140)

    const rows = toTransactions(HISTORY)
    expect(rows.reduce((sum, row) => sum + row.sign * row.amount, 0)).toBe(140)
  })

  it("montre le remboursement comme une ligne à part, en positif", () => {
    const rows = toTransactions(HISTORY)
    expect(rows).toHaveLength(6)
    const refund = rows.find((row) => row.type === "booking_refund")
    expect(refund).toMatchObject({ sign: 1, amount: 150 })
    expect(accountLineLabel("booking_refund")).toBe("Remboursement de réservation")
  })

  it("montre le motif d'un crédit saisi par le club, et son mode de règlement", () => {
    const credit = toTransactions(HISTORY).find((row) => row.type === "manual_credit")
    expect(credit).toMatchObject({ reason: "Chèque n° 1234", sign: 1 })
    expect(accountLineLabel("manual_credit")).toBe("Crédit par le club")
    expect(paymentMethodLabel("cheque")).toBe("Chèque")
  })

  // A chargeback the club won used not to exist as a line: the member stayed debited.
  it("recrédite une contestation de paiement gagnée", () => {
    const history = [
      line("top_up", 200),
      // The bank takes the top-up back, then rules for the club.
      line("provider_refund", 200, { payment_method: "stripe" }),
      line("dispute_won", 200, { payment_method: "stripe" }),
    ]

    expect(history.map(accountLineSign)).toEqual([1, -1, 1])
    expect(accountTotals(history)).toEqual({ toppedUp: 200, spent: 0 })
    expect(toTransactions(history).reduce((sum, row) => sum + row.sign * row.amount, 0)).toBe(200)
    expect(accountLineLabel("dispute_won")).toBe("Contestation de paiement gagnée")
  })

  it("garde les anciennes lignes lisibles", () => {
    // Before kinds existed: read from the payment method.
    expect(accountLineKind({ payment_method: "account_balance" })).toBe("booking")
    expect(accountLineKind({ payment_method: "stripe" })).toBe("top_up")
    expect(accountLineKind({ kind: "top_up", payment_method: "account_balance" })).toBe("booking")
    expect(accountLineLabel("top_up")).toBe("Rechargement")
    expect(accountLineLabel("booking", "plural")).toBe("Dépenses")

    // An older booking charged then refunded in one line: shown, but it moves nothing.
    const legacy = line("booking", 150, { payment_status: "refunded" })
    expect(accountLineSign(legacy)).toBe(0)
    expect(toTransactions([legacy])).toHaveLength(1)
    expect(accountTotals([legacy])).toEqual({ toppedUp: 0, spent: 0 })
  })
})
