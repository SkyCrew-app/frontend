"use client"

import type React from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface MaintenanceTabsProps {
  activeTab: string
  onTabChange: (value: string) => void
  counts: {
    all: number
    upcoming: number
    inProgress: number
    completed: number
  }
  children: React.ReactNode
}

export function MaintenanceTabs({ activeTab, onTabChange, counts, children }: MaintenanceTabsProps) {
  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange} className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="all" className="px-4">
            Toutes
            <Badge variant="secondary" className="ml-2">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="px-4">
            Planifiées
            <Badge variant="secondary" className="ml-2">
              {counts.upcoming}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inProgress" className="px-4">
            En cours
            <Badge variant="secondary" className="ml-2">
              {counts.inProgress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="px-4">
            Terminées
            <Badge variant="secondary" className="ml-2">
              {counts.completed}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </div>
      {children}
    </Tabs>
  )
}

