import i18n from "@/lib/i18n"

// One wording and one colour per payment status, wherever a transaction is shown.
type PaymentStatusVariant = "success" | "warning" | "danger" | "info" | "neutral"

// The API stores English codes for payments and, on older invoices, French words.
const STATUSES: Record<string, { key: string; variant: PaymentStatusVariant }> = {
  completed: { key: "paid", variant: "success" },
  paid: { key: "paid", variant: "success" },
  "payé": { key: "paid", variant: "success" },
  "validé": { key: "paid", variant: "success" },
  pending: { key: "pending", variant: "warning" },
  "en attente": { key: "pending", variant: "warning" },
  partial: { key: "partial", variant: "info" },
  partiel: { key: "partial", variant: "info" },
  overdue: { key: "overdue", variant: "danger" },
  "en retard": { key: "overdue", variant: "danger" },
  failed: { key: "failed", variant: "danger" },
  cancelled: { key: "cancelled", variant: "neutral" },
  refunded: { key: "refunded", variant: "neutral" },
}

const statusLabel = (key: string) => i18n.t(`profile:paymentStatus.${key}`)

export const paymentStatus = (
  status: string | null | undefined,
): { key: string; label: string; variant: PaymentStatusVariant } => {
  const known = STATUSES[(status ?? "").trim().toLowerCase()] ?? {
    key: "unknown",
    variant: "neutral" as PaymentStatusVariant,
  }
  return { ...known, label: statusLabel(known.key) }
}

// The statuses offered as a filter, in the order they are listed.
// Labels are getters: they are read once the language is known.
export const PAYMENT_STATUS_FILTERS: Array<{ key: string; label: string }> = [
  "paid",
  "pending",
  "partial",
  "overdue",
  "failed",
].map((key) => ({
  key,
  get label() {
    return statusLabel(key)
  },
}))

// Codes written by the app, plus the wording found on older records.
const METHODS: Record<string, string> = {
  stripe: "card",
  "carte bancaire": "card",
  paypal: "paypal",
  account_balance: "accountBalance",
  "solde compte": "accountBalance",
  "virement bancaire": "bankTransfer",
}

// How an administrator records money handed over at the club.
const MANUAL_METHODS = ["cash", "cheque", "transfer", "correction"]

export const paymentMethodLabel = (method: string | null | undefined) => {
  const code = (method ?? "").trim().toLowerCase()
  if (MANUAL_METHODS.includes(code)) return i18n.t(`administration:accountLines.method.${code}`)
  const key = METHODS[code]
  return key ? i18n.t(`profile:paymentMethod.${key}`) : method?.trim() || "—"
}

// Money paid in by card or PayPal credits the account.
export const isTopUp = (method: string | null | undefined) =>
  ["stripe", "paypal"].includes((method ?? "").toLowerCase())

// A reservation or an invoice settled with the money already on the account.
export const isBalanceSpend = (method: string | null | undefined) =>
  ["account_balance", "solde compte"].includes((method ?? "").trim().toLowerCase())

export type TransactionType = "topup" | "spend" | "payment"

const transactionTypeLabels = (type: TransactionType) => ({
  get label() {
    return i18n.t(`profile:transactionType.${type}.label`)
  },
  get plural() {
    return i18n.t(`profile:transactionType.${type}.plural`)
  },
})

export const TRANSACTION_TYPES: Record<TransactionType, { label: string; plural: string }> = {
  topup: transactionTypeLabels("topup"),
  spend: transactionTypeLabels("spend"),
  payment: transactionTypeLabels("payment"),
}

export const transactionType = (method: string | null | undefined): TransactionType =>
  isTopUp(method) ? "topup" : isBalanceSpend(method) ? "spend" : "payment"

// === Lines of the account history ===
// Every movement of the balance is one line, of a kind given by the API.

export const ACCOUNT_LINE_KINDS = [
  "top_up",
  "booking",
  "booking_refund",
  "manual_credit",
  "manual_debit",
  "provider_refund",
  // A chargeback the club won: what the dispute had taken comes back.
  "dispute_won",
] as const

export type AccountLineKind = (typeof ACCOUNT_LINE_KINDS)[number]

interface PaymentLine {
  kind?: string | null
  payment_method?: string | null
  payment_status?: string | null
  amount?: number | string | null
}

const CREDIT_KINDS: AccountLineKind[] = ["top_up", "booking_refund", "manual_credit", "dispute_won"]

// The kind given by the API; a line without one (an older answer) is read from its method.
export const accountLineKind = (payment: PaymentLine): AccountLineKind => {
  const kind = (payment.kind ?? "") as AccountLineKind
  if (ACCOUNT_LINE_KINDS.includes(kind) && (kind !== "top_up" || !isBalanceSpend(payment.payment_method))) return kind
  return isBalanceSpend(payment.payment_method) ? "booking" : "top_up"
}

// What the line did to the balance: +1 it added its amount, -1 it took it, 0 nothing.
// A payment still waiting or refused moved nothing. A booking marked "refunded" is an older
// record: it was charged and given back in one line.
export const accountLineSign = (payment: PaymentLine): 1 | -1 | 0 => {
  const kind = accountLineKind(payment)
  const status = (payment.payment_status ?? "").trim().toLowerCase()
  const moved = status === "completed" || (kind === "top_up" && status === "refunded")
  if (!moved) return 0
  return CREDIT_KINDS.includes(kind) ? 1 : -1
}

const LEGACY_LABELS: Partial<Record<AccountLineKind, TransactionType>> = { top_up: "topup", booking: "spend" }

export const accountLineLabel = (kind: AccountLineKind, form: "label" | "plural" = "label") => {
  const legacy = LEGACY_LABELS[kind]
  return legacy ? i18n.t(`profile:transactionType.${legacy}.${form}`) : i18n.t(`administration:accountLines.${kind}.${form}`)
}

// Money paid in and money spent, from the lines that moved the balance. A refund comes off
// what it gives back: a cancelled booking is not a spend, a refunded top-up is not a deposit.
export const accountTotals = (payments: PaymentLine[]) => {
  const cents = { toppedUp: 0, spent: 0 }
  for (const payment of payments) {
    const sign = accountLineSign(payment)
    if (sign === 0) continue
    const amount = Math.round((Number(payment.amount) || 0) * 100)
    const kind = accountLineKind(payment)
    if (kind === "top_up" || kind === "manual_credit") cents.toppedUp += amount
    if (kind === "provider_refund") cents.toppedUp -= amount
    // The dispute had been taken off what was paid in: winning it puts it back.
    if (kind === "dispute_won") cents.toppedUp += amount
    if (kind === "booking" || kind === "manual_debit") cents.spent += amount
    if (kind === "booking_refund") cents.spent -= amount
  }
  return { toppedUp: cents.toppedUp / 100, spent: cents.spent / 100 }
}
