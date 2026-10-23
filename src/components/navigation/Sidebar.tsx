"use client"

import { canOpenPage } from "@/lib/proxy-rules"
import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Plane,
  Calendar,
  GraduationCap,
  Settings,
  ChevronRight,
  User,
  LogOut,
  ClipboardCheck,
  BookOpen,
  Newspaper,
  Search,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { GET_USER_PROFILE } from "@/graphql/user"
import { useCurrentUser } from "@/components/hooks/userHooks"
import { useMounted } from "@/components/hooks/useMounted"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { useLogout } from "@/components/hooks/useLogout"
import SkycrewLogo from "./SkycrewLogo"
import { roleLabel } from "./role-label"
import { usePlan } from "@/components/hooks/usePlan"
import { planAllowsPage } from "@/lib/plan"

// `labelKey` is a key of the `nav` namespace.
const menuItems = [
  { labelKey: "pages.dashboard", icon: LayoutDashboard, path: "/dashboard" },
  {
    labelKey: "pages.fleet",
    icon: Plane,
    path: "/fleet",
    subItems: [
      { labelKey: "pages.fleetHistory", path: "/fleet/history" },
      { labelKey: "pages.maintenance", path: "/fleet/maintenance" },
      { labelKey: "pages.incidents", path: "/fleet/incidents" },
    ],
  },
  {
    labelKey: "pages.reservations",
    icon: Calendar,
    path: "/reservations",
    subItems: [
      { labelKey: "pages.myReservations", path: "/reservations/my" },
      { labelKey: "pages.myFlightPlans", path: "/reservations/flight-plans" },
    ],
  },
  {
    labelKey: "pages.checklists",
    icon: ClipboardCheck,
    path: "/checklists",
  },
  {
    labelKey: "pages.logbook",
    icon: BookOpen,
    path: "/logbook",
  },
  {
    labelKey: "pages.news",
    icon: Newspaper,
    path: "/articles",
  },
  {
    labelKey: "pages.instruction",
    icon: GraduationCap,
    path: "/instruction",
    subItems: [
      { labelKey: "pages.myCourses", path: "/instruction/courses" },
      { labelKey: "pages.myEvaluations", path: "/instruction/evaluation" },
      { labelKey: "pages.eLearning", path: "/instruction/e-learning" },
    ],
  },
  {
    labelKey: "pages.administration",
    icon: Settings,
    path: "/administration",
    subItems: [
      { labelKey: "pages.adminFleet", path: "/administration/planes" },
      { labelKey: "pages.members", path: "/administration/users" },
      { labelKey: "pages.finance", path: "/administration/finance" },
      { labelKey: "pages.safety", path: "/administration/audits" },
      { labelKey: "pages.incidents", path: "/administration/incidents" },
      { labelKey: "pages.articles", path: "/administration/articles" },
      { labelKey: "pages.checklists", path: "/administration/checklists" },
      { labelKey: "pages.eLearning", path: "/administration/e-learning" },
      { labelKey: "pages.settings", path: "/administration/settings" },
      { labelKey: "pages.actionLog", path: "/administration/actions" },
      { labelKey: "pages.loginLog", path: "/administration/logins" },
    ],
  },
]

// A page belongs to a menu entry when it is that entry or one of the pages under it.
const isWithin = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`)

const sectionOf = (pathname: string) => menuItems.find((item) => item.subItems && isWithin(pathname, item.path))?.path

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"

interface SidebarProps {
  isMobileOpen: boolean
  onCloseMobileMenu: () => void
}

export default function AppSidebar({ isMobileOpen, onCloseMobileMenu }: SidebarProps) {
  const { t } = useTranslation("nav")
  const handleLogout = useLogout()
  const pathname = usePathname()
  const mounted = useMounted()
  // One section open at a time, so that the menu fits the height of the screen without scrolling.
  const [openMenu, setOpenMenu] = React.useState<string | undefined>(() => sectionOf(pathname))
  const userEmail = useCurrentUser()
  const { plan } = usePlan()

  const { data } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail || "" },
    skip: !userEmail,
  })

  // The profile can come from the browser cache: wait for the first render to
  // match what the server produced before showing it.
  const profile = mounted ? data?.userByEmail : undefined
  const firstName: string = profile?.first_name ?? ""
  const lastName: string = profile?.last_name ?? ""
  const userName = `${firstName} ${lastName}`.trim()
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const userRole: string | null = profile?.role?.role_name || null
  // Same rule as the route guard: a role sees the pages it may open, nothing else; nor
  // the pages the plan of the club leaves out.
  // A section whose own page is closed to the member leads to its first open page.
  const opens = (path: string) => canOpenPage(userRole, path) && planAllowsPage(plan, path)
  const visibleItems = menuItems
    .map((item) => {
      const subItems = item.subItems?.filter((subItem) => opens(subItem.path))
      const href = opens(item.path) ? item.path : subItems?.[0]?.path
      return { ...item, subItems, href }
    })
    .filter((item): item is typeof item & { href: string } => Boolean(item.href))
  const profilePicture: string | null = profile?.profile_picture || null

  // Arriving in a section opens it. Only on navigation, so the member can still fold it afterwards.
  React.useEffect(() => {
    const current = sectionOf(pathname)
    if (current) setOpenMenu(current)
  }, [pathname])

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileOpen) {
        onCloseMobileMenu()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [isMobileOpen, onCloseMobileMenu])

  React.useEffect(() => {
    if (!isMobileOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseMobileMenu()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isMobileOpen, onCloseMobileMenu])

  React.useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileOpen])

  const toggleMenu = (path: string) => {
    setOpenMenu((prev) => (prev === path ? undefined : path))
  }

  const openCommandPalette = () => {
    onCloseMobileMenu()
    // The layout opens the palette on this shortcut: replaying it keeps a single way in.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))
  }

  const isMac = mounted && /Mac|iPhone|iPad/.test(navigator.userAgent)

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-primary/30 dark:bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={onCloseMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar. Off screen on mobile it is also hidden from the keyboard and screen readers.
          It fits the screen (see below); on a screen too short even for that, such as a phone held
          sideways, the whole menu scrolls as one column, never a box inside it. */}
      <nav
        aria-label={t("sidebar.label")}
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-y-auto overscroll-contain z-50 transition-[transform,visibility] duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "invisible -translate-x-full lg:visible lg:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="px-6 h-16 shrink-0 border-b border-sidebar-border flex items-center justify-between short:h-12 short:pr-3">
          <Link
            href="/dashboard"
            onClick={onCloseMobileMenu}
            aria-label={t("sidebar.home")}
            className={cn("flex items-center justify-center rounded-md", FOCUS_RING)}
          >
            <SkycrewLogo className="text-sidebar-foreground" />
          </Link>
          {/* On a short screen the search is a button next to the logo rather than a full row. */}
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label={t("common:actions.search")}
            title={`${t("common:actions.search")} (${isMac ? "⌘K" : "Ctrl K"})`}
            className={cn(
              "hidden h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground short:flex",
              FOCUS_RING,
            )}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* The member: their profile, and signing out. At the top rather than in a footer, so that
            the whole menu is one column that fits the screen. */}
        <div className="flex shrink-0 items-center gap-1 border-b border-sidebar-border px-3 py-3 short:py-2">
          <Link
            href="/profile"
            onClick={onCloseMobileMenu}
            aria-current={isWithin(pathname, "/profile") ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 transition-colors duration-150 hover:bg-sidebar-accent/60",
              isWithin(pathname, "/profile") && "bg-sidebar-accent",
              FOCUS_RING,
            )}
          >
            <Avatar className="h-10 w-10 border-2 border-sidebar-border short:h-8 short:w-8">
              {profilePicture && <AvatarImage src={`${getBackendBaseUrl()}${profilePicture}`} alt="" />}
              <AvatarFallback className="bg-sidebar-primary font-semibold text-sidebar">
                {initials || <User className="h-4 w-4" aria-hidden="true" />}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="sr-only">{t("pages.profile")} : </span>
              <span className="block truncate text-sm font-medium text-sidebar-foreground">
                {userName || t("account.fallbackName")}
              </span>
              {userRole && <span className="block truncate text-xs text-sidebar-foreground/60">{roleLabel(userRole)}</span>}
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label={t("account.signOut")}
            title={t("account.signOut")}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              FOCUS_RING,
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation. No scrolling of its own: one section open at a time, and tighter rows on
            a short screen, keep it within the height of the screen. */}
        <div className="flex-1 px-3 py-4 short:py-2">
          <button
            type="button"
            onClick={openCommandPalette}
            className={cn(
              "mb-3 flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 short:hidden text-sm text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              FOCUS_RING,
            )}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 text-left">{t("common:actions.search")}</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center rounded border border-sidebar-border bg-sidebar-accent px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/80 md:inline-flex">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          <ul className="space-y-1 short:space-y-0.5">
            {visibleItems.map((item) => {
              const isExact = pathname === item.path
              const inSection = isWithin(pathname, item.path)
              const isOpen = openMenu === item.path
              const subMenuId = `sidebar-submenu-${item.path.slice(1)}`
              const itemName = t(item.labelKey)

              return (
                <li key={item.path}>
                  <div
                    className={cn(
                      "group flex items-center rounded-lg transition-colors duration-150",
                      isExact || (inSection && !item.subItems)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : inSection
                          ? "text-sidebar-accent-foreground hover:bg-sidebar-accent/60"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Link
                      href={item.href}
                      onClick={onCloseMobileMenu}
                      aria-current={isExact ? "page" : undefined}
                      className={cn("flex min-w-0 flex-1 items-center rounded-lg px-2.5 py-2 text-sm font-medium short:py-1 shorter:py-0.5", FOCUS_RING)}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center h-7 w-7 shrink-0 rounded-md mr-3 transition-colors duration-150 short:h-6 short:w-6",
                          inSection ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-transparent",
                        )}
                      >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="truncate">{itemName}</span>
                    </Link>
                    {item.subItems && (
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.path)}
                        aria-expanded={isOpen}
                        aria-controls={subMenuId}
                        aria-label={t(isOpen ? "sidebar.collapseMenu" : "sidebar.expandMenu", { name: itemName })}
                        className={cn(
                          "mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          FOCUS_RING,
                        )}
                      >
                        <ChevronRight
                          className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-90")}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                  </div>

                  {item.subItems && (
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.ul
                          id={subMenuId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-6 pl-3 border-l border-sidebar-border overflow-hidden"
                        >
                          {item.subItems.map((subItem) => {
                            const isSubActive = isWithin(pathname, subItem.path)

                            return (
                              <li key={subItem.path} className="py-0.5 first:pt-1.5 short:py-0 short:first:pt-0.5">
                                <Link
                                  href={subItem.path}
                                  onClick={onCloseMobileMenu}
                                  aria-current={isSubActive ? "page" : undefined}
                                  className={cn(
                                    "block py-1.5 px-3 rounded-md text-sm transition-colors duration-150 short:py-1 shorter:py-[3px]",
                                    FOCUS_RING,
                                    isSubActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                                  )}
                                >
                                  {t(subItem.labelKey)}
                                </Link>
                              </li>
                            )
                          })}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  )}
                </li>
              )
            })}
          </ul>
        </div>

      </nav>
    </>
  )
}
