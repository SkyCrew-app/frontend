"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { CalendarClock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState as SharedEmptyState } from "@/components/layout/EmptyState"

interface EmptyStateProps {
  hasFilters?: boolean
  onResetFilters?: () => void
}

/** Empty list of "Mes réservations": nothing booked yet, or nothing matching the filters. */
export function EmptyState({ hasFilters, onResetFilters }: EmptyStateProps) {
  const { t } = useTranslation("reservations")
  if (hasFilters) {
    return (
      <SharedEmptyState
        icon={CalendarClock}
        title={t("my.empty.filteredTitle")}
        description={t("my.empty.filteredDescription")}
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              {t("my.empty.resetFilters")}
            </Button>
          )
        }
      />
    )
  }

  return (
    <SharedEmptyState
      icon={CalendarClock}
      title={t("my.empty.title")}
      description={t("my.empty.description")}
      action={
        <Button asChild>
          <Link href="/reservations?new=1">
            <Plus className="h-4 w-4" />
            {t("my.empty.action")}
          </Link>
        </Button>
      }
    />
  )
}
