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

export const paymentMethodLabel = (method: string | null | undefined) => {
  const key = METHODS[(method ?? "").trim().toLowerCase()]
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
