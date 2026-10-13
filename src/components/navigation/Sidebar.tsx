"use client"

import { isAdministrator } from "@/lib/roles"
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
  const [openMenus, setOpenMenus] = React.useState<string[]>(() => {
    const current = sectionOf(pathname)
    return current ? [current] : []
  })
  const userEmail = useCurrentUser()

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
  // The administration section is for administrators only; the API refuses the others anyway.
  const visibleItems = menuItems.filter((item) => item.path !== "/administration" || isAdministrator(profile))
  const profilePicture: string | null = profile?.profile_picture || null

  // Arriving in a section opens it. Only on navigation, so the member can still fold it afterwards.
  React.useEffect(() => {
    const current = sectionOf(pathname)
    if (current) {
      setOpenMenus((prev) => (prev.includes(current) ? prev : [...prev, current]))
    }
  }, [pathname])

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && isMobileOpen) {
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
    setOpenMenus((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]))
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
          className="md:hidden fixed inset-0 bg-primary/30 z-40 backdrop-blur-sm transition-opacity"
          onClick={onCloseMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar. Off screen on mobile it is also hidden from the keyboard and screen readers. */}
      <aside
        role="navigation"
        aria-label={t("sidebar.label")}
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col overflow-hidden z-50 transition-[transform,visibility] duration-300 ease-in-out",
          isMobileOpen ? "translate-x-0" : "invisible -translate-x-full md:visible md:translate-x-0",
        )}
      >
        {/* Logo */}
        <div className="px-6 h-16 shrink-0 border-b border-sidebar-border flex items-center">
          <Link
            href="/dashboard"
            onClick={onCloseMobileMenu}
            aria-label={t("sidebar.home")}
            className={cn("flex items-center justify-center rounded-md", FOCUS_RING)}
          >
            <SkycrewLogo className="text-sidebar-foreground" />
          </Link>
        </div>

        {/* User profile */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-sidebar-border">
              {profilePicture && <AvatarImage src={`${getBackendBaseUrl()}${profilePicture}`} alt="" />}
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
                {initials || <User className="h-4 w-4" aria-hidden="true" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{userName || t("account.fallbackName")}</p>
              {userRole && <p className="text-xs text-sidebar-foreground/60 truncate">{roleLabel(userRole)}</p>}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <button
            type="button"
            onClick={openCommandPalette}
            className={cn(
              "mb-3 flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-2 text-sm text-sidebar-foreground/60 transition-colors duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              FOCUS_RING,
            )}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 text-left">{t("common:actions.search")}</span>
            <kbd className="pointer-events-none hidden h-5 select-none items-center rounded border border-sidebar-border bg-sidebar-accent px-1.5 font-mono text-[10px] font-medium text-sidebar-foreground/60 md:inline-flex">
              {isMac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const isExact = pathname === item.path
              const inSection = isWithin(pathname, item.path)
              const isOpen = openMenus.includes(item.path)
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
                      href={item.path}
                      onClick={onCloseMobileMenu}
                      aria-current={isExact ? "page" : undefined}
                      className={cn("flex min-w-0 flex-1 items-center rounded-lg px-2.5 py-2 text-sm font-medium", FOCUS_RING)}
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center h-7 w-7 shrink-0 rounded-md mr-3 transition-colors duration-150",
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
                              <li key={subItem.path} className="py-0.5 first:pt-1.5">
                                <Link
                                  href={subItem.path}
                                  onClick={onCloseMobileMenu}
                                  aria-current={isSubActive ? "page" : undefined}
                                  className={cn(
                                    "block py-1.5 px-3 rounded-md text-sm transition-colors duration-150",
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

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Link
            href="/profile"
            onClick={onCloseMobileMenu}
            aria-current={isWithin(pathname, "/profile") ? "page" : undefined}
            className={cn(
              "flex items-center px-4 py-2 text-sm rounded-lg transition-colors duration-150",
              FOCUS_RING,
              isWithin(pathname, "/profile")
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <User className="h-4 w-4 mr-3" aria-hidden="true" />
            <span>{t("pages.profile")}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center px-4 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-lg transition-colors duration-150 mt-1",
              FOCUS_RING,
            )}
          >
            <LogOut className="h-4 w-4 mr-3" aria-hidden="true" />
            <span>{t("account.signOut")}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
