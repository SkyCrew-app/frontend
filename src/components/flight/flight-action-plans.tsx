"use client"

import { useTranslation } from "react-i18next"
import { Link2, MoreHorizontal, Printer, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/hooks/use-toast"

interface FlightPlanActionsProps {
  flightPlanId: string | number
  flightDetails?: {
    departure: string
    arrival: string
    date: string
  }
}

/** Secondary actions of a flight plan page: print the page, share or copy its link. */
export function FlightPlanActions({ flightPlanId, flightDetails }: FlightPlanActionsProps) {
  const { t } = useTranslation("flights")
  const { toast } = useToast()

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: t("actionPlans.toast.copied.title"),
        description: t("actionPlans.toast.copied.description"),
      })
    } catch {
      toast({
        variant: "destructive",
        title: t("actionPlans.toast.copyFailed.title"),
        description: t("actionPlans.toast.copyFailed.description"),
      })
    }
  }

  const share = async () => {
    const text = flightDetails
      ? t("actionPlans.shareText", {
          departure: flightDetails.departure,
          arrival: flightDetails.arrival,
          date: flightDetails.date,
        })
      : t("actionPlans.shareTextFallback", { id: flightPlanId })

    try {
      await navigator.share({ title: t("actionPlans.shareTitle"), text, url: window.location.href })
    } catch (error) {
      // Closing the share sheet is not an error; anything else falls back to the clipboard.
      if (error instanceof DOMException && error.name === "AbortError") return
      await copyLink()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("actionPlans.more")} title={t("actionPlans.more")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Wait for the menu to close so it is not part of the printed page. */}
        <DropdownMenuItem onSelect={() => setTimeout(() => window.print(), 150)}>
          <Printer className="h-4 w-4" />
          {t("actionPlans.printPage")}
        </DropdownMenuItem>
        {canShare && (
          <DropdownMenuItem onSelect={() => void share()}>
            <Share2 className="h-4 w-4" />
            {t("actionPlans.share")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void copyLink()}>
          <Link2 className="h-4 w-4" />
          {t("actionPlans.copyLink")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
