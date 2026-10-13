"use client"

import { useTheme } from "next-themes"
import { Check, Sun, Moon, Monitor } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMounted } from "@/components/hooks/useMounted"

const THEMES = [
  { value: "light", labelKey: "theme.light", icon: Sun },
  { value: "dark", labelKey: "theme.dark", icon: Moon },
  { value: "system", labelKey: "theme.system", icon: Monitor },
]

export default function ThemeToggle() {
  const { t } = useTranslation("common")
  const { theme, setTheme } = useTheme()
  // The chosen theme is only known in the browser.
  const mounted = useMounted()

  const CurrentIcon = THEMES.find((option) => option.value === theme)?.icon ?? Monitor

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("theme.change")}
          title={t("theme.change")}
        >
          {mounted ? <CurrentIcon className="h-5 w-5" /> : <span className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {THEMES.map(({ value, labelKey, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)} className="cursor-pointer">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {t(labelKey)}
            {mounted && theme === value && <Check className="ml-auto h-4 w-4" aria-label={t("theme.current")} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
