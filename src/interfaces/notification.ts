const NOTIFICATION_TYPES: Record<string, string> = {
  COURSE_COMPLETED: 'Cours terminé',
  COURSE_STARTED: 'Cours commencé',
  COURSE_CANCELED: 'Cours annulé',
  COURSE_CREATED: 'Cours créé',
  COURSE_COMMENT: 'Commentaire de cours',
  COMPETENCY_VALIDATED: 'Compétence validée',
  LICENSE_EXPIRED: 'Licence expirée',
  LICENSE_EXPIRING_SOON: 'Licence expirant bientôt',
  RESERVATION_PENDING: 'Réservation en attente',
  RESERVATION_CONFIRMED: 'Réservation confirmée',
  RESERVATION_CANCELED: 'Réservation annulée',
  RESERVATION_CANCELLED: 'Réservation annulée',
  RESERVATION_MODIFIED: 'Réservation modifiée',
  RESERVATION_FINISHED: 'Réservation terminée',
  MISSING_FLIGHT_PLAN: 'Plan de vol manquant',
  INCOMPLETE_FLIGHT_PLAN: 'Plan de vol incomplet',
  MISSING_PASSENGER_COUNT: 'Nombre de passagers manquant',
  FLIGHT_CREATED: 'Plan de vol créé',
  WITHDRAWAL: 'Retrait',
  INVOICE_CREATED: 'Facture créée',
  PAYMENT_RECEIVED: 'Paiement reçu',
  PAYMENT_REFUNDED: 'Paiement remboursé',
  '2FA_ENABLED': 'Double authentification activée',
  USER_UPDATED: 'Profil mis à jour',
};

// An unknown code is still shown readably: "SOME_NEW_TYPE" becomes "Some new type".
export const getNotificationTypeInFrench = (type: string) => {
  if (NOTIFICATION_TYPES[type]) return NOTIFICATION_TYPES[type];
  const words = (type ?? '').replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// A notification as the API returns it.
export interface AppNotification {
  id: number;
  notification_type: string;
  message: string;
  notification_date: string;
  is_read: boolean;
  action_url?: string | null;
  priority?: string | null;
}

export const isHighPriority = (notification: Pick<AppNotification, 'priority'>) =>
  notification.priority === 'high';

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

// Heading of a day in a list of notifications: "Aujourd'hui", "Hier", then the full date.
export const notificationDayLabel = (value: string | Date, now: Date = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (dayKey(date) === dayKey(now)) return "Aujourd'hui";
  if (dayKey(date) === dayKey(yesterday)) return 'Hier';

  const label = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

// Notifications grouped by day, newest day first, newest notification first within a day.
export function groupNotificationsByDay<T extends Pick<AppNotification, 'notification_date'>>(
  notifications: T[],
  now: Date = new Date(),
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const notification of notifications) {
    const label = notificationDayLabel(notification.notification_date, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(notification);
    } else {
      groups.push({ label, items: [notification] });
    }
  }
  return groups;
}
