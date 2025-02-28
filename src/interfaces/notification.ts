export const getNotificationTypeInFrench = (type: string) => {
  switch (type) {
    case 'COURSE_COMPLETED':
      return 'Cours terminé';
    case 'COURSE_STARTED':
      return 'Cours commencé';
    case 'COURSE_CANCELED':
      return 'Cours annulé';
    case 'LICENSE_EXPIRED':
      return 'Licence expirée';
    case 'LICENSE_EXPIRING_SOON':
      return 'Licence expirant bientôt';
    case 'RESERVATION_PENDING':
      return 'Réservation en attente';
    case 'MISSING_FLIGHT_PLAN':
      return 'Plan de vol manquant';
    case 'INCOMPLETE_FLIGHT_PLAN':
      return 'Plan de vol incomplet';
    case 'MISSING_PASSENGER_COUNT':
      return 'Nombre de passagers manquant';
    case 'FLIGHT_CREATED':
      return 'Vol créé';
    case 'FLIGHT_CREATED':
      return 'Plan de vol créé';
    case 'COURSE_CREATED':
      return 'Cours créé';
    case 'COMPETENCY_VALIDATED':
      return 'Compétence validée';
    case 'COURSE_COMMENT':
      return 'Commentaire de cours';
    case 'WITHDRAWAL':
      return 'Retrait';
    case 'INVOICE_CREATED':
      return 'Facture créée';
    case 'PAYMENT_RECEIVED':
      return 'Paiement reçu';
    case 'PAYMENT_REFUNDED':
      return 'Paiement remboursé';
    case 'RESERVATION_CONFIRMED':
      return 'Réservation confirmée';
    case 'RESERVATION_CANCELED':
      return 'Réservation annulée';
    case 'RESERVATION_MODIFIED':
      return 'Réservation modifiée';
    case '2FA_ENABLED':
      return '2FA activé';
    case 'USER_UPDATED':
      return 'Utilisateur mis à jour';
    default:
      return type;
  }
};