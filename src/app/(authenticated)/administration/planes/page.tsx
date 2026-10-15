"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { AircraftList } from "@/components/fleet-admin/aircraft-list"
import { AircraftFormDialog } from "@/components/fleet-admin/aircraft-form-dialog"
import { PlanLimitButton } from "@/components/plan/PlanLimitButton"
import { usePlanRoom } from "@/components/hooks/usePlanRoom"
import { GET_AIRCRAFTS } from "@/graphql/planes"

export default function FleetManagementPage() {
  const { t } = useTranslation("fleet")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  // The list loaded by AircraftList, read from the cache: an aircraft added, retired or put back
  // in service changes the places used in the plan.
  const { data: fleet } = useQuery<{ getAircrafts: { id: number; availability_status: string }[] }>(GET_AIRCRAFTS, {
    fetchPolicy: "cache-only",
  })
  const fullAt = usePlanRoom(
    "aircraft",
    fleet?.getAircrafts.map((aircraft) => `${aircraft.id}:${aircraft.availability_status}`).join(","),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("admin.title")}
        description={t("admin.description")}
        actions={
          <PlanLimitButton limit="aircraft" reached={fullAt} onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("shared.addAircraft")}
          </PlanLimitButton>
        }
      />

      <AircraftList onCreate={() => setIsCreateModalOpen(true)} />

      {/* The list is refreshed by the mutation itself. */}
      <AircraftFormDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}
