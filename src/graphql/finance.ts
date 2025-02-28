import { gql } from '@apollo/client';

export const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(createExpenseInput: $input) {
      id
      expense_date
      amount
      category
      sub_category
      description
    }
  }
`

export const GET_EXPENSES = gql`
  query GetExpenses($startDate: DateTime!, $endDate: DateTime!) {
    expenseByPeriod(startDate: $startDate, endDate: $endDate) {
      id
      expense_date
      amount
      category
      sub_category
      description
    }
  }
`

export const GET_FINANCIAL_REPORTS = gql`
  query GetFinancialReports {
    financialReports {
      id
      report_date
      total_revenue
      total_expense
      net_profit
      recommendations
      average_revenue_per_member
    }
  }
`

export const GET_BUDGET_FORECAST = gql`
  query GenerateBudgetForecast($startDate: DateTime!, $endDate: DateTime!) {
    generateBudgetForecast(startDate: $startDate, endDate: $endDate) {
      revenueForecast
      expenseForecast
      netForecast
    }
  }
`

export const GENERATE_FINANCIAL_REPORT_PDF = gql`
  mutation GeneratePdfFinancialReport($startDate: DateTime!, $endDate: DateTime!) {
    generatePdfFinancialReport(startDate: $startDate, endDate: $endDate)
  }
`

export const GENERATE_FINANCIAL_REPORT_EXCEL = gql`
  mutation GenerateCsvFinancialReport($startDate: DateTime!, $endDate: DateTime!) {
    generateCsvFinancialReport(startDate: $startDate, endDate: $endDate)
  }
`