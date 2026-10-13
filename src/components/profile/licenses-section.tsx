"use client"

import React from "react"
import { useTranslation } from "react-i18next"
import { Award } from "lucide-react"
import { EmptyState } from "@/components/layout/EmptyState"
import { LicenseCard, type License } from "./license-card"

interface LicensesSectionProps {
  licenses: License[]
}

const expirationTime = (license: License) => {
  const time = new Date(license.expiration_date).getTime()
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
}

export function LicensesSection({ licenses = [] }: LicensesSectionProps) {
  const { t } = useTranslation("profile")
  // The licence to renew first comes first.
  const sortedLicenses = [...(licenses ?? [])].sort((a, b) => expirationTime(a) - expirationTime(b))

  return (
    <section className="space-y-4" aria-labelledby="licenses-title">
      <div>
        <h2 id="licenses-title" className="text-lg font-semibold">
          {t("licenses.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("licenses.subtitle")}</p>
      </div>

      {sortedLicenses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedLicenses.map((license) => (
            <LicenseCard key={license.id} license={license} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Award}
          title={t("licenses.emptyTitle")}
          description={t("licenses.emptyDescription")}
        />
      )}
    </section>
  )
}
