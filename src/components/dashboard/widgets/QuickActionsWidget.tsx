"use client"

import Link from "next/link"
import { BookOpen, CalendarPlus, Map, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import WidgetContainer from "../WidgetContainer"

const ACTIONS = [
  { href: "/reservations", labelKey: "quickActions.book", icon: CalendarPlus },
  { href: "/reservations/flight-plans", labelKey: "quickActions.flightPlan", icon: Map },
  { href: "/logbook", labelKey: "quickActions.logbook", icon: BookOpen },
  { href: "/profile", labelKey: "quickActions.profile", icon: User },
]

export default function QuickActionsWidget() {
  const { t } = useTranslation("dashboard")
  return (
    <WidgetContainer title={WIDGET_REGISTRY["quick-actions"].label}>
      <div className="flex flex-col gap-2">
        {ACTIONS.map(({ href, labelKey, icon: Icon }) => (
          <Button key={href} asChild variant="outline" className="w-full justify-start">
            <Link href={href}>
              <Icon className="h-4 w-4 text-muted-foreground" />
              {t(labelKey)}
            </Link>
          </Button>
        ))}
      </div>
    </WidgetContainer>
  )
}
