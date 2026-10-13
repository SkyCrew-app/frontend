"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import {
  AlertTriangle,
  LayoutDashboard,
  Plane,
  Calendar,
  CalendarCheck,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Settings,
  User,
  Bell,
  Sun,
  Moon,
  Monitor,
  Plus,
  Map,
  Newspaper,
  CreditCard,
} from "lucide-react"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation("nav")
  const router = useRouter()
  const { setTheme } = useTheme()

  const navigate = (path: string) => {
    onOpenChange(false)
    router.push(path)
  }

  const changeTheme = (theme: string) => {
    setTheme(theme)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("command.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("command.empty")}</CommandEmpty>

        <CommandGroup heading={t("command.navigation")}>
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            {t("pages.dashboard")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations")}>
            <Calendar className="mr-2 h-4 w-4" />
            {t("pages.reservations")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations/my")}>
            <CalendarCheck className="mr-2 h-4 w-4" />
            {t("pages.myReservations")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations/flight-plans")}>
            <Map className="mr-2 h-4 w-4" />
            {t("pages.myFlightPlans")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/logbook")}>
            <BookOpen className="mr-2 h-4 w-4" />
            {t("pages.logbook")}
            <CommandShortcut>⇧⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/checklists")}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            {t("pages.checklists")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/fleet")}>
            <Plane className="mr-2 h-4 w-4" />
            {t("pages.fleet")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/instruction")}>
            <GraduationCap className="mr-2 h-4 w-4" />
            {t("pages.instruction")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/articles")}>
            <Newspaper className="mr-2 h-4 w-4" />
            {t("pages.articles")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/profile")}>
            <User className="mr-2 h-4 w-4" />
            {t("pages.profile")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/profile/money_account")}>
            <CreditCard className="mr-2 h-4 w-4" />
            {t("pages.balance")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/notifications")}>
            <Bell className="mr-2 h-4 w-4" />
            {t("pages.notifications")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/administration")}>
            <Settings className="mr-2 h-4 w-4" />
            {t("pages.administration")}
          </CommandItem>
          <CommandItem onSelect={() => navigate("/administration/incidents")}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            {t("pages.incidents")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.quickActions")}>
          <CommandItem onSelect={() => navigate("/reservations")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("command.newReservation")}
            <CommandShortcut>⇧⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("command.theme")}>
          <CommandItem onSelect={() => changeTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            {t("command.themeLight")}
          </CommandItem>
          <CommandItem onSelect={() => changeTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            {t("command.themeDark")}
          </CommandItem>
          <CommandItem onSelect={() => changeTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            {t("command.themeSystem")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
