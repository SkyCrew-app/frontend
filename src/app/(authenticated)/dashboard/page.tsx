"use client"

import { useMemo, useState } from "react"
import { Settings2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { GET_USER_PROFILE } from "@/graphql/user"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { DashboardWidgetConfig } from "@/interfaces/dashboard"
import DashboardGrid from "@/components/dashboard/DashboardGrid"
import WidgetSettingsDialog from "@/components/dashboard/WidgetSettingsDialog"
import { normalizeWidgets } from "@/components/dashboard/widget-config"

export default function DashboardPage() {
  const { t } = useTranslation("dashboard")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Layout chosen during this visit; before that, the one saved on the profile.
  const [editedWidgets, setEditedWidgets] = useState<DashboardWidgetConfig[] | null>(null)

  const { data: userInfo, error } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail },
    skip: !userEmail,
  })

  const profile = userInfo?.userByEmail
  const savedWidgets = useMemo(() => normalizeWidgets(profile?.dashboard_widgets), [profile?.dashboard_widgets])
  const widgets = editedWidgets ?? savedWidgets

  const userId = Number(userData?.id ?? profile?.id) || null
  const firstName: string | null = profile?.first_name || null
  const preferredAerodrome: string | null = profile?.preferred_aerodrome || null
  // Without the profile the saved layout is unknown: wait rather than show another one first.
  const profileLoading = !profile && !error

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={firstName ? t("page.welcome", { name: firstName }) : t("page.title")}
        description={t("page.description")}
        actions={
          <Button variant="outline" onClick={() => setSettingsOpen(true)} disabled={profileLoading}>
            <Settings2 className="h-4 w-4" />
            {t("page.customize")}
          </Button>
        }
      />

      {profileLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          <Skeleton className="h-56 rounded-xl md:col-span-2" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : (
        <DashboardGrid
          widgets={widgets}
          userId={userId}
          preferredAerodrome={preferredAerodrome}
          onCustomize={() => setSettingsOpen(true)}
        />
      )}

      <WidgetSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        widgets={widgets}
        onWidgetsChange={setEditedWidgets}
        userId={userId}
      />
    </div>
  )
}
