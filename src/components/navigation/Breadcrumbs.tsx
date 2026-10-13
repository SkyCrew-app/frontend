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
  "flight-plans": "Mes plans de vol",
  create: "Nouveau plan de vol",
  instruction: "Instruction",
  courses: "Mes cours",
  evaluation: "Mes évaluations",
  "e-learning": "E-learning",
  administration: "Administration",
  planes: "Avions",
  users: "Membres",
  finance: "Finance",
  audits: "Sécurité",
  incidents: "Incidents",
  articles: "Articles",
  settings: "Paramètres",
  checklists: "Checklists",
  logbook: "Carnet de vol",
  profile: "Mon profil",
  notifications: "Notifications",
  "2fa": "Double authentification",
  "money_account": "Mon solde",
  "close_flight": "Clôture de vol",
}

// Path prefixes that only group pages and have no page of their own: shown, but not as links.
const WITHOUT_PAGE = new Set(["/close_flight", "/reservations/flight-plans/create"])

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
    const isId = (value: string | undefined) => !!value && (/^\d+$/.test(value) || /^[0-9a-f-]{36}$/.test(value))
    const isDynamic = isId(segment)
    // An e-learning address is course then lesson: name them instead of "Détail › Détail".
    const inLearning = segments.includes("e-learning")
    const dynamicLabel = inLearning ? (isId(segments[index - 1]) ? "Leçon" : "Cours") : "Détail"
    const label = isDynamic
      ? dynamicLabel
      : ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

    return { href, label, isLast, isLink: !isLast && !WITHOUT_PAGE.has(href) }
  })

  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 flex min-w-0 flex-wrap items-center gap-y-1 text-sm text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Tableau de bord"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
      </Link>
      {breadcrumbs.map((crumb) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="h-3.5 w-3.5 mx-1.5 text-muted-foreground/50 shrink-0" aria-hidden="true" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground truncate" aria-current="page">
              {crumb.label}
            </span>
          ) : !crumb.isLink ? (
            <span className="truncate">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="truncate rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  )
}
