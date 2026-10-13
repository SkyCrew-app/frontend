"use client"

import { Check, Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { chooseLanguage, currentLanguage, LANGUAGES } from "@/lib/i18n"

export default function LanguageToggle() {
  const { t } = useTranslation("common")
  const active = currentLanguage()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("language.change")}
          title={t("language.change")}
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGUAGES.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            lang={code}
            onSelect={() => {
              if (code !== active) void chooseLanguage(code)
            }}
            className="cursor-pointer"
          >
            {label}
            {code === active && <Check className="ml-auto h-4 w-4" aria-label={t("language.current")} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
