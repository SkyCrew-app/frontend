"use client"

import { useQuery } from "@apollo/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2 } from "lucide-react"
import { GET_RESERVATIONS } from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { GET_ALL_MAINTENANCES } from "@/graphql/maintenance"
import { GET_ADMINISTRATION } from "@/graphql/settings"
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns"
import { ReactElement, JSXElementConstructor, ReactNode, ReactPortal, AwaitedReactNode, Key } from "react"

interface Aircraft {
  id: string
  hourly_cost: number
  registration_number: string
  consumption: number
}

interface Reservation {
  aircraft: { id: string }
  status: string
  start_time: string
  end_time: string
}

interface Maintenance {
  aircraft: { id: string }
  maintenance_cost: number
  start_date: string
  end_date: string
}

interface OperatingCostsProps {
  period: string
  date: Date
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

  if (loadingAircrafts || loadingReservations || loadingMaintenances || loadingAdmin)
    return <Loader2 className="h-8 w-8 animate-spin" />
  if (errorAircrafts) return <p>Error loading aircrafts: {errorAircrafts.message}</p>
  if (errorReservations) return <p>Error loading reservations: {errorReservations.message}</p>
  if (errorMaintenances) return <p>Error loading maintenances: {errorMaintenances.message}</p>
  if (errorAdmin) return <p>Error loading administration data: {errorAdmin.message}</p>

  const fuelPrice = adminData?.getAdministration?.[0]?.fuelPrice || 1.5

  const startDate = period === "monthly" ? startOfMonth(date) : new Date(date.getFullYear(), 0, 1)
  const endDate = period === "monthly" ? endOfMonth(date) : new Date(date.getFullYear(), 11, 31)

  const calculateCosts = (aircraft: Aircraft) => {
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coûts d'Exploitation {period === "monthly" ? "Mensuels" : "Annuels"}</CardTitle>
          <CardDescription>
            Détail des coûts et revenus par avion pour la période du {startDate.toLocaleDateString()} au{" "}
            {endDate.toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="fuelCost" fill="#8884d8" name="Coût Carburant" />
                <Bar dataKey="maintenanceCost" fill="#82ca9d" name="Coût Maintenance" />
                <Bar dataKey="revenue" fill="#ffc658" name="Revenus" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Résumé des Coûts d'Exploitation</CardTitle>
          <CardDescription>Vue détaillée des coûts et revenus par avion</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Avion</TableHead>
                <TableHead>Coût Carburant</TableHead>
                <TableHead>Coût Maintenance</TableHead>
                <TableHead>Revenus</TableHead>
                <TableHead>Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item: { name: string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined; fuelCost: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; maintenanceCost: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; revenue: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined }; profit: { toLocaleString: () => string | number | bigint | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<AwaitedReactNode> | null | undefined } }, index: Key | null | undefined) => (
                <TableRow key={index}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.fuelCost.toLocaleString()} €</TableCell>
                  <TableCell>{item.maintenanceCost.toLocaleString()} €</TableCell>
                  <TableCell>{item.revenue.toLocaleString()} €</TableCell>
                  <TableCell>{item.profit.toLocaleString()} €</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
