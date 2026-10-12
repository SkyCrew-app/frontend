"use client"

import Link from "next/link"
import { Map, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState as SharedEmptyState } from "@/components/layout/EmptyState"

interface EmptyStateProps {
  hasFilters?: boolean
  onResetFilters?: () => void
}

/** Empty list of "Mes plans de vol": none prepared yet, or none matching the filters. */
export function EmptyState({ hasFilters, onResetFilters }: EmptyStateProps) {
  if (hasFilters) {
    return (
      <SharedEmptyState
        icon={Map}
        title="Aucun plan de vol ne correspond"
        description="Modifiez la recherche ou les filtres pour retrouver vos plans de vol."
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
      icon={Map}
      title="Aucun plan de vol pour le moment"
      description="Un plan de vol se prépare à partir d'une réservation : ouvrez vos réservations et choisissez « Créer un plan de vol »."
      action={
        <Button asChild>
          <Link href="/reservations/my">
            <Plus className="h-4 w-4" />
            Choisir une réservation
          </Link>
        </Button>
      }
    />
  )
}
