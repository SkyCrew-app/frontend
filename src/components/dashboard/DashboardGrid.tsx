"use client"

import { useState, useCallback, useRef } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { useMutation } from "@apollo/client"
import { UPDATE_DASHBOARD_WIDGETS } from "@/graphql/dashboard"
import { DashboardWidgetConfig, WIDGET_REGISTRY } from "@/interfaces/dashboard"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import WidgetContainer from "./WidgetContainer"
import WidgetSettingsDialog from "./WidgetSettingsDialog"
import WeatherWidget from "./widgets/WeatherWidget"
import ArticlesWidget from "./widgets/ArticlesWidget"
import QuickActionsWidget from "./widgets/QuickActionsWidget"
import UpcomingReservationsWidget from "./widgets/UpcomingReservationsWidget"
import RecentFlightsWidget from "./widgets/RecentFlightsWidget"
import FlightHoursStatsWidget from "./widgets/FlightHoursStatsWidget"
import FleetAvailabilityWidget from "./widgets/FleetAvailabilityWidget"

interface DashboardGridProps {
  widgets: DashboardWidgetConfig[]
  onWidgetsChange: (widgets: DashboardWidgetConfig[]) => void
  userId: number | null
  userEmail: string | null
  preferredAerodrome: string | null
}

const SIZE_TO_COL_SPAN: Record<string, string> = {
  sm: "col-span-1",
  md: "col-span-1",
  lg: "col-span-1 lg:col-span-2",
}

export default function DashboardGrid({
  widgets,
  onWidgetsChange,
  userId,
  userEmail,
  preferredAerodrome,
}: DashboardGridProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [updateDashboardWidgets] = useMutation(UPDATE_DASHBOARD_WIDGETS)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const visibleWidgets = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.order - b.order)

  const saveWidgets = useCallback(
    (newWidgets: DashboardWidgetConfig[]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        if (userId) {
          try {
            await updateDashboardWidgets({
              variables: {
                userId: Number(userId),
                widgets: newWidgets.map(({ widgetId, visible, order, size }) => ({
                  widgetId,
                  visible,
                  order,
                  size,
                })),
              },
            })
          } catch (error) {
            console.error("Erreur lors de la sauvegarde de l'ordre:", error)
          }
        }
      }, 1000)
    },
    [userId, updateDashboardWidgets]
  )

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const reordered = Array.from(visibleWidgets)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)

    const updatedVisible = reordered.map((w, idx) => ({ ...w, order: idx }))

    const hiddenWidgets = widgets.filter((w) => !w.visible)
    const allWidgets = [...updatedVisible, ...hiddenWidgets]

    onWidgetsChange(allWidgets)
    saveWidgets(allWidgets)
  }

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "weather":
        return <WeatherWidget userEmail={userEmail} preferredAerodrome={preferredAerodrome} />
      case "articles":
        return <ArticlesWidget />
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

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Personnaliser
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="dashboard-grid" direction="horizontal" type="widget">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {visibleWidgets.map((widget, index) => {
                const meta = WIDGET_REGISTRY[widget.widgetId]
                if (!meta) return null

                return (
                  <Draggable key={widget.widgetId} draggableId={widget.widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={SIZE_TO_COL_SPAN[widget.size] || "col-span-1"}
                      >
                        <WidgetContainer
                          id={widget.widgetId}
                          title={meta.label}
                          isDragging={snapshot.isDragging}
                          dragHandleProps={provided.dragHandleProps}
                        >
                          {renderWidget(widget.widgetId)}
                        </WidgetContainer>
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <WidgetSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        widgets={widgets}
        onWidgetsChange={onWidgetsChange}
        userId={userId}
      />
    </div>
  )
}
