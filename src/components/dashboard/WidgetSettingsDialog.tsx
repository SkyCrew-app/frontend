"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useMutation } from "@apollo/client"
import { UPDATE_DASHBOARD_WIDGETS } from "@/graphql/dashboard"
import { WIDGET_REGISTRY, DashboardWidgetConfig } from "@/interfaces/dashboard"
import { useToast } from "@/components/hooks/use-toast"

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
  const [localWidgets, setLocalWidgets] = useState<DashboardWidgetConfig[]>(widgets)
  const { toast } = useToast()

  const [updateDashboardWidgets, { loading: saving }] = useMutation(UPDATE_DASHBOARD_WIDGETS)

  useEffect(() => {
    setLocalWidgets(widgets)
  }, [widgets])

  const handleToggle = (widgetId: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) =>
        w.widgetId === widgetId ? { ...w, visible: !w.visible } : w
      )
    )
  }

  const handleSave = async () => {
    try {
      if (userId) {
        await updateDashboardWidgets({
          variables: {
            userId: Number(userId),
            widgets: localWidgets.map(({ widgetId, visible, order, size }) => ({
              widgetId,
              visible,
              order,
              size,
            })),
          },
        })
      }
      onWidgetsChange(localWidgets)
      onOpenChange(false)
      toast({
        title: "Préférences sauvegardées",
        description: "Votre tableau de bord a été mis à jour.",
      })
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les préférences.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personnaliser le tableau de bord</DialogTitle>
          <DialogDescription>
            Activez ou désactivez les widgets affichés sur votre tableau de bord.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.entries(WIDGET_REGISTRY).map(([id, meta]) => {
            const widget = localWidgets.find((w) => w.widgetId === id)
            const isVisible = widget?.visible ?? true

            return (
              <div key={id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
                <Switch
                  checked={isVisible}
                  onCheckedChange={() => handleToggle(id)}
                />
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
