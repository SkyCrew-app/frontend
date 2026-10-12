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
