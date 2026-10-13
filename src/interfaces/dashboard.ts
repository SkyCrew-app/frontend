import i18n from '@/lib/i18n';

export type WidgetSize = 'sm' | 'md' | 'lg';

export interface DashboardWidgetConfig {
  widgetId: string;
  visible: boolean;
  order: number;
  size: WidgetSize;
}

// Label and description are read when shown, so they follow the language.
const widget = (id: string, defaultSize: WidgetSize) => ({
  get label() {
    return i18n.t(`dashboard:widgets.${id}.label`);
  },
  get description() {
    return i18n.t(`dashboard:widgets.${id}.description`);
  },
  defaultSize,
});

export const WIDGET_REGISTRY: Record<string, { label: string; description: string; defaultSize: WidgetSize }> = {
  'weather': widget('weather', 'lg'),
  'quick-actions': widget('quick-actions', 'sm'),
  'upcoming-reservations': widget('upcoming-reservations', 'md'),
  'recent-flights': widget('recent-flights', 'md'),
  'flight-hours-stats': widget('flight-hours-stats', 'md'),
  'fleet-availability': widget('fleet-availability', 'md'),
  'articles': widget('articles', 'lg'),
};

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { widgetId: 'weather', visible: true, order: 0, size: 'lg' },
  { widgetId: 'quick-actions', visible: true, order: 1, size: 'sm' },
  { widgetId: 'upcoming-reservations', visible: true, order: 2, size: 'md' },
  { widgetId: 'recent-flights', visible: true, order: 3, size: 'md' },
  { widgetId: 'flight-hours-stats', visible: true, order: 4, size: 'md' },
  { widgetId: 'fleet-availability', visible: true, order: 5, size: 'md' },
  { widgetId: 'articles', visible: true, order: 6, size: 'lg' },
];
