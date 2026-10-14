"use client"

import { useTranslation } from "react-i18next"
import { Wallet } from "lucide-react"
import { formatMoney } from "@/lib/format"
import { INSTRUCTOR_FEE_PER_HOUR, bookingPrice, priceDifference } from "@/components/reservation/booking-price"

interface PriceEstimateProps {
  hourlyCost: number | null | undefined
  start: Date | null
  end: Date | null
  withInstructor?: boolean
  /** Editing a booking: what was charged for it, and whether its slot or aircraft changes. */
  chargedAmount?: number | null
  slotChanged?: boolean
  /** The booking is the signed-in member's: "your account" rather than "the pilot's account". */
  forSelf?: boolean
}

/** The price of the slot being booked, or what a change will charge or refund. */
export function PriceEstimate({
  hourlyCost,
  start,
  end,
  withInstructor = false,
  chargedAmount,
  slotChanged = true,
  forSelf = true,
}: PriceEstimateProps) {
  const { t } = useTranslation("reservations")
  const editing = chargedAmount !== undefined
  const price = start && end ? bookingPrice(hourlyCost, start, end, withInstructor) : null
  const account = forSelf ? t("price.yourAccount") : t("price.pilotAccount")

  let title: string | null = null
  let detail: string | null = null

  if (editing && !slotChanged && chargedAmount != null) {
    title = t("price.paid", { amount: formatMoney(Number(chargedAmount)) })
    detail = t("price.unchanged")
  } else if (price != null) {
    const hours = (end!.getTime() - start!.getTime()) / 3_600_000
    title = editing ? t("price.newPrice", { amount: formatMoney(price) }) : t("price.estimate", { amount: formatMoney(price) })
    const rate = t("price.rate", { rate: formatMoney(Number(hourlyCost)) })
    const fee =
      withInstructor && INSTRUCTOR_FEE_PER_HOUR > 0
        ? t("price.instructorFee", { amount: formatMoney(Math.round(hours * INSTRUCTOR_FEE_PER_HOUR * 100) / 100) })
        : null
    const difference = editing ? priceDifference(price, chargedAmount) : null
    const movement = !editing
      ? t("price.chargedOnBooking", { account })
      : difference == null
        ? null
        : difference > 0
          ? t("price.differenceCharged", { amount: formatMoney(difference), paid: formatMoney(Number(chargedAmount)), account })
          : difference < 0
            ? t("price.differenceRefunded", { amount: formatMoney(-difference), paid: formatMoney(Number(chargedAmount)), account })
            : t("price.samePrice")
    detail = [rate, fee, movement].filter(Boolean).join(" · ")
  }

  if (!title) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm" aria-live="polite">
      <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-0.5">
        <p className="font-medium tabular-nums">{title}</p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  )
}
