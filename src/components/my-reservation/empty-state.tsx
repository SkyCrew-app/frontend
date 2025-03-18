"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CalendarClock, Plus } from "lucide-react"
import Link from "next/link"

interface EmptyStateProps {
  message?: string
  hasFilters?: boolean
  onResetFilters?: () => void
}

export function EmptyState({ message, hasFilters, onResetFilters }: EmptyStateProps) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarClock className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium mb-2">Aucune réservation trouvée</h3>
        <p className="text-muted-foreground mb-6 max-w-md">{message || "Vous n'avez pas encore de réservations."}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          {hasFilters && onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              Réinitialiser les filtres
            </Button>
          )}
          <Link href="/reservation-calendar">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Créer une réservation
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

