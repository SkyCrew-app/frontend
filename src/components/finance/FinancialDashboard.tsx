"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { motion } from "framer-motion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setMonth } from "date-fns"
import { toast } from "@/components/hooks/use-toast"
import { ExportDialog } from "./ExportDialog"
import FinancialReportComponent from "./FinancialReportComponent"
import ExpensesReport from "./ExpenseReport"
import OperatingCosts from "./OperatingCoast"
import ExpenseForm from "./ExpenseForm"
import BudgetForecast from "./BudgetForecast"
import { GENERATE_FINANCIAL_REPORT_PDF, GENERATE_FINANCIAL_REPORT_EXCEL } from "@/graphql/finance"
import type { GenerateReportResponse, GenerateReportVariables } from "@/interfaces/finance"
import { BarChart3, PieChart, TrendingUp, Calculator, PlusCircle, CalendarIcon } from "lucide-react"

export default function FinancialDashboard() {
  const [period, setPeriod] = useState("monthly")
  const [date, setDate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("financial")
  const [isExporting, setIsExporting] = useState(false)

  const [generatePDF] = useMutation<GenerateReportResponse, GenerateReportVariables>(GENERATE_FINANCIAL_REPORT_PDF)
  const [generateExcel] = useMutation<GenerateReportResponse, GenerateReportVariables>(GENERATE_FINANCIAL_REPORT_EXCEL)

  const handleExport = async (format: "pdf" | "excel", startDate: Date, endDate: Date) => {
    setIsExporting(true)
    try {
      const mutation = format === "pdf" ? generatePDF : generateExcel
      const { data } = await mutation({ variables: { startDate, endDate } })
      const url = data?.generatePdfFinancialReport || data?.generateCsvFinancialReport
      if (url) {
        window.open(url, "_blank")
        toast({
          title: `Export ${format.toUpperCase()} réussi`,
          description: "Le rapport a été généré avec succès",
          variant: "default",
        })
      } else {
        throw new Error("No URL returned")
      }
    } catch (error) {
      console.error(`Erreur lors de l'export ${format}:`, error)
      toast({
        variant: "destructive",
        title: "Erreur d'exportation",
        description: `Erreur lors de la génération du ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="p-6 bg-white shadow-xl rounded-xl border-t-4 border-t-blue-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">Période d'analyse</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Sélectionner la période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="annual">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500">{period === "monthly" ? "Mois" : "Année"}</label>
              <Select
                value={date.getMonth().toString()}
                onValueChange={(value) => setDate(setMonth(new Date(), Number.parseInt(value)))}
              >
                <SelectTrigger className="w-[180px] bg-white">
                  <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Sélectionner le mois" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(2024, i, 1)
                    return (
                      <SelectItem key={i} value={i.toString()}>
                        {date.toLocaleString("fr-FR", { month: "long" })}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <ExportDialog onExport={handleExport} isLoading={isExporting} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-8 bg-muted/30 p-1 rounded-lg">
            <TabsTrigger
              value="financial"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              <span>Rapport Financier</span>
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <PieChart className="mr-2 h-4 w-4" />
              <span>Dépenses</span>
            </TabsTrigger>
            <TabsTrigger
              value="operating"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <Calculator className="mr-2 h-4 w-4" />
              <span>Coûts d'Exploitation</span>
            </TabsTrigger>
            <TabsTrigger
              value="forecast"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Prévisions</span>
            </TabsTrigger>
            <TabsTrigger
              value="add-expense"
              className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Ajouter Dépense</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-2">
            <TabsContent value="financial">
              <FinancialReportComponent />
            </TabsContent>
            <TabsContent value="expenses">
              <ExpensesReport period={period} date={date} />
            </TabsContent>
            <TabsContent value="operating">
              <OperatingCosts period={period} date={date} />
            </TabsContent>
            <TabsContent value="forecast">
              <BudgetForecast />
            </TabsContent>
            <TabsContent value="add-expense">
              <ExpenseForm />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </motion.div>
  )
}
