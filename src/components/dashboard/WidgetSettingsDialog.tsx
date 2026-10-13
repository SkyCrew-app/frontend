"use client"

import { useState, useEffect } from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { useTranslation } from "react-i18next"
import { SidePanel } from "@/components/layout/SidePanel"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useMutation } from "@apollo/client"
import { UPDATE_DASHBOARD_WIDGETS } from "@/graphql/dashboard"
import { WIDGET_REGISTRY, DashboardWidgetConfig, DEFAULT_WIDGETS } from "@/interfaces/dashboard"
import { useToast } from "@/components/hooks/use-toast"
import { normalizeWidgets } from "./widget-config"

interface WidgetSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  widgets: DashboardWidgetConfig[]
  onWidgetsChange: (widgets: DashboardWidgetConfig[]) => void
  userId: number | null
}

export default function WidgetSettingsDialog({
  open,
  onOpenChange,
  widgets,
  onWidgetsChange,
  userId,
}: WidgetSettingsDialogProps) {
  // Kept in display order; the `order` field is rewritten on save.
  const [localWidgets, setLocalWidgets] = useState<DashboardWidgetConfig[]>(() => normalizeWidgets(widgets))
  const { toast } = useToast()
  const { t } = useTranslation("dashboard")

  const [updateDashboardWidgets, { loading: saving }] = useMutation(UPDATE_DASHBOARD_WIDGETS)

  // Every opening starts from what is on screen, not from an abandoned draft.
  useEffect(() => {
    if (open) setLocalWidgets(normalizeWidgets(widgets))
  }, [open, widgets])

  const handleToggle = (widgetId: string) => {
    setLocalWidgets((prev) => prev.map((w) => (w.widgetId === widgetId ? { ...w, visible: !w.visible } : w)))
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    setLocalWidgets((prev) => {
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    if (!userId) return
    const ordered = localWidgets.map((w, order) => ({ ...w, order }))
    try {
      await updateDashboardWidgets({
        variables: {
          userId: Number(userId),
          widgets: ordered.map(({ widgetId, visible, order, size }) => ({ widgetId, visible, order, size })),
        },
      })
      onWidgetsChange(ordered)
      onOpenChange(false)
      toast({
        title: t("settings.toast.saved.title"),
        description: t("settings.toast.saved.description"),
      })
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      toast({
        title: t("settings.toast.failed.title"),
        description: t("settings.toast.failed.description"),
        variant: "destructive",
      })
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
      title={t("settings.title")}
      description={t("settings.description")}
      onSubmit={handleSave}
      submitLabel={t("common:actions.save")}
      submitting={saving}
      submitDisabled={!userId}
      footerStart={
        <Button
          type="button"
          variant="ghost"
          onClick={() => setLocalWidgets(normalizeWidgets(DEFAULT_WIDGETS))}
          disabled={saving}
        >
          {t("settings.reset")}
        </Button>
      }
    >
      <ul className="divide-y divide-border rounded-lg border">
        {localWidgets.map((widget, index) => {
          const meta = WIDGET_REGISTRY[widget.widgetId]
          const switchId = `widget-visible-${widget.widgetId}`

          return (
            <li key={widget.widgetId} className="flex items-center gap-2 p-3">
              <div className="flex shrink-0 flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-9"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  aria-label={t("settings.moveUpNamed", { name: meta.label })}
                  title={t("settings.moveUp")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-9"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === localWidgets.length - 1}
                  aria-label={t("settings.moveDownNamed", { name: meta.label })}
                  title={t("settings.moveDown")}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
              <label htmlFor={switchId} className="min-w-0 flex-1 cursor-pointer">
                <span className="block text-sm font-medium">{meta.label}</span>
                <span className="block text-xs text-muted-foreground">{meta.description}</span>
              </label>
              <Switch id={switchId} checked={widget.visible} onCheckedChange={() => handleToggle(widget.widgetId)} />
            </li>
          )
        })}
      </ul>
    </SidePanel>
  )
}
