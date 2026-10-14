"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import Navbar from "./navigation/Navbar"
import Sidebar from "./navigation/Sidebar"
import Breadcrumbs from "./navigation/Breadcrumbs"
import { SidebarProvider } from "@/components/ui/sidebar"
import CommandPalette from "@/components/command/CommandPalette"
import OfflineIndicator from "@/components/ui/OfflineIndicator"
import DemoBanner from "@/components/ui/DemoBanner"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useMounted } from "@/components/hooks/useMounted"
import StoredLanguageSync from "@/components/providers/StoredLanguageSync"
import { PlanGate } from "@/components/plan/PlanGate"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { t } = useTranslation("nav")
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  // Pages read data kept in the browser: wait to be there before showing them,
  // otherwise the server render and the browser render differ.
  const mounted = useMounted()
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useKeyboardShortcuts()

  const handleToggleMobileMenu = () => {
    setIsMobileOpen((prev) => !prev)
  }

  const handleCloseMobileMenu = () => {
    setIsMobileOpen(false)
  }

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobileOpen])

  return (
    <SidebarProvider>
      <StoredLanguageSync />
      <CommandPalette open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobileMenu={handleCloseMobileMenu} />
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <DemoBanner />
          <Navbar onToggleMobileMenu={handleToggleMobileMenu} />
          <OfflineIndicator />
          <main id="main-content" role="main" aria-label={t("layout.mainContent")} className="flex-1 overflow-y-auto overflow-x-hidden" tabIndex={-1}>
            <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6 lg:p-8">
              <Breadcrumbs />
              {mounted ? <PlanGate>{children}</PlanGate> : null}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
