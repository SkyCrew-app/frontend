"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
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

interface GenerateReportResponse {
  generatePdfFinancialReport?: string
  generateCsvFinancialReport?: string
}

interface GenerateReportVariables {
  startDate: Date
  endDate: Date
}

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
          title: `Export ${format.toUpperCase()}`,
          description: "Le rapport a été généré avec succès",
        })
      } else {
        throw new Error("No URL returned")
      }
    } catch (error) {
      console.error(`Erreur lors de l'export ${format}:`, error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: `Erreur lors de la génération du ${format.toUpperCase()}: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className="p-6 bg-white shadow-lg rounded-lg">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionner la période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="annual">Annuel</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={date.getMonth().toString()}
            onValueChange={(value) => setDate(setMonth(new Date(), Number.parseInt(value)))}
          >
            <SelectTrigger className="w-[180px]">
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
        <ExportDialog onExport={handleExport} isLoading={isExporting} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
          <TabsTrigger value="financial">Rapport Financier</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="operating">Coûts d'Exploitation</TabsTrigger>
          <TabsTrigger value="forecast">Prévisions</TabsTrigger>
          <TabsTrigger value="add-expense">Ajouter Dépense</TabsTrigger>
        </TabsList>
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
      </Tabs>
    </Card>
  )
}
