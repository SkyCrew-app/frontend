export interface NotificationSettings {
  email_notifications_enabled: boolean
  sms_notifications_enabled: boolean
  newsletter_subscribed: boolean
}

/**
 * Variables de la mutation `updateNotificationSettings`. Ses trois arguments
 * sont obligatoires : les réglages que l'utilisateur ne modifie pas sont
 * renvoyés avec leur valeur actuelle pour ne pas être écrasés.
 */
export function buildNotificationSettings(
  current: Partial<Record<keyof NotificationSettings, boolean | null>> | null | undefined,
  change: Partial<NotificationSettings>,
): NotificationSettings {
  return {
    email_notifications_enabled: Boolean(current?.email_notifications_enabled),
    sms_notifications_enabled: Boolean(current?.sms_notifications_enabled),
    newsletter_subscribed: Boolean(current?.newsletter_subscribed),
    ...change,
  }
}
