"use client"

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
  const { toast } = useToast()

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: "Lien copié", description: "Le lien du plan de vol est dans le presse-papiers." })
    } catch {
      toast({
        variant: "destructive",
        title: "Copie impossible",
        description: "Le lien n'a pas pu être copié. Copiez l'adresse de la page depuis votre navigateur.",
      })
    }
  }

  const share = async () => {
    const text = flightDetails
      ? `Plan de vol ${flightDetails.departure} → ${flightDetails.arrival} (${flightDetails.date})`
      : `Plan de vol n° ${flightPlanId}`

    try {
      await navigator.share({ title: "Plan de vol Skycrew", text, url: window.location.href })
    } catch (error) {
      // Closing the share sheet is not an error; anything else falls back to the clipboard.
      if (error instanceof DOMException && error.name === "AbortError") return
      await copyLink()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Autres actions" title="Autres actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Wait for the menu to close so it is not part of the printed page. */}
        <DropdownMenuItem onSelect={() => setTimeout(() => window.print(), 150)}>
          <Printer className="h-4 w-4" />
          Imprimer la page
        </DropdownMenuItem>
        {canShare && (
          <DropdownMenuItem onSelect={() => void share()}>
            <Share2 className="h-4 w-4" />
            Partager
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => void copyLink()}>
          <Link2 className="h-4 w-4" />
          Copier le lien
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
