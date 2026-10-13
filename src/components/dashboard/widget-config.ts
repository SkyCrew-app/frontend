import { AvailabilityStatus } from "@/interfaces/aircraft"
import { DashboardWidgetConfig, WIDGET_REGISTRY, WidgetSize } from "@/interfaces/dashboard"
import i18n from "@/lib/i18n"

const SIZES: WidgetSize[] = ["sm", "md", "lg"]

type StoredWidget = Partial<DashboardWidgetConfig> | null | undefined

// The saved layout, made safe to display: unknown widgets are dropped, widgets
// added to the app since the last save are appended, and the order is 0..n-1.
export function normalizeWidgets(stored: StoredWidget[] | null | undefined): DashboardWidgetConfig[] {
  const known = new Map<string, DashboardWidgetConfig>()

  const sorted = [...(stored ?? [])].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
  for (const widget of sorted) {
    const id = widget?.widgetId
    if (!id || !WIDGET_REGISTRY[id] || known.has(id)) continue
    known.set(id, {
      widgetId: id,
      visible: widget.visible ?? true,
      order: known.size,
      size: widget.size && SIZES.includes(widget.size) ? widget.size : WIDGET_REGISTRY[id].defaultSize,
    })
  }

  for (const [id, meta] of Object.entries(WIDGET_REGISTRY)) {
    if (!known.has(id)) {
      known.set(id, { widgetId: id, visible: true, order: known.size, size: meta.defaultSize })
    }
  }

  return [...known.values()]
}

type AvailabilityVariant = "success" | "warning" | "info" | "neutral"

// Same wording and colours as the fleet page.
const AVAILABILITY: Record<string, AvailabilityVariant> = {
  [AvailabilityStatus.AVAILABLE]: "success",
  [AvailabilityStatus.UNAVAILABLE]: "warning",
  [AvailabilityStatus.RESERVED]: "info",
}

export const aircraftAvailability = (status: string | null | undefined) => {
  const code = (status ?? "").toUpperCase()
  return AVAILABILITY[code]
    ? { label: i18n.t(`dashboard:availability.${code}`), variant: AVAILABILITY[code] }
    : { label: i18n.t("dashboard:availability.unknown"), variant: "neutral" as AvailabilityVariant }
}
