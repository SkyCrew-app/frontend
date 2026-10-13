"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { AircraftList } from "@/components/fleet-admin/aircraft-list"
import { AircraftFormDialog } from "@/components/fleet-admin/aircraft-form-dialog"

export default function FleetManagementPage() {
  const { t } = useTranslation("fleet")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("admin.title")}
        description={t("admin.description")}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("shared.addAircraft")}
          </Button>
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
