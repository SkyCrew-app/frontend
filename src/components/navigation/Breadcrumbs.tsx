"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { Fragment } from "react"
import { useTranslation } from "react-i18next"

// URL segment → key of the `nav` namespace.
const ROUTE_LABEL_KEYS: Record<string, string> = {
  dashboard: "pages.dashboard",
  fleet: "pages.fleet",
  history: "pages.fleetHistory",
  maintenance: "pages.maintenance",
  reservations: "pages.reservations",
  my: "pages.myReservations",
  "flight-plans": "pages.myFlightPlans",
  create: "pages.newFlightPlan",
  instruction: "pages.instruction",
  courses: "pages.myCourses",
  evaluation: "pages.myEvaluations",
  "e-learning": "pages.eLearning",
  administration: "pages.administration",
  planes: "pages.aircraft",
  users: "pages.members",
  finance: "pages.finance",
  audits: "pages.safety",
  incidents: "pages.incidents",
  articles: "pages.articles",
  settings: "pages.settings",
  actions: "pages.actionLog",
  checklists: "pages.checklists",
  logbook: "pages.logbook",
  profile: "pages.profile",
  notifications: "pages.notifications",
  "2fa": "pages.twoFactor",
  "money_account": "pages.balance",
  "close_flight": "pages.closeFlight",
}

// Path prefixes that only group pages and have no page of their own: shown, but not as links.
const WITHOUT_PAGE = new Set(["/close_flight", "/reservations/flight-plans/create"])

export default function Breadcrumbs() {
  const { t } = useTranslation("nav")
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
    // An e-learning address is course then lesson: name them instead of "Details › Details".
    const inLearning = segments.includes("e-learning")
    const dynamicLabel = inLearning
      ? isId(segments[index - 1])
        ? t("breadcrumbs.lesson")
        : t("breadcrumbs.course")
      : t("breadcrumbs.detail")
    const label = isDynamic
      ? dynamicLabel
      : ROUTE_LABEL_KEYS[segment]
        ? t(ROUTE_LABEL_KEYS[segment])
        : segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

    return { href, label, isLast, isLink: !isLast && !WITHOUT_PAGE.has(href) }
  })

  return (
    <nav aria-label={t("breadcrumbs.label")} className="mb-4 flex min-w-0 flex-wrap items-center gap-y-1 text-sm text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center rounded-sm hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("pages.dashboard")}
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
