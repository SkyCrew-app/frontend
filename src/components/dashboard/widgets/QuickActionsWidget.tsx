"use client"

import { Button } from "@/components/ui/button"
import { CalendarPlus, Map, User } from "lucide-react"
import Link from "next/link"

export default function QuickActionsWidget() {
  return (
    <div className="flex flex-col gap-3">
      <Link href="/reservations">
        <Button variant="outline" className="w-full justify-start gap-2">
          <CalendarPlus className="h-4 w-4 text-blue-500" />
          Nouvelle réservation
        </Button>
      </Link>
      <Link href="/reservations/flight-plans">
        <Button variant="outline" className="w-full justify-start gap-2">
          <Map className="h-4 w-4 text-green-500" />
          Nouveau plan de vol
        </Button>
      </Link>
      <Link href="/profile">
        <Button variant="outline" className="w-full justify-start gap-2">
          <User className="h-4 w-4 text-purple-500" />
          Mon profil
        </Button>
      </Link>
    </div>
  )
}
