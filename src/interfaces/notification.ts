import i18n, { currentLocale } from '@/lib/i18n';

// Label of a notification type code. An unknown code is still shown readably:
// "SOME_NEW_TYPE" becomes "Some new type".
export const notificationTypeLabel = (type: string) => {
  const key = `notifications:type.${type}`;
  if (type && i18n.exists(key)) return i18n.t(key);
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

// Heading of a day in a list of notifications: today, yesterday, then the full date.
export const notificationDayLabel = (value: string | Date, now: Date = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return i18n.t('notifications:day.unknown');

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (dayKey(date) === dayKey(now)) return i18n.t('common:labels.today');
  if (dayKey(date) === dayKey(yesterday)) return i18n.t('common:labels.yesterday');

  const label = date.toLocaleDateString(currentLocale(), {
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
