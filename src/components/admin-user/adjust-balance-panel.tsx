"use client"

import { useEffect, useState } from "react"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { SidePanel } from "@/components/layout/SidePanel"
import { useToast } from "@/components/hooks/use-toast"
import { ADJUST_MEMBER_BALANCE } from "@/graphql/account"
import { apiRefusalMessage } from "@/components/reservation/api-refusal"
import { formatMoney } from "@/lib/format"

// The ways the API accepts for an entry made by hand.
export const MANUAL_METHODS = ["cash", "cheque", "transfer", "correction"] as const

const REASON_MIN_LENGTH = 3

interface AdjustBalancePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: { id: string | number; first_name: string; last_name: string; user_account_balance?: number | string | null }
  /** The account was changed: the caller refreshes what it shows of it. */
  onAdjusted?: () => void
}

// "12,50" or "12.5" as cents, or null when it is not a positive amount with two decimals at most.
export const parseAmountCents = (text: string): number | null => {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(text.trim())
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"))
  return cents > 0 ? cents : null
}

/**
 * An administrator credits or debits a member's account by hand (cash, cheque, correction).
 * The reason is mandatory: it is the line the member reads in their account history.
 */
export function AdjustBalancePanel({ open, onOpenChange, member, onAdjusted }: AdjustBalancePanelProps) {
  const { t } = useTranslation("administration")
  const { toast } = useToast()
  const [credit, setCredit] = useState(true)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<string>(MANUAL_METHODS[0])
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({})
  const [adjustBalance, { loading }] = useMutation(ADJUST_MEMBER_BALANCE)

  // A fresh form each time the panel opens.
  useEffect(() => {
    if (!open) return
    setCredit(true)
    setAmount("")
    setMethod(MANUAL_METHODS[0])
    setReason("")
    setErrors({})
  }, [open])

  const name = `${member.first_name} ${member.last_name}`
  const balanceCents = Math.round(Number(member.user_account_balance ?? 0) * 100)
  const cents = parseAmountCents(amount)
  const newBalanceCents = cents === null ? null : balanceCents + (credit ? cents : -cents)

  const handleSubmit = async () => {
    const nextErrors: typeof errors = {}
    if (cents === null) nextErrors.amount = t("users.balance.errors.amount")
    // The API refuses it too: a debit never takes an account below zero.
    else if (!credit && cents > balanceCents) nextErrors.amount = t("users.balance.errors.overdraw")
    if (reason.trim().length < REASON_MIN_LENGTH) nextErrors.reason = t("users.balance.errors.reason")
    setErrors(nextErrors)
    if (cents === null || Object.keys(nextErrors).length > 0) return

    try {
      await adjustBalance({
        variables: {
          input: {
            user_id: Number(member.id),
            amount: cents / 100,
            credit,
            payment_method: method,
            reason: reason.trim(),
          },
        },
      })
      const done = credit ? "credited" : "debited"
      toast({
        title: t(`users.balance.toast.${done}.title`),
        description: t(`users.balance.toast.${done}.description`, { amount: formatMoney(cents / 100), name }),
      })
      onAdjusted?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("users.balance.toast.failed.title"),
        description: apiRefusalMessage(error, t("users.balance.toast.failed.description")),
      })
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return
        onOpenChange(next)
      }}
      size="md"
      title={t("users.balance.title")}
      description={t("users.balance.description", { name, balance: formatMoney(balanceCents / 100) })}
      onSubmit={handleSubmit}
      submitLabel={credit ? t("users.balance.submitCredit") : t("users.balance.submitDebit")}
      submitting={loading}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label id="adjust-balance-operation">{t("users.balance.operation")}</Label>
          <RadioGroup
            aria-labelledby="adjust-balance-operation"
            value={credit ? "credit" : "debit"}
            onValueChange={(value) => {
              setCredit(value === "credit")
              setErrors((current) => ({ ...current, amount: undefined }))
            }}
            className="grid-cols-2"
          >
            {(["credit", "debit"] as const).map((operation) => (
              <div key={operation} className="flex items-center gap-2">
                <RadioGroupItem value={operation} id={`adjust-balance-${operation}`} />
                <Label htmlFor={`adjust-balance-${operation}`} className="font-normal">
                  {t(`users.balance.${operation}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjust-balance-amount">
            {t("users.balance.amount")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="adjust-balance-amount"
            inputMode="decimal"
            placeholder="50,00"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              // A refusal answers what was typed then: it goes with the next keystroke,
              // and the new balance shows again.
              setErrors((current) => ({ ...current, amount: undefined }))
            }}
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? "adjust-balance-amount-error" : undefined}
          />
          {errors.amount ? (
            <p id="adjust-balance-amount-error" className="text-sm text-destructive">
              {errors.amount}
            </p>
          ) : (
            newBalanceCents !== null && (
              <p className="text-sm text-muted-foreground tabular-nums">
                {t("users.balance.newBalance", { balance: formatMoney(newBalanceCents / 100) })}
              </p>
            )
          )}
        </div>

        <div className="space-y-2">
          <Label id="adjust-balance-method">{t("users.balance.method")}</Label>
          <RadioGroup
            aria-labelledby="adjust-balance-method"
            value={method}
            onValueChange={setMethod}
            className="grid-cols-2"
          >
            {MANUAL_METHODS.map((code) => (
              <div key={code} className="flex items-center gap-2">
                <RadioGroupItem value={code} id={`adjust-balance-method-${code}`} />
                <Label htmlFor={`adjust-balance-method-${code}`} className="font-normal">
                  {t(`users.balance.methods.${code}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjust-balance-reason">
            {t("users.balance.reason")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="adjust-balance-reason"
            rows={3}
            maxLength={500}
            placeholder={t("users.balance.reasonPlaceholder")}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              setErrors((current) => ({ ...current, reason: undefined }))
            }}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? "adjust-balance-reason-error" : "adjust-balance-reason-hint"}
          />
          {errors.reason ? (
            <p id="adjust-balance-reason-error" className="text-sm text-destructive">
              {errors.reason}
            </p>
          ) : (
            <p id="adjust-balance-reason-hint" className="text-xs text-muted-foreground">
              {t("users.balance.reasonHint")}
            </p>
          )}
        </div>
      </div>
    </SidePanel>
  )
}
