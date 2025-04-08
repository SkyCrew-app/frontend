export interface GenerateReportResponse {
  generatePdfFinancialReport?: string
  generateCsvFinancialReport?: string
}

export interface GenerateReportVariables {
  startDate: Date
  endDate: Date
}

export interface BudgetForecast {
  revenueForecast: number
  expenseForecast: number
  netForecast: number
}

export interface BudgetForecastResponse {
  generateBudgetForecast: BudgetForecast
}

export interface ChartDataItem {
  month: string
  revenus: number
  depenses: number
  resultatNet: number
}

export interface Expense {
  category: string
  amount: number
}

export interface ExpenseChartDataItem {
  name: string
  value: number
  total: number
}

export interface Aircraft {
  id: string
  hourly_cost: number
  registration_number: string
  consumption: number
}

export interface Reservation {
  aircraft: { id: string }
  status: string
  start_time: string
  end_time: string
}

export interface Maintenance {
  aircraft: { id: string }
  maintenance_cost: number
  start_date: string
  end_date: string
}

export interface OperatingCostItem {
  name: string
  fuelCost: number
  maintenanceCost: number
  revenue: number
  profit: number
}
