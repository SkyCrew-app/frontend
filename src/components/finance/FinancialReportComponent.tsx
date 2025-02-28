"use client"

import { useQuery } from "@apollo/client"
import { GET_FINANCIAL_REPORTS } from "@/graphql/finance"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Key, ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode } from "react"

export default function FinancialReportComponent() {
  const { loading, error, data } = useQuery(GET_FINANCIAL_REPORTS)

  if (loading) return <Loader2 className="h-8 w-8 animate-spin" />
  if (error)
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Une erreur s'est produite lors du chargement des rapports financiers : {error.message}
        </AlertDescription>
      </Alert>
    )

  const reports =
    data?.financialReports
      ?.filter((report: { report_date: any }) => report && typeof report.report_date === "string")
      .map((report: { report_date: string | number | Date }) => ({
        ...report,
        report_date: new Date(report.report_date),
      }))
      .sort((a: { report_date: { getTime: () => number } }, b: { report_date: { getTime: () => number } }) => a.report_date.getTime() - b.report_date.getTime()) || []

  if (reports.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Aucun rapport valide</AlertTitle>
        <AlertDescription>
          Aucun rapport financier valide n'a été trouvé. Veuillez vérifier les données ou contacter l'administrateur.
        </AlertDescription>
      </Alert>
    )
  }

  const chartData = reports.map((report: { report_date: { toLocaleDateString: () => any }; total_revenue: any; total_expense: any; net_profit: any }) => ({
    date: report.report_date.toLocaleDateString(),
    revenue: report.total_revenue,
    expense: report.total_expense,
    profit: report.net_profit,
  }))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rapport Financier</CardTitle>
          <CardDescription>Vue d'ensemble des performances financières</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenus" />
                <Line type="monotone" dataKey="expense" stroke="#82ca9d" name="Dépenses" />
                <Line type="monotone" dataKey="profit" stroke="#ffc658" name="Profit Net" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détails des Rapports Financiers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Revenus Totaux</TableHead>
                <TableHead>Dépenses Totales</TableHead>
                <TableHead>Profit Net</TableHead>
                <TableHead>Revenu Moyen par Membre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report: { id: Key | null | undefined; report_date: { toLocaleDateString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; total_revenue: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; total_expense: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; net_profit: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; average_revenue_per_member: { toLocaleString: () => any } }) => (
                <TableRow key={report.id}>
                  <TableCell>{report.report_date.toLocaleDateString()}</TableCell>
                  <TableCell>{report.total_revenue.toLocaleString()} €</TableCell>
                  <TableCell>{report.total_expense.toLocaleString()} €</TableCell>
                  <TableCell>{report.net_profit.toLocaleString()} €</TableCell>
                  <TableCell>{report.average_revenue_per_member?.toLocaleString() || "N/A"} €</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {reports.length > 0 && reports[reports.length - 1].recommendations && (
        <Card>
          <CardHeader>
            <CardTitle>Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{reports[reports.length - 1].recommendations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
