"use client"

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
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
  Download,
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
      <CommandInput placeholder="Rechercher une page ou une action..." />
      <CommandList>
        <CommandEmpty>Aucun r&eacute;sultat trouv&eacute;.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Tableau de bord
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations")}>
            <Calendar className="mr-2 h-4 w-4" />
            R&eacute;servations
          </CommandItem>
          <CommandItem onSelect={() => navigate("/reservations/my")}>
            <CalendarCheck className="mr-2 h-4 w-4" />
            Mes r&eacute;servations
          </CommandItem>
          <CommandItem onSelect={() => navigate("/logbook")}>
            <BookOpen className="mr-2 h-4 w-4" />
            Carnet de vol
            <CommandShortcut>&#8679;&#8984;L</CommandShortcut>
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
          <CommandItem onSelect={() => navigate("/profile")}>
            <User className="mr-2 h-4 w-4" />
            Mon profil
          </CommandItem>
          <CommandItem onSelect={() => navigate("/notifications")}>
            <Bell className="mr-2 h-4 w-4" />
            Notifications
          </CommandItem>
          <CommandItem onSelect={() => navigate("/administration")}>
            <Settings className="mr-2 h-4 w-4" />
            Administration
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions rapides">
          <CommandItem onSelect={() => navigate("/reservations")}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle r&eacute;servation
            <CommandShortcut>&#8679;&#8984;N</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Th&egrave;me">
          <CommandItem onSelect={() => changeTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Mode clair
          </CommandItem>
          <CommandItem onSelect={() => changeTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Mode sombre
          </CommandItem>
          <CommandItem onSelect={() => changeTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            Mode syst&egrave;me
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
