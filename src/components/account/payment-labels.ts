// One wording and one colour per payment status, wherever a transaction is shown.
type PaymentStatusVariant = "success" | "warning" | "danger" | "info" | "neutral"

// The API stores English codes for payments and, on older invoices, French words.
const STATUSES: Record<string, { key: string; label: string; variant: PaymentStatusVariant }> = {
  completed: { key: "paid", label: "Payé", variant: "success" },
  paid: { key: "paid", label: "Payé", variant: "success" },
  "payé": { key: "paid", label: "Payé", variant: "success" },
  "validé": { key: "paid", label: "Payé", variant: "success" },
  pending: { key: "pending", label: "En attente", variant: "warning" },
  "en attente": { key: "pending", label: "En attente", variant: "warning" },
  partial: { key: "partial", label: "Partiel", variant: "info" },
  partiel: { key: "partial", label: "Partiel", variant: "info" },
  overdue: { key: "overdue", label: "En retard", variant: "danger" },
  "en retard": { key: "overdue", label: "En retard", variant: "danger" },
  failed: { key: "failed", label: "Échoué", variant: "danger" },
  cancelled: { key: "cancelled", label: "Annulé", variant: "neutral" },
  refunded: { key: "refunded", label: "Remboursé", variant: "neutral" },
}

export const paymentStatus = (status: string | null | undefined) =>
  STATUSES[(status ?? "").trim().toLowerCase()] ?? {
    key: "unknown",
    label: "Inconnu",
    variant: "neutral" as PaymentStatusVariant,
  }

// The statuses offered as a filter, in the order they are listed.
export const PAYMENT_STATUS_FILTERS = [
  { key: "paid", label: "Payé" },
  { key: "pending", label: "En attente" },
  { key: "partial", label: "Partiel" },
  { key: "overdue", label: "En retard" },
  { key: "failed", label: "Échoué" },
]

// Codes written by the app, plus the wording found on older records.
const METHODS: Record<string, string> = {
  stripe: "Carte bancaire",
  "carte bancaire": "Carte bancaire",
  paypal: "PayPal",
  account_balance: "Solde du compte",
  "solde compte": "Solde du compte",
  "virement bancaire": "Virement bancaire",
}

export const paymentMethodLabel = (method: string | null | undefined) =>
  METHODS[(method ?? "").trim().toLowerCase()] ?? (method?.trim() || "—")

// Money paid in by card or PayPal credits the account.
export const isTopUp = (method: string | null | undefined) =>
  ["stripe", "paypal"].includes((method ?? "").toLowerCase())

// A reservation or an invoice settled with the money already on the account.
export const isBalanceSpend = (method: string | null | undefined) =>
  ["account_balance", "solde compte"].includes((method ?? "").trim().toLowerCase())

export type TransactionType = "topup" | "spend" | "payment"

export const TRANSACTION_TYPES: Record<TransactionType, { label: string; plural: string }> = {
  topup: { label: "Rechargement", plural: "Rechargements" },
  spend: { label: "Dépense", plural: "Dépenses" },
  payment: { label: "Paiement", plural: "Autres paiements" },
}

export const transactionType = (method: string | null | undefined): TransactionType =>
  isTopUp(method) ? "topup" : isBalanceSpend(method) ? "spend" : "payment"
