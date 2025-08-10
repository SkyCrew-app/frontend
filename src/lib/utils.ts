import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { AuditCategoryType, AuditFrequencyType, AuditResultType, CriticalityLevel } from "@/interfaces/audit"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, locale = "fr-FR", currency = "EUR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Fonction pour formater une date
export function formatDate(date: Date, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

/**
 * Conversion de la catégorie d'audit en texte descriptif
 */
export const getAuditCategoryLabel = (category: AuditCategoryType): string => {
  const labels = {
    [AuditCategoryType.CELLULE]: "Cellule",
    [AuditCategoryType.MOTEUR]: "Moteur",
    [AuditCategoryType.AVIONIQUE]: "Avionique",
    [AuditCategoryType.TRAIN_ATTERRISSAGE]: "Train d'atterrissage",
    [AuditCategoryType.SYSTEME_CARBURANT]: "Système carburant",
    [AuditCategoryType.SYSTEME_ELECTRIQUE]: "Système électrique",
    [AuditCategoryType.DOCUMENTATION]: "Documentation",
    [AuditCategoryType.EQUIPEMENT_SECURITE]: "Équipement de sécurité",
    [AuditCategoryType.AUTRE]: "Autre",
  }

  return labels[category] || "Inconnu"
}

/**
 * Conversion de la fréquence d'audit en texte descriptif
 */
export const getAuditFrequencyLabel = (frequency: AuditFrequencyType): string => {
  const labels = {
    [AuditFrequencyType.QUOTIDIEN]: "Quotidien",
    [AuditFrequencyType.HEBDOMADAIRE]: "Hebdomadaire",
    [AuditFrequencyType.MENSUEL]: "Mensuel",
    [AuditFrequencyType.TRIMESTRIEL]: "Trimestriel",
    [AuditFrequencyType.SEMESTRIEL]: "Semestriel",
    [AuditFrequencyType.ANNUEL]: "Annuel",
    [AuditFrequencyType.BIANNUEL]: "Tous les 2 ans",
    [AuditFrequencyType.HEURES_DE_VOL]: "Basé sur les heures de vol",
    [AuditFrequencyType.APRES_INCIDENT]: "Après incident",
    [AuditFrequencyType.AUTRE]: "Autre fréquence",
  }

  return labels[frequency] || "Inconnu"
}

/**
 * Conversion du résultat d'audit en texte descriptif
 */
export const getAuditResultLabel = (result: AuditResultType): string => {
  const labels = {
    [AuditResultType.CONFORME]: "Conforme",
    [AuditResultType.NON_CONFORME]: "Non conforme",
    [AuditResultType.CONFORME_AVEC_REMARQUES]: "Conforme avec remarques",
    [AuditResultType.NON_APPLICABLE]: "Non applicable",
  }

  return labels[result] || "Inconnu"
}

/**
 * Conversion du niveau de criticité en texte descriptif
 */
export const getCriticalityLabel = (level: CriticalityLevel): string => {
  const labels = {
    [CriticalityLevel.CRITIQUE]: "Critique",
    [CriticalityLevel.MAJEUR]: "Majeur",
    [CriticalityLevel.MINEUR]: "Mineur",
    [CriticalityLevel.INFO]: "Information",
  }

  return labels[level] || "Inconnu"
}

/**
 * Calcule la date du prochain audit en fonction de la fréquence
 */
export const calculateNextAuditDate = (currentDate: Date, frequency: AuditFrequencyType): Date | null => {
  const nextDate = new Date(currentDate)

  switch (frequency) {
    case AuditFrequencyType.QUOTIDIEN:
      nextDate.setDate(nextDate.getDate() + 1)
      break
    case AuditFrequencyType.HEBDOMADAIRE:
      nextDate.setDate(nextDate.getDate() + 7)
      break
    case AuditFrequencyType.MENSUEL:
      nextDate.setMonth(nextDate.getMonth() + 1)
      break
    case AuditFrequencyType.TRIMESTRIEL:
      nextDate.setMonth(nextDate.getMonth() + 3)
      break
    case AuditFrequencyType.SEMESTRIEL:
      nextDate.setMonth(nextDate.getMonth() + 6)
      break
    case AuditFrequencyType.ANNUEL:
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break
    case AuditFrequencyType.BIANNUEL:
      nextDate.setFullYear(nextDate.getFullYear() + 2)
      break
    case AuditFrequencyType.HEURES_DE_VOL:
    case AuditFrequencyType.APRES_INCIDENT:
    case AuditFrequencyType.AUTRE:
      return null
    default:
      return null
  }
  return nextDate
}
