"use client"

import Link from "next/link"
import { BookOpen, CalendarPlus, Map, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import WidgetContainer from "../WidgetContainer"

const ACTIONS = [
  { href: "/reservations", label: "Réserver un avion", icon: CalendarPlus },
  { href: "/reservations/flight-plans", label: "Préparer un plan de vol", icon: Map },
  { href: "/logbook", label: "Ouvrir mon carnet de vol", icon: BookOpen },
  { href: "/profile", label: "Voir mon profil", icon: User },
]

export default function QuickActionsWidget() {
  return (
    <WidgetContainer title={WIDGET_REGISTRY["quick-actions"].label}>
      <div className="flex flex-col gap-2">
        {ACTIONS.map(({ href, label, icon: Icon }) => (
          <Button key={href} asChild variant="outline" className="w-full justify-start">
            <Link href={href}>
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </Link>
          </Button>
        ))}
      </div>
    </WidgetContainer>
  )
}
