"use client"

import { LayoutDashboard, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/EmptyState"
import { DashboardWidgetConfig, WIDGET_REGISTRY } from "@/interfaces/dashboard"
import WeatherWidget from "./widgets/WeatherWidget"
import ArticlesWidget from "./widgets/ArticlesWidget"
import QuickActionsWidget from "./widgets/QuickActionsWidget"
import UpcomingReservationsWidget from "./widgets/UpcomingReservationsWidget"
import RecentFlightsWidget from "./widgets/RecentFlightsWidget"
import FlightHoursStatsWidget from "./widgets/FlightHoursStatsWidget"
import FleetAvailabilityWidget from "./widgets/FleetAvailabilityWidget"

interface DashboardGridProps {
  widgets: DashboardWidgetConfig[]
  userId: number | null
  preferredAerodrome: string | null
  onCustomize: () => void
}

export default function DashboardGrid({ widgets, userId, preferredAerodrome, onCustomize }: DashboardGridProps) {
  const visibleWidgets = widgets
    .filter((w) => w.visible && WIDGET_REGISTRY[w.widgetId])
    .sort((a, b) => a.order - b.order)

  const renderWidget = (widgetId: string, wide: boolean) => {
    switch (widgetId) {
      case "weather":
        return <WeatherWidget preferredAerodrome={preferredAerodrome} wide={wide} />
      case "articles":
        return <ArticlesWidget wide={wide} />
      case "quick-actions":
        return <QuickActionsWidget />
      case "upcoming-reservations":
        return <UpcomingReservationsWidget userId={userId} />
      case "recent-flights":
        return <RecentFlightsWidget userId={userId} />
      case "flight-hours-stats":
        return <FlightHoursStatsWidget userId={userId} />
      case "fleet-availability":
        return <FleetAvailabilityWidget />
      default:
        return null
    }
  }

  if (visibleWidgets.length === 0) {
    return (
      <EmptyState
        icon={LayoutDashboard}
        title="Aucun widget affiché"
        description="Choisissez les informations à afficher sur votre tableau de bord."
        action={
          <Button onClick={onCustomize}>
            <Settings2 className="h-4 w-4" />
            Personnaliser
          </Button>
        }
      />
    )
  }

  return (
    // Dense flow: a narrow widget moves up into the gap a wide one would leave.
    <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleWidgets.map((widget) => {
        const wide = widget.size === "lg"
        return (
          <div key={widget.widgetId} className={wide ? "min-w-0 md:col-span-2" : "min-w-0"}>
            {renderWidget(widget.widgetId, wide)}
          </div>
        )
      })}
    </div>
  )
}
