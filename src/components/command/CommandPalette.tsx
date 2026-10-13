"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
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
      <CommandInput placeholder="Rechercher une page ou une action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Tableau de bord
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations")}>
            <Calendar className="mr-2 h-4 w-4" />
            Réservations
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations/my")}>
            <CalendarCheck className="mr-2 h-4 w-4" />
            Mes réservations
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations/flight-plans")}>
            <Map className="mr-2 h-4 w-4" />
            Mes plans de vol
          </CommandItem>
          <CommandItem onSelect={() => navigate("/logbook")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Carnet de vol
            <CommandShortcut>⇧⌘L</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/checklists")}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Checklists
          </CommandItem>
          <CommandItem onSelect={() => navigate("/fleet")}>
            <Plane className="mr-2 h-4 w-4" />
            Flotte
          </CommandItem>
          <CommandItem onSelect={() => navigate("/instruction")}>
            <GraduationCap className="mr-2 h-4 w-4" />
            Instruction
          </CommandItem>
          <CommandItem onSelect={() => navigate("/articles")}>
            <Newspaper className="mr-2 h-4 w-4" />
            Articles
          </CommandItem>
          <CommandItem onSelect={() => navigate("/profile")}>
            <User className="mr-2 h-4 w-4" />
            Mon profil
          </CommandItem>
          <CommandItem onSelect={() => navigate("/profile/money_account")}>
            <CreditCard className="mr-2 h-4 w-4" />
            Mon solde
          </CommandItem>
          <CommandItem onSelect={() => navigate("/notifications")}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </CommandItem>
          <CommandItem onSelect={() => navigate("/administration")}>
            <Settings className="mr-2 h-4 w-4" />
            Administration
          </CommandItem>
          <CommandItem onSelect={() => navigate("/administration/incidents")}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Incidents
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions rapides">
          <CommandItem onSelect={() => navigate("/reservations")}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle réservation
            <CommandShortcut>⇧⌘N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Thème">
          <CommandItem onSelect={() => changeTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Thème clair
          </CommandItem>
          <CommandItem onSelect={() => changeTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Thème sombre
          </CommandItem>
          <CommandItem onSelect={() => changeTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            Thème du système
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
