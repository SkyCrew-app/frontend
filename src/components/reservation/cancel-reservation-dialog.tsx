"use client"

import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Reservation } from "@/interfaces/reservation"
import { formatDate, formatMoney, formatTime } from "@/lib/format"

interface CancelReservationDialogProps {
  reservation: Reservation | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  cancelling: boolean
  /** The instructor of the booking declines it (it is not theirs). */
  declining?: boolean
  /** The booking is the signed-in member's: "you" rather than "the pilot" in the refund line. */
  forSelf?: boolean
}

/**
 * Confirmation of a cancellation, the same in the calendar and in "Mes réservations":
 * it names the booking and says what is given back. The API refunds exactly what was
 * charged for the booking (`charged_amount`), and nothing when nothing was.
 */
export function CancelReservationDialog({
  reservation,
  onOpenChange,
  onConfirm,
  cancelling,
  declining = false,
  forSelf = true,
}: CancelReservationDialogProps) {
  const { t } = useTranslation("reservations")
  // An instructor declining does not see the price (the API does not give it to them): the
  // description already says the student is refunded. Without the price, nothing is claimed.
  const priceKnown = !declining && reservation != null && reservation.charged_amount !== undefined
  const charged = reservation?.charged_amount != null ? Number(reservation.charged_amount) : 0
  const refund = !priceKnown
    ? null
    : charged > 0
      ? t(forSelf ? "cancel.refund.self" : "cancel.refund.pilot", { amount: formatMoney(charged) })
      : t("cancel.refund.none")

  return (
    <AlertDialog open={reservation !== null} onOpenChange={(open) => !open && !cancelling && onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{declining ? t("detail.declineConfirm.title") : t("cancel.title")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                {reservation &&
                  t(declining ? "detail.declineConfirm.description" : "cancel.description", {
                    aircraft: reservation.aircraft.registration_number,
                    date: formatDate(reservation.start_time),
                    start: formatTime(reservation.start_time),
                    end: formatTime(reservation.end_time),
                  })}
              </p>
              {refund && <p className="font-medium text-foreground">{refund}</p>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelling}>{t("cancel.keep")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={cancelling}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
            {declining ? t("detail.declineConfirm.action") : t("cancel.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
