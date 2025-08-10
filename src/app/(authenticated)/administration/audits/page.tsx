"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery } from "@apollo/client"
import { Shield, Plus, AlertTriangle, CheckCircle, Clock, FileText } from "lucide-react"
import { GET_ALL_AUDITS, GET_AUDIT_ENUMS } from "@/graphql/audit"
import { AuditResultType, type AuditFrequencyType } from "@/interfaces/audit"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuditList } from "@/components/audits/audit-list"
import { AuditFilters } from "@/components/audits/audit-filters"
import { CreateAuditDialog } from "@/components/audits/create-audit-dialog"
import { AuditStatistics } from "@/components/audits/audit-statistics"
import { TemplateManagement } from "@/components/audits/template-management"
import { Skeleton } from "@/components/ui/skeleton"

export default function SecurityAuditsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("all")
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

  const { loading, error, data, refetch } = useQuery(GET_ALL_AUDITS, {
    variables: {
      filter: {
        ...(filters.aircraftId && { aircraftId: filters.aircraftId }),
        ...(filters.auditResult && { auditResult: filters.auditResult }),
        ...(filters.auditFrequency && { auditFrequency: filters.auditFrequency }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(activeTab === "open" && { isClosed: false }),
        ...(activeTab === "closed" && { isClosed: true }),
        ...(activeTab === "nonconform" && { auditResult: AuditResultType.NON_CONFORME }),
        ...(activeTab === "overdue" && { isOverdue: true }),
      },
    },
    fetchPolicy: "network-only",
    skip: activeMainTab !== "audits",
  })

  const handleFilterChange = (newFilters: any) => {
    setFilters({ ...filters, ...newFilters })
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

  const getAuditStatusCounts = () => {
    if (!data?.audits) return { total: 0, open: 0, closed: 0, nonconform: 0, overdue: 0 }

    const now = new Date()
    return data.audits.reduce(
      (acc: any, audit: any) => {
        acc.total++
        if (!audit.is_closed) acc.open++
        if (audit.is_closed) acc.closed++
        if (audit.audit_result === AuditResultType.NON_CONFORME) acc.nonconform++
        if (audit.next_audit_date && new Date(audit.next_audit_date) < now && !audit.is_closed) acc.overdue++
        return acc
      },
      { total: 0, open: 0, closed: 0, nonconform: 0, overdue: 0 },
    )
  }

  const statusCounts = getAuditStatusCounts()

  return (
    <div className="min-h-screen bg-gradient-to-b">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-2">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                Audits de Sécurité
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                Gérez les audits de sécurité de votre flotte d'aéronefs
              </p>
            </div>

            <div className="flex items-center gap-3 self-start mt-3 md:mt-0">
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 text-sm sm:text-base"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline">Nouvel Audit</span>
                <span className="xs:hidden">Ajouter</span>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="audits" value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
            <TabsList className="mb-6 w-full grid grid-cols-2 -p-1">
              <TabsTrigger value="audits" className="text-sm sm:text-base">
                Audits
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-sm sm:text-base">
                Modèles d'audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="audits" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-300">Total des audits</p>
                      <div className="text-2xl font-bold">
                        {loading ? <Skeleton className="h-8 w-16" /> : statusCounts.total}
                      </div>
                    </div>
                    <Shield className="h-8 w-8 text-blue-500" />
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-300">Audits en cours</p>
                      <div className="text-2xl font-bold">
                        {loading ? <Skeleton className="h-8 w-16" /> : statusCounts.open}
                      </div>
                    </div>
                    <Clock className="h-8 w-8 text-amber-500" />
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-300">Audits clôturés</p>
                      <div className="text-2xl font-bold">
                        {loading ? <Skeleton className="h-8 w-16" /> : statusCounts.closed}
                      </div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-300">Audits en retard</p>
                      <div className="text-2xl font-bold">
                        {loading ? <Skeleton className="h-8 w-16" /> : statusCounts.overdue}
                      </div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </CardContent>
                </Card>
              </div>

              <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg sm:text-xl">Liste des audits</CardTitle>
                      <CardDescription className="text-sm">
                        Consultez et gérez tous les audits de sécurité
                      </CardDescription>
                    </div>
                    <AuditFilters
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={clearFilters}
                      enumsData={enumsData}
                      loading={enumsLoading}
                    />
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-5 mb-4">
                      <TabsTrigger value="all" className="text-xs sm:text-sm">
                        Tous
                        <Badge variant="secondary" className="ml-1.5 text-xs">
                          {loading ? "..." : statusCounts.total}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="open" className="text-xs sm:text-sm">
                        En cours
                        <Badge variant="secondary" className="ml-1.5 text-xs">
                          {loading ? "..." : statusCounts.open}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="closed" className="text-xs sm:text-sm">
                        Clôturés
                        <Badge variant="secondary" className="ml-1.5 text-xs">
                          {loading ? "..." : statusCounts.closed}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="nonconform" className="text-xs sm:text-sm">
                        Non conformes
                        <Badge variant="secondary" className="ml-1.5 text-xs">
                          {loading ? "..." : statusCounts.nonconform}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="overdue" className="text-xs sm:text-sm">
                        En retard
                        <Badge variant="secondary" className="ml-1.5 text-xs">
                          {loading ? "..." : statusCounts.overdue}
                        </Badge>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab}>
                      <AuditList
                        loading={loading}
                        error={error}
                        audits={data?.audits || []}
                        searchTerm={filters.searchTerm}
                        onRefetch={refetch}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="mt-6">
                <AuditStatistics />
              </div>
            </TabsContent>

            <TabsContent value="templates">
              <Card className="border-t-4 border-t-primary shadow-md">
                <CardHeader className="pb-2 px-3 sm:px-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Gestion des modèles d'audit
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Créez et gérez des modèles d'audit pour standardiser vos inspections
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <TemplateManagement />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

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
