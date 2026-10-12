"use client"

import { useTheme } from "next-themes"
import { Check, Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMounted } from "@/components/hooks/useMounted"

const THEMES = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  // The chosen theme is only known in the browser.
  const mounted = useMounted()

  const CurrentIcon = THEMES.find((t) => t.value === theme)?.icon ?? Monitor

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Changer le thème"
          title="Changer le thème"
        >
          {mounted ? <CurrentIcon className="h-5 w-5" /> : <span className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)} className="cursor-pointer">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {label}
            {mounted && theme === value && <Check className="ml-auto h-4 w-4" aria-label="Thème actuel" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
