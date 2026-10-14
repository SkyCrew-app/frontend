"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { ClipboardList, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { ContentSkeleton, IncidentsContent } from "@/components/incidents/incidents-overview"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { canFollowUpIncidents } from "@/lib/incident"
import { ReportIncidentPanel } from "@/components/incidents/report-incident-panel"

/**
 * Every member reads the incidents of the fleet and may report one at any time; the staff
 * follows them up in the administration.
 */
export default function FleetIncidentsPage() {
  const { t } = useTranslation("fleet")
  const staff = canFollowUpIncidents(useUserData(useCurrentUser()))
  const [reporting, setReporting] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("incidents.list.title")}
        description={t("incidents.list.description")}
        actions={
          <>
            {staff && (
              <Button asChild variant="outline">
                <Link href="/administration/incidents">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  {t("incidents.list.followUp")}
                </Link>
              </Button>
            )}
            <Button onClick={() => setReporting(true)}>
              <TriangleAlert className="h-4 w-4" aria-hidden="true" />
              {t("incidents.report.action")}
            </Button>
          </>
        }
      />
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<ContentSkeleton />}>
        <IncidentsContent readOnly />
      </Suspense>
      <ReportIncidentPanel open={reporting} onOpenChange={setReporting} />
    </div>
  )
}
