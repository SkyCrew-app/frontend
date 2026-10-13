"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Map, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState as SharedEmptyState } from "@/components/layout/EmptyState"

interface EmptyStateProps {
  hasFilters?: boolean
  onResetFilters?: () => void
}

/** Empty list of "Mes plans de vol": none prepared yet, or none matching the filters. */
export function EmptyState({ hasFilters, onResetFilters }: EmptyStateProps) {
  const { t } = useTranslation("flights")

  if (hasFilters) {
    return (
      <SharedEmptyState
        icon={Map}
        title={t("plans.empty.filteredTitle")}
        description={t("plans.empty.filteredDescription")}
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              {t("plans.empty.resetFilters")}
            </Button>
          )
        }
      />
    )
  }

  return (
    <SharedEmptyState
      icon={Map}
      title={t("plans.empty.title")}
      description={t("plans.empty.description")}
      action={
        <Button asChild>
          <Link href="/reservations/my">
            <Plus className="h-4 w-4" />
            {t("plans.empty.chooseReservation")}
          </Link>
        </Button>
      }
    />
  )
}
