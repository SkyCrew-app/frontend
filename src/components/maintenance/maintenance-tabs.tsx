"use client"

import type React from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"

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
  const t = useTranslations('fleet');
  return (
    <Tabs defaultValue="all" value={activeTab} onValueChange={onTabChange} className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="all" className="px-4">
            {t('allMaintenances')}
            <Badge variant="secondary" className="ml-2">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="px-4">
            {t('plannedMaintenances')}
            <Badge variant="secondary" className="ml-2">
              {counts.upcoming}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="inProgress" className="px-4">
            {t('inProgress')}
            <Badge variant="secondary" className="ml-2">
              {counts.inProgress}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="px-4">
            {t('completedMaintenances')}
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

