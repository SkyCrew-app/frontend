"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CustomDropdown, CustomDropdownItem } from "@/components/ui/custom-dropdown"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const icon = mounted ? (
    theme === "dark" ? (
      <Moon className="h-5 w-5 text-foreground/70" />
    ) : theme === "light" ? (
      <Sun className="h-5 w-5 text-amber-500" />
    ) : (
      <Monitor className="h-5 w-5 text-foreground/70" />
    )
  ) : (
    <div className="h-5 w-5" />
  )

  return (
    <CustomDropdown
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-secondary hover:bg-secondary/80"
          suppressHydrationWarning
        >
          {icon}
          <span className="sr-only">Changer le th&egrave;me</span>
        </Button>
      }
      align="end"
      className="w-44 p-1 rounded-xl"
    >
      <CustomDropdownItem
        onClick={() => setTheme("light")}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary ${theme === "light" ? "bg-secondary" : ""}`}
      >
        <Sun className="h-4 w-4 text-amber-500" />
        <span>Clair</span>
      </CustomDropdownItem>
      <CustomDropdownItem
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary ${theme === "dark" ? "bg-secondary" : ""}`}
      >
        <Moon className="h-4 w-4 text-foreground/70" />
        <span>Sombre</span>
      </CustomDropdownItem>
      <CustomDropdownItem
        onClick={() => setTheme("system")}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary ${theme === "system" ? "bg-secondary" : ""}`}
      >
        <Monitor className="h-4 w-4 text-foreground/70" />
        <span>Syst&egrave;me</span>
      </CustomDropdownItem>
    </CustomDropdown>
  )
}
