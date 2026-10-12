"use client"

import Link from "next/link"
import { CalendarClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState as SharedEmptyState } from "@/components/layout/EmptyState"

interface EmptyStateProps {
  hasFilters?: boolean
  onResetFilters?: () => void
}

/** Empty list of "Mes réservations": nothing booked yet, or nothing matching the filters. */
export function EmptyState({ hasFilters, onResetFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <SharedEmptyState
        icon={CalendarClock}
        title="Aucune réservation ne correspond"
        description="Modifiez la recherche ou les filtres pour retrouver vos réservations."
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              Réinitialiser les filtres
            </Button>
          )
        }
      />
    )
  }

  return (
    <SharedEmptyState
      icon={CalendarClock}
      title="Aucune réservation pour le moment"
      description="Réservez un avion depuis le calendrier : vos réservations apparaîtront ici."
      action={
        <Button asChild>
          <Link href="/reservations">
            <Plus className="h-4 w-4" />
            Réserver un avion
          </Link>
        </Button>
      }
    />
  )
}
