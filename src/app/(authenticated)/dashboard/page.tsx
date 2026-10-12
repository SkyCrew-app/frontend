"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Plane } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@apollo/client"
import { GET_USER_PROFILE } from "@/graphql/user"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { DashboardWidgetConfig, DEFAULT_WIDGETS } from "@/interfaces/dashboard"
import DashboardGrid from "@/components/dashboard/DashboardGrid"

export default function DashboardPage() {
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)
  const [userAirport, setUserAirport] = useState<string | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(DEFAULT_WIDGETS)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data: userInfo } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail },
    skip: !userEmail,
  })

  useEffect(() => {
    if (userInfo && userInfo.userByEmail) {
      const { first_name, preferred_aerodrome, dashboard_widgets } = userInfo.userByEmail
      if (first_name) {
        setFirstName(first_name)
      }
      if (preferred_aerodrome) {
        setUserAirport(preferred_aerodrome)
      }
      if (dashboard_widgets && dashboard_widgets.length > 0) {
        setWidgets(
          dashboard_widgets.map((w: any) => ({
            widgetId: w.widgetId,
            visible: w.visible,
            order: w.order,
            size: w.size,
          }))
        )
      }
    }
  }, [userInfo])

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? (
              <>Bienvenue, {firstName}</>
            ) : (
              <Skeleton className="h-8 w-48" />
            )}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Voici votre tableau de bord personnalisé
          </p>
        </div>
        {userAirport && (
          <Badge
            variant="outline"
            className="px-3 py-1 flex items-center gap-1 w-fit bg-info/10 text-info border-info/30"
          >
            <Plane className="h-3.5 w-3.5 rotate-45" />
            <span>{userAirport}</span>
          </Badge>
        )}
      </div>

      <DashboardGrid
        widgets={widgets}
        onWidgetsChange={setWidgets}
        userId={userId}
        userEmail={userEmail}
        preferredAerodrome={userAirport}
      />
    </div>
  )
}
