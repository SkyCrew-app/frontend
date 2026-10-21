"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { AlertTriangle, CheckCircle, ClipboardCheck, Clock, Plus, Search } from "lucide-react"
import { GET_ALL_AUDITS, GET_AUDIT_ENUMS } from "@/graphql/audit"
import type { AuditFrequencyType, AuditResultType } from "@/interfaces/audit"
import { countAuditsByStatus, filterAudits, type AuditStatusTab } from "@/lib/audit"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuditList } from "@/components/audits/audit-list"
import { AuditFilters } from "@/components/audits/audit-filters"
import { CreateAuditDialog } from "@/components/audits/create-audit-dialog"
import { AuditStatistics } from "@/components/audits/audit-statistics"
import { TemplateManagement } from "@/components/audits/template-management"

const STATUS_TABS: { value: AuditStatusTab; count: "total" | "open" | "closed" | "nonconform" | "overdue" }[] = [
  { value: "all", count: "total" },
  { value: "open", count: "open" },
  { value: "closed", count: "closed" },
  { value: "nonconform", count: "nonconform" },
  { value: "overdue", count: "overdue" },
]

export default function SecurityAuditsPage() {
  const { t } = useTranslation("administration")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AuditStatusTab>("all")
  const [activeMainTab, setActiveMainTab] = useState<string>("audits")
  const [filters, setFilters] = useState({
    aircraftId: null as number | null,
    auditResult: null as AuditResultType | null,
    auditFrequency: null as AuditFrequencyType | null,
    startDate: null as Date | null,
    endDate: null as Date | null,
    searchTerm: "",
  })

  const { loading: enumsLoading, data: enumsData } = useQuery(GET_AUDIT_ENUMS)

  // The status tab is applied on the returned list, so the counters of every tab stay right.
  const { loading, error, data, refetch } = useQuery(GET_ALL_AUDITS, {
    variables: {
      filter: {
        ...(filters.aircraftId && { aircraftId: filters.aircraftId }),
        ...(filters.auditResult && { auditResult: filters.auditResult }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      },
    },
    fetchPolicy: "network-only",
    skip: activeMainTab !== "audits",
  })

  // AuditFilterInput has no frequency nor overdue criteria: applied on the returned list.
  const filteredAudits = filterAudits<any>(data?.audits || [], { auditFrequency: filters.auditFrequency })
  const visibleAudits = filterAudits<any>(filteredAudits, { tab: activeTab })
  const statusCounts = countAuditsByStatus(filteredAudits)

  const handleFilterChange = (newFilters: any) => {
    setFilters((current) => ({ ...current, ...newFilters }))
  }

  const clearFilters = () => {
    setFilters({
      aircraftId: null,
      auditResult: null,
      auditFrequency: null,
      startDate: null,
      endDate: null,
      searchTerm: "",
    })
  }

  const hasActiveFilters = Boolean(
    filters.aircraftId ||
      filters.auditResult ||
      filters.auditFrequency ||
      filters.startDate ||
      filters.endDate ||
      filters.searchTerm ||
      activeTab !== "all",
  )

  // First load only: a refetch keeps the figures on screen.
  const countsLoading = loading && !data
  const count = (value: number) => (countsLoading ? <Skeleton className="h-8 w-10" /> : value)

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("audits.title")}
        description={t("audits.description")}
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("audits.newAudit")}
          </Button>
        }
      />

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="audits">{t("audits.tabs.audits")}</TabsTrigger>
          <TabsTrigger value="templates">{t("audits.tabs.templates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="audits" className="mt-0 space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label={t("audits.stats.total")}
              value={count(statusCounts.total)}
              icon={ClipboardCheck}
              tone="info"
            />
            <StatCard label={t("audits.stats.open")} value={count(statusCounts.open)} icon={Clock} tone="warning" />
            <StatCard
              label={t("audits.stats.closed")}
              value={count(statusCounts.closed)}
              icon={CheckCircle}
              tone="success"
            />
            <StatCard
              label={t("audits.stats.overdue")}
              value={count(statusCounts.overdue)}
              icon={AlertTriangle}
              tone="danger"
            />
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("audits.searchPlaceholder")}
                  className="pl-9"
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                  aria-label={t("audits.search")}
                />
              </div>
              <AuditFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={clearFilters}
                enumsData={enumsData}
                loading={enumsLoading}
              />
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuditStatusTab)}>
              {/* The tabs wrap on narrow screens: nothing scrolls sideways. */}
              <TabsList className="h-auto flex-wrap">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                    {t(`audits.statusTabs.${tab.value}`)}
                    {!countsLoading && (
                      <span className="text-xs tabular-nums text-muted-foreground">{statusCounts[tab.count]}</span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {/* One list for every tab: the selected tab filters it, and the list is its panel. */}
              <TabsContent value={activeTab} className="mt-4">
                <AuditList
                  loading={loading}
                  error={error}
                  audits={visibleAudits}
                  searchTerm={filters.searchTerm}
                  hasActiveFilters={hasActiveFilters}
                  onCreate={() => setIsCreateModalOpen(true)}
                  onRefetch={refetch}
                />
              </TabsContent>
            </Tabs>
          </div>

          <AuditStatistics />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplateManagement />
        </TabsContent>
      </Tabs>

      <CreateAuditDialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch()
          setIsCreateModalOpen(false)
        }}
      />
    </div>
  )
}
