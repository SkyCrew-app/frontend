"use client"

import React from "react"
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
  // The licence to renew first comes first.
  const sortedLicenses = [...(licenses ?? [])].sort((a, b) => expirationTime(a) - expirationTime(b))

  return (
    <section className="space-y-4" aria-labelledby="licenses-title">
      <div>
        <h2 id="licenses-title" className="text-lg font-semibold">
          Mes licences
        </h2>
        <p className="text-sm text-muted-foreground">Classées par date d'expiration, la plus proche en premier.</p>
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
          title="Aucune licence enregistrée"
          description="Vos licences apparaîtront ici une fois ajoutées à votre dossier par le club."
        />
      )}
    </section>
  )
}
