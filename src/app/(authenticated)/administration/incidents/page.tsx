"use client"

import { Suspense } from "react"
import { useTranslation } from "react-i18next"
import { PageHeader } from "@/components/layout/PageHeader"
import { ContentSkeleton, IncidentsContent } from "@/components/incidents/incidents-overview"

function Header() {
  const { t } = useTranslation("administration")
  return <PageHeader className="mb-0" title={t("incidents.title")} description={t("incidents.description")} />
}

export default function IncidentsPage() {
  return (
    <div className="space-y-6">
      <Header />
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<ContentSkeleton />}>
        <IncidentsContent />
      </Suspense>
    </div>
  )
}
