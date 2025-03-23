"use client"

import { useQuery } from "@apollo/client"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertTriangle, TrendingUp, TrendingDown, Plane, Wrench, Fuel, DollarSign } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { GET_RESERVATIONS } from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { GET_ALL_MAINTENANCES } from "@/graphql/maintenance"
import { GET_ADMINISTRATION } from "@/graphql/settings"
import { startOfMonth, endOfMonth, isWithinInterval, format } from "date-fns"
import { fr } from "date-fns/locale"
import type { Aircraft, Maintenance, OperatingCostItem, Reservation } from "@/interfaces/finance"

interface OperatingCostsProps {
  period: string
  date: Date
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function OperatingCosts({ period, date }: OperatingCostsProps) {
  const { loading: loadingAircrafts, error: errorAircrafts, data: aircraftsData } = useQuery(GET_AIRCRAFTS)
  const { loading: loadingReservations, error: errorReservations, data: reservationsData } = useQuery(GET_RESERVATIONS)
  const {
    loading: loadingMaintenances,
    error: errorMaintenances,
    data: maintenancesData,
  } = useQuery(GET_ALL_MAINTENANCES)
  const { loading: loadingAdmin, error: errorAdmin, data: adminData } = useQuery(GET_ADMINISTRATION)

  if (loadingAircrafts || loadingReservations || loadingMaintenances || loadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="text-muted-foreground animate-pulse">Calcul des coûts d'exploitation...</p>
        </div>
      </div>
    )
  }

  if (errorAircrafts || errorReservations || errorMaintenances || errorAdmin) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-2xl">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <AlertTitle className="text-lg font-semibold">Erreur de chargement</AlertTitle>
          <AlertDescription>
            {errorAircrafts?.message || errorReservations?.message || errorMaintenances?.message || errorAdmin?.message}
          </AlertDescription>
        </div>
      </Alert>
    )
  }

  const fuelPrice = adminData?.getAdministration?.[0]?.fuelPrice || 1.5

  const startDate = period === "monthly" ? startOfMonth(date) : new Date(date.getFullYear(), 0, 1)
  const endDate = period === "monthly" ? endOfMonth(date) : new Date(date.getFullYear(), 11, 31)

  const calculateCosts = (aircraft: Aircraft): OperatingCostItem => {
    const reservations = reservationsData.reservations.filter(
      (r: Reservation) =>
        r.aircraft.id === aircraft.id &&
        r.status === "CONFIRMED" &&
        isWithinInterval(new Date(r.start_time), { start: startDate, end: endDate }),
    )

    const reservationHours = reservations.reduce((total: number, reservation: Reservation) => {
      const duration = new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()
      return total + duration / (1000 * 60 * 60)
    }, 0)

    const revenue = reservationHours * aircraft.hourly_cost

    const maintenanceCost = maintenancesData.getAllMaintenances
      .filter(
        (m: Maintenance) =>
          m.aircraft.id === aircraft.id && isWithinInterval(new Date(m.start_date), { start: startDate, end: endDate }),
      )
      .reduce((total: number, maintenance: Maintenance) => total + maintenance.maintenance_cost, 0)

    const consumption = aircraft.consumption || 0

    const fuelCost = reservationHours * consumption * fuelPrice

    return {
      name: aircraft.registration_number,
      fuelCost: fuelCost,
      maintenanceCost: maintenanceCost,
      revenue: revenue,
      profit: revenue - (fuelCost + maintenanceCost),
    }
  }

  const data = aircraftsData.getAircrafts.map(calculateCosts)

  // Calculer les totaux
  const totals = data.reduce(
    (acc: any, curr: any) => ({
      fuelCost: acc.fuelCost + curr.fuelCost,
      maintenanceCost: acc.maintenanceCost + curr.maintenanceCost,
      revenue: acc.revenue + curr.revenue,
      profit: acc.profit + curr.profit,
    }),
    { fuelCost: 0, maintenanceCost: 0, revenue: 0, profit: 0 },
  )

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={fadeIn}>
        <Card className="shadow-md border-t-4 border-t-cyan-500">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
            <CardTitle className="text-xl font-bold text-cyan-700">
              Coûts d'Exploitation {period === "monthly" ? "Mensuels" : "Annuels"}
            </CardTitle>
            <CardDescription>
              Détail des coûts et revenus par avion pour la période du {format(startDate, "PPP", { locale: fr })} au{" "}
              {format(endDate, "PPP", { locale: fr })}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={{ stroke: "#e5e7eb" }} />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 12 }}
                    tickLine={{ stroke: "#e5e7eb" }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k€`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} €`, undefined]}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar dataKey="fuelCost" name="Coût Carburant" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="maintenanceCost" name="Coût Maintenance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenus" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeIn}>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plane className="mr-2 h-5 w-5 text-blue-500" />
              Résumé des Coûts d'Exploitation par Avion
            </CardTitle>
            <CardDescription>Vue détaillée des coûts et revenus par avion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Avion</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Fuel className="mr-2 h-4 w-4 text-amber-500" />
                        Coût Carburant
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Wrench className="mr-2 h-4 w-4 text-red-500" />
                        Coût Maintenance
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4 text-blue-500" />
                        Revenus
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        {totals.profit >= 0 ? (
                          <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                        )}
                        Profit
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item: any, index: any) => (
                    <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {item.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.fuelCost.toLocaleString()} €</TableCell>
                      <TableCell>{item.maintenanceCost.toLocaleString()} €</TableCell>
                      <TableCell className="font-medium text-blue-600">{item.revenue.toLocaleString()} €</TableCell>
                      <TableCell
                        className={item.profit >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}
                      >
                        {item.profit.toLocaleString()} €
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/20 font-bold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>{totals.fuelCost.toLocaleString()} €</TableCell>
                    <TableCell>{totals.maintenanceCost.toLocaleString()} €</TableCell>
                    <TableCell className="text-blue-600">{totals.revenue.toLocaleString()} €</TableCell>
                    <TableCell className={totals.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {totals.profit.toLocaleString()} €
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 pt-4">
            {totals.profit < 0 ? (
              <Alert className="w-full bg-red-50 border-red-200 text-red-800">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <AlertTitle className="font-semibold">Alerte de rentabilité</AlertTitle>
                  <AlertDescription>
                    Les coûts d'exploitation dépassent les revenus de {Math.abs(totals.profit).toLocaleString()} €. Une
                    révision de la tarification ou des coûts est recommandée.
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <Alert className="w-full bg-green-50 border-green-200 text-green-800">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <AlertTitle className="font-semibold">Bonne rentabilité</AlertTitle>
                  <AlertDescription>
                    Les revenus dépassent les coûts d'exploitation de {totals.profit.toLocaleString()} €. La flotte est
                    rentable sur cette période.
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  )
}
