"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Tableau de bord",
  fleet: "Flotte",
  history: "Historique",
  maintenance: "Maintenance",
  reservations: "Réservations",
  my: "Mes réservations",
  "flight-plans": "Plans de vol",
  instruction: "Instruction",
  courses: "Cours",
  evaluation: "Évaluations",
  "e-learning": "E-learning",
  administration: "Administration",
  planes: "Avions",
  users: "Membres",
  finance: "Finance",
  audits: "Sécurité",
  articles: "Articles",
  settings: "Paramètres",
  checklists: "Checklists",
  logbook: "Carnet de vol",
  profile: "Mon profil",
  notifications: "Notifications",
  "2fa": "Authentification 2FA",
  "money_account": "Mon solde",
  "close_flight": "Clôture de vol",
}

export default function Breadcrumbs() {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)

  // Don't show breadcrumbs on dashboard (root page)
  if (segments.length <= 1 && segments[0] === "dashboard") {
    return null
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/")
    const isLast = index === segments.length - 1

    // Skip dynamic segments (UUIDs, numeric IDs)
    const isDynamic = /^\d+$/.test(segment) || /^[0-9a-f-]{36}$/.test(segment)
    const label = isDynamic
      ? "Détail"
      : ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

    return { href, label, isLast, isDynamic }
  })

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center text-sm text-muted-foreground mb-4">
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Accueil"
      >
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/50 shrink-0" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors truncate"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
