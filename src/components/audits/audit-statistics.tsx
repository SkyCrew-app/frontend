"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@apollo/client"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  BarChart3,
  PieChartIcon,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Plane,
  Info,
} from "lucide-react"
import { GET_AUDIT_STATISTICS } from "@/graphql/audit"

export function AuditStatistics() {
  const [timeRange, setTimeRange] = useState("6")
  const [activeTab, setActiveTab] = useState("overview")
  const isMobile = useMediaQuery("(max-width: 640px)")

  const dateVariables = useMemo(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - Number.parseInt(timeRange))

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    }
  }, [timeRange])

  const { loading, error, data } = useQuery(GET_AUDIT_STATISTICS, {
    variables: dateVariables,
  })

  const hasData = data?.auditStatistics && data.auditStatistics.totalAudits > 0
  const hasMonthlyData = hasData && data.auditStatistics.auditsByMonth && data.auditStatistics.auditsByMonth.length > 0
  const hasAircraftData =
    hasData && data.auditStatistics.auditsByAircraft && data.auditStatistics.auditsByAircraft.length > 0
  const hasResultsData =
    hasData &&
    (data.auditStatistics.conformCount > 0 ||
      data.auditStatistics.nonConformCount > 0 ||
      data.auditStatistics.conformWithRemarksCount > 0)
  const hasStatusData = hasData && (data.auditStatistics.openAudits > 0 || data.auditStatistics.closedAudits > 0)

  const prepareMonthlyData = () => {
    if (!hasMonthlyData) return []

    return data.auditStatistics.auditsByMonth
      .map((item: any) => ({
        month: `${item.month}/${item.year}`,
        count: item.count,
        monthNum: item.month,
        yearNum: item.year,
      }))
      .sort((a: any, b: any) => {
        if (a.yearNum !== b.yearNum) return a.yearNum - b.yearNum
        return a.monthNum - b.monthNum
      })
      .map((item: any) => ({
        month: format(new Date(item.yearNum, item.monthNum - 1, 1), "MMM yyyy", { locale: fr }),
        count: item.count,
      }))
  }

  const prepareAircraftData = () => {
    if (!hasAircraftData) return []

    return data.auditStatistics.auditsByAircraft.map((item: any) => ({
      name: item.registration,
      value: item.auditCount,
      nonConform: item.nonConformCount,
      color: getRandomColor(item.aircraftId),
    }))
  }

  const prepareResultsData = () => {
    if (!hasResultsData) return []

    return [
      {
        name: "Conforme",
        value: data.auditStatistics.conformCount,
        color: "#22c55e", // vert
      },
      {
        name: "Non conforme",
        value: data.auditStatistics.nonConformCount,
        color: "#ef4444", // rouge
      },
      {
        name: "Avec remarques",
        value: data.auditStatistics.conformWithRemarksCount,
        color: "#f59e0b", // ambre
      },
    ]
  }

  const prepareStatusData = () => {
    if (!hasStatusData) return []

    return [
      {
        name: "Ouverts",
        value: data.auditStatistics.openAudits,
        color: "#3b82f6", // bleu
      },
      {
        name: "Clôturés",
        value: data.auditStatistics.closedAudits,
        color: "#8b5cf6", // violet
      },
    ]
  }

  const getRandomColor = (id: number) => {
    const colors = [
      "#3b82f6", // bleu
      "#ef4444", // rouge
      "#8b5cf6", // violet
      "#f59e0b", // ambre
      "#10b981", // émeraude
      "#ec4899", // rose
      "#6366f1", // indigo
      "#14b8a6", // teal
    ]
    return colors[id % colors.length]
  }

  const monthlyData = prepareMonthlyData()
  const aircraftData = prepareAircraftData()
  const resultsData = prepareResultsData()
  const statusData = prepareStatusData()

  const renderAuditResultIcon = (result: string) => {
    switch (result) {
      case "Conforme":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "Non conforme":
        return <AlertTriangle className="h-3 w-3 text-red-500" />
      case "Avec remarques":
        return <AlertCircle className="h-3 w-3 text-amber-500" />
      case "Ouverts":
        return <AlertCircle className="h-3 w-3 text-blue-500" />
      case "Clôturés":
        return <CheckCircle className="h-3 w-3 text-violet-500" />
      default:
        return null
    }
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-2xs sm:text-xs">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <div className="flex items-center gap-0.5">
              {renderAuditResultIcon(entry.value)}
              <span>{entry.value}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border shadow-sm rounded-md text-2xs sm:text-xs">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-1 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }} />
              <span>
                {entry.name}: {entry.value}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const NoDataMessage = () => (
    <div className="flex flex-col items-center justify-center h-[200px] text-center">
      <Info className="h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm font-medium">Aucune donnée disponible</p>
      <p className="text-xs text-muted-foreground mt-1">Aucune statistique trouvée pour la période sélectionnée.</p>
    </div>
  )

  if (error) {
    return (
      <Card className="border-t-4 border-t-red-500 shadow-sm">
        <CardHeader className="px-3 py-3 sm:px-5 sm:py-4 md:px-6">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-1.5 text-red-500">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            Erreur de chargement des statistiques
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 md:px-6 pb-4">
          <p className="text-sm text-muted-foreground">
            Une erreur s'est produite lors du chargement des statistiques: {error.message}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-t-4 border-t-primary shadow-sm">
      <CardHeader className="px-3 py-3 sm:px-5 sm:py-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Statistiques des audits
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Visualisez les tendances et la distribution des audits de sécurité
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-8 sm:h-9 w-[130px] text-2xs sm:text-xs">
                <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3" className="text-2xs sm:text-xs">
                  3 derniers mois
                </SelectItem>
                <SelectItem value="6" className="text-2xs sm:text-xs">
                  6 derniers mois
                </SelectItem>
                <SelectItem value="12" className="text-2xs sm:text-xs">
                  12 derniers mois
                </SelectItem>
                <SelectItem value="24" className="text-2xs sm:text-xs">
                  24 derniers mois
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 md:px-6 pb-4">
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4 h-8 -p-1">
            <TabsTrigger value="overview" className="text-2xs sm:text-xs flex items-center gap-1">
              <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline">Tendance mensuelle</span>
              <span className="xs:hidden">Mensuel</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="text-2xs sm:text-xs flex items-center gap-1">
              <PieChartIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline">Résultats</span>
              <span className="xs:hidden">Résultats</span>
            </TabsTrigger>
            <TabsTrigger value="aircraft" className="text-2xs sm:text-xs flex items-center gap-1">
              <Plane className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden xs:inline">Par aéronef</span>
              <span className="xs:hidden">Aéronefs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {loading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : !hasMonthlyData ? (
              <NoDataMessage />
            ) : (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: isMobile ? 0 : 10,
                      bottom: 20,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickMargin={8}
                    />
                    <YAxis
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      tickLine={false}
                      axisLine={{ stroke: "#e5e7eb" }}
                      tickMargin={8}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Nombre d'audits" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="results">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Skeleton className="h-[250px] w-full" />
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : !hasResultsData || !hasStatusData ? (
              <NoDataMessage />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-1.5 px-3 sm:px-4">
                    <CardTitle className="text-xs sm:text-sm">Distribution par résultat</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-4">
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={resultsData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={isMobile ? 70 : 80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {resultsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend content={<CustomLegend />} />
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-1.5 px-3 sm:px-4">
                    <CardTitle className="text-xs sm:text-sm">Distribution par statut</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-4 pb-4">
                    <div className="w-full h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={isMobile ? 70 : 80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend content={<CustomLegend />} />
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="aircraft">
            {loading ? (
              <div className="w-full h-[300px] flex items-center justify-center">
                <Skeleton className="h-[250px] w-full" />
              </div>
            ) : !hasAircraftData ? (
              <NoDataMessage />
            ) : (
              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={aircraftData}
                    layout="vertical"
                    margin={{
                      top: 5,
                      right: 30,
                      left: isMobile ? 50 : 70,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      width={isMobile ? 40 : 60}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Total d'audits" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="nonConform" name="Non conformes" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
