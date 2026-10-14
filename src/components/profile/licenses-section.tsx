"use client"

import React, { useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Award, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { MY_LICENSES } from "@/graphql/licences"
import { LicenseCard, type License } from "./license-card"
import { MyLicenseForm } from "./my-license-form"

const expirationTime = (license: License) => {
  const time = license.expiration_date ? new Date(license.expiration_date).getTime() : Number.NaN
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

interface LicensesSectionProps {
  /** False while the section is mounted but not shown (a hidden tab): nothing is fetched yet. */
  active?: boolean
}

/** The member's own licences, pending ones included; they add or correct them here. */
export function LicensesSection({ active = true }: LicensesSectionProps) {
  const { t } = useTranslation("profile")
  const { data, loading, error, refetch } = useQuery<{ myLicenses: License[] }>(MY_LICENSES, {
    fetchPolicy: "cache-and-network",
    skip: !active,
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<License | null>(null)

  const licenses = data?.myLicenses ?? []
  // The licence to renew first comes first.
  const sortedLicenses = [...licenses].sort((a, b) => expirationTime(a) - expirationTime(b))

  const openForm = (license: License | null) => {
    setEditing(license)
    setFormOpen(true)
  }

  const addButton = (
    <Button onClick={() => openForm(null)}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      {t("licenses.add")}
    </Button>
  )

  return (
    <section className="space-y-4" aria-labelledby="licenses-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="licenses-title" className="text-lg font-semibold">
            {t("licenses.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("licenses.subtitle")}</p>
        </div>
        {licenses.length > 0 && addButton}
      </div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error && !data ? (
        <ErrorState onRetry={() => refetch().catch(() => undefined)} />
      ) : sortedLicenses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedLicenses.map((license) => (
            <LicenseCard key={license.id} license={license} onEdit={openForm} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Award}
          title={t("licenses.emptyTitle")}
          description={t("licenses.emptyDescription")}
          action={addButton}
        />
      )}

      <MyLicenseForm open={formOpen} onOpenChange={setFormOpen} license={editing} />
    </section>
  )
}
