"use client"

import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import Navbar from "./navigation/Navbar"
import Sidebar from "./navigation/Sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

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
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobileMenu={handleCloseMobileMenu} />
        <div className="flex flex-col flex-1 h-screen overflow-hidden">
          <Navbar onToggleMobileMenu={handleToggleMobileMenu} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 md:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
