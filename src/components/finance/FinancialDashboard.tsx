"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/layout/PageHeader"
import { toast } from "@/components/hooks/use-toast"
import { ExportDialog } from "./ExportDialog"
import FinancialReportComponent from "./FinancialReportComponent"
import ExpensesReport from "./ExpenseReport"
import OperatingCosts from "./OperatingCoast"
import ExpenseForm from "./ExpenseForm"
import BudgetForecast from "./BudgetForecast"
import CashReceived from "./CashReceived"
import { GENERATE_FINANCIAL_REPORT_PDF, GENERATE_FINANCIAL_REPORT_EXCEL } from "@/graphql/finance"
import type { GenerateReportResponse, GenerateReportVariables } from "@/interfaces/finance"
import { currentLocale } from "@/lib/i18n"

// Built when shown, so that the month names follow the language.
const monthOptions = () =>
  Array.from({ length: 12 }, (_, index) => {
    const name = new Date(2024, index, 1).toLocaleString(currentLocale(), { month: "long" })
    return { value: index.toString(), label: name.charAt(0).toUpperCase() + name.slice(1) }
  })

const YEARS_SHOWN = 5

export default function FinancialDashboard() {
  const { t } = useTranslation("administration")
  const [period, setPeriod] = useState("monthly")
  const [date, setDate] = useState<Date>(() => new Date())
  const [activeTab, setActiveTab] = useState("financial")
  const [isExporting, setIsExporting] = useState(false)
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)

  const [generatePDF] = useMutation<GenerateReportResponse, GenerateReportVariables>(GENERATE_FINANCIAL_REPORT_PDF)
  const [generateExcel] = useMutation<GenerateReportResponse, GenerateReportVariables>(GENERATE_FINANCIAL_REPORT_EXCEL)

  const handleExport = async (format: "pdf" | "excel", startDate: Date, endDate: Date) => {
    setIsExporting(true)
    try {
      const mutation = format === "pdf" ? generatePDF : generateExcel
      const { data } = await mutation({ variables: { startDate, endDate } })
      const url = data?.generatePdfFinancialReport || data?.generateCsvFinancialReport
      if (!url) throw new Error("No URL returned")

      window.open(url, "_blank")
      toast({
        title: t("finance.export.toast.done.title"),
        description: t("finance.export.toast.done.description"),
      })
      return true
    } catch (error) {
      console.error("Financial report export failed:", error)
      toast({
        variant: "destructive",
        title: t("finance.export.toast.failed.title"),
        description: t("finance.export.toast.failed.description"),
      })
      return false
    } finally {
      setIsExporting(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: YEARS_SHOWN }, (_, index) => currentYear - index)

  // Shown above the tabs whose figures depend on a period.
  const periodFilter = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="sm:w-40" aria-label={t("finance.period.type")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">{t("finance.period.monthly")}</SelectItem>
          <SelectItem value="annual">{t("finance.period.annual")}</SelectItem>
        </SelectContent>
      </Select>

      {period === "monthly" && (
        <Select
          value={date.getMonth().toString()}
          onValueChange={(value) => setDate(new Date(date.getFullYear(), Number.parseInt(value, 10), 1))}
        >
          <SelectTrigger className="sm:w-40" aria-label={t("finance.period.month")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions().map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={date.getFullYear().toString()}
        onValueChange={(value) => setDate(new Date(Number.parseInt(value, 10), date.getMonth(), 1))}
      >
        <SelectTrigger className="sm:w-28" aria-label={t("finance.period.year")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("finance.title")}
        description={t("finance.description")}
        className="mb-0"
        actions={
          <>
            <ExportDialog onExport={handleExport} isLoading={isExporting} />
            <Button onClick={() => setIsExpenseDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              {t("finance.expenseForm.title")}
            </Button>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="financial">{t("finance.tabs.summary")}</TabsTrigger>
          <TabsTrigger value="expenses">{t("finance.tabs.expenses")}</TabsTrigger>
          <TabsTrigger value="operating">{t("finance.tabs.operating")}</TabsTrigger>
          <TabsTrigger value="forecast">{t("finance.tabs.forecast")}</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-6 space-y-6">
          <FinancialReportComponent />
          {/* Top-ups are money received, shown apart from the revenue of the flights charged. */}
          <section className="space-y-4" aria-labelledby="finance-cash-title">
            <h2 id="finance-cash-title" className="text-lg font-semibold">
              {t("finance.cash.title")}
            </h2>
            {periodFilter}
            <CashReceived period={period} date={date} />
          </section>
        </TabsContent>
        <TabsContent value="expenses" className="mt-6 space-y-6">
          {periodFilter}
          <ExpensesReport period={period} date={date} />
        </TabsContent>
        <TabsContent value="operating" className="mt-6 space-y-6">
          {periodFilter}
          <OperatingCosts period={period} date={date} />
        </TabsContent>
        <TabsContent value="forecast" className="mt-6">
          <BudgetForecast />
        </TabsContent>
      </Tabs>

      <ExpenseForm
        open={isExpenseDialogOpen}
        onSuccess={() => setIsExpenseDialogOpen(false)}
        onCancel={() => setIsExpenseDialogOpen(false)}
      />
    </div>
  )
}
