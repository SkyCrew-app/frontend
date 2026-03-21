export type WidgetSize = 'sm' | 'md' | 'lg';

export interface DashboardWidgetConfig {
  widgetId: string;
  visible: boolean;
  order: number;
  size: WidgetSize;
}

export const WIDGET_REGISTRY: Record<string, { label: string; description: string; defaultSize: WidgetSize }> = {
  'weather': { label: 'Météo', description: 'Conditions météo de votre aérodrome', defaultSize: 'lg' },
  'quick-actions': { label: 'Actions rapides', description: 'Raccourcis vers les actions fréquentes', defaultSize: 'sm' },
  'upcoming-reservations': { label: 'Prochaines réservations', description: 'Vos réservations à venir', defaultSize: 'md' },
  'recent-flights': { label: 'Vols récents', description: 'Historique de vos derniers vols', defaultSize: 'md' },
  'flight-hours-stats': { label: 'Heures de vol', description: 'Statistiques de vos heures de vol', defaultSize: 'md' },
  'fleet-availability': { label: 'Disponibilité flotte', description: 'État de la flotte aérienne', defaultSize: 'md' },
  'articles': { label: 'Articles', description: 'Dernières actualités de l\'aéroclub', defaultSize: 'lg' },
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
