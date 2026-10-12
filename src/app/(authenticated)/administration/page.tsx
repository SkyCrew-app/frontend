"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery } from "@apollo/client"
import {
  Users,
  Plane,
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  Award,
  BarChart3,
  FileText,
  Settings,
  CreditCard,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  GET_ADMIN_DASHBOARD_STATS,
  GET_RECENT_RESERVATIONS,
  GET_RECENT_FLIGHTS,
  GET_RECENT_INCIDENTS,
} from "@/graphql/admin"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ReservationStatus, FlightCategory } from "@/interfaces/enums"
import Link from "next/link"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4 },
  },
}

const COLORS = ["hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))", "hsl(var(--chart-3))"]

export default function AdminHomePage() {
  const [activeTab, setActiveTab] = useState("overview")

  const { loading: statsLoading, error: statsError, data: statsData } = useQuery(GET_ADMIN_DASHBOARD_STATS)

  const {
    loading: reservationsLoading,
    error: reservationsError,
    data: reservationsData,
  } = useQuery(GET_RECENT_RESERVATIONS, {
    variables: { limit: 5 },
  })

  const {
    loading: flightsLoading,
    error: flightsError,
    data: flightsData,
  } = useQuery(GET_RECENT_FLIGHTS, {
    variables: { limit: 5 },
  })

  const {
    loading: incidentsLoading,
    error: incidentsError,
    data: incidentsData,
  } = useQuery(GET_RECENT_INCIDENTS, {
    variables: { limit: 5 },
  })

  const loading = statsLoading || reservationsLoading || flightsLoading || incidentsLoading
  const error = statsError || reservationsError || flightsError || incidentsError

  const stats = statsData?.adminDashboardStats || {
    totalUsers: 0,
    totalAircrafts: 0,
    totalReservations: 0,
    totalFlights: 0,
    totalIncidents: 0,
    availableAircrafts: 0,
    pendingReservations: 0,
    flightHoursThisMonth: 0,
    usersByRole: [],
    reservationsByCategory: [],
  }

  const recentReservations = reservationsData?.recentReservations || []
  const recentFlights = flightsData?.recentFlights || []
  const recentIncidents = incidentsData?.recentIncidents || []

  const roleDistributionData =
    stats.usersByRole?.map((item: any) => ({
      name: item.role_name || "Sans rôle",
      value: item.count,
    })) || []

  const reservationCategoryData =
    stats.reservationsByCategory?.map((item: any) => ({
      name: formatFlightCategory(item.flight_category),
      value: item.count,
    })) || []

  function formatFlightCategory(category: FlightCategory) {
    const categoryMap = {
      [FlightCategory.LOCAL]: "Local",
      [FlightCategory.CROSS_COUNTRY]: "Voyage",
      [FlightCategory.INSTRUCTION]: "Instruction",
      [FlightCategory.TOURISM]: "Tourisme",
      [FlightCategory.TRAINING]: "Entraînement",
      [FlightCategory.MAINTENANCE]: "Maintenance",
      [FlightCategory.PRIVATE]: "Privé",
      [FlightCategory.CORPORATE]: "Entreprise",
    }
    return categoryMap[category] || category
  }

  function getStatusBadge(status: ReservationStatus) {
    switch (status) {
      case ReservationStatus.CONFIRMED:
        return <Badge variant="success">Confirmée</Badge>
      case ReservationStatus.PENDING:
        return (
          <Badge variant="warning">En attente</Badge>
        )
      case ReservationStatus.CANCELLED:
        return <Badge variant="danger">Annulée</Badge>
      default:
        return <Badge variant="outline">Inconnue</Badge>
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    const hours = date.getHours().toString().padStart(2, "0")
    const minutes = date.getMinutes().toString().padStart(2, "0")

    return `${day}/${month}/${year} ${hours}h${minutes}`
  }

  function formatHours(hours: number) {
    const wholeHours = Math.floor(hours)
    const minutes = Math.round((hours - wholeHours) * 60)
    return `${wholeHours}h${minutes.toString().padStart(2, "0")}`
  }

  if (error) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors du chargement du tableau de bord: {error.message}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full">
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord d'administration</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue dans le centre d'administration de SkyCrew. Gérez votre aéroclub en un coup d'œil.
        </p>
      </motion.div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-3 gap-2">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="reservations">Réservations</TabsTrigger>
          <TabsTrigger value="activity">Activité récente</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="border-t-4 border-t-primary overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg font-medium">
                    <Users className="mr-2 h-5 w-5 text-info" />
                    Utilisateurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="text-3xl font-bold">{stats.totalUsers}</div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">Membres de l'aéroclub</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="text-info hover:text-info p-0" asChild>
                    <Link href="/administration">Voir tous les utilisateurs →</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-t-4 border-t-success overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg font-medium">
                    <Plane className="mr-2 h-5 w-5 text-success" />
                    Avions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="text-3xl font-bold">{stats.totalAircrafts}</div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{stats.availableAircrafts} avions disponibles</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="text-success hover:text-success p-0" asChild>
                    <Link href="/settings?tab=aircraft">Gérer la flotte →</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-t-4 border-t-warning overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg font-medium">
                    <Calendar className="mr-2 h-5 w-5 text-warning" />
                    Réservations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="text-3xl font-bold">{stats.totalReservations}</div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.pendingReservations} réservations en attente
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="text-warning hover:text-warning p-0" asChild>
                    <Link href="/reservations">Voir les réservations →</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="border-t-4 border-t-info overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg font-medium">
                    <Clock className="mr-2 h-5 w-5 text-info" />
                    Heures de vol
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {loading ? <Skeleton className="h-10 w-full" /> : formatHours(stats.flightHoursThisMonth)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Heures de vol ce mois-ci</p>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button variant="ghost" size="sm" className="text-info hover:text-info p-0" asChild>
                    <Link href="/flights">Voir les vols →</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-muted/50"
                    asChild
                  >
                    <Link href="/administration">
                      <Users className="h-6 w-6 mb-1 text-info" />
                      <span className="text-sm text-center">Utilisateurs</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-muted/50"
                    asChild
                  >
                    <Link href="/settings?tab=aircraft">
                      <Plane className="h-6 w-6 mb-1 text-success" />
                      <span className="text-sm text-center">Avions</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-muted/50"
                    asChild
                  >
                    <Link href="/admin-e-learning">
                      <Award className="h-6 w-6 mb-1 text-warning" />
                      <span className="text-sm text-center">Formation</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-muted/50"
                    asChild
                  >
                    <Link href="/finance">
                      <CreditCard className="h-6 w-6 mb-1 text-info" />
                      <span className="text-sm text-center">Finances</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-muted/50"
                    asChild
                  >
                    <Link href="/articles-admin">
                      <FileText className="h-6 w-6 mb-1 text-primary" />
                      <span className="text-sm text-center">Articles</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex flex-col items-center justify-center p-4 gap-2 hover:bg-muted/50"
                    asChild
                  >
                    <Link href="/settings">
                      <Settings className="h-6 w-6 mb-1 text-muted-foreground" />
                      <span className="text-sm text-center">Paramètres</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <motion.div variants={containerVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5 text-info" />
                    Répartition des rôles
                  </CardTitle>
                  <CardDescription>Distribution des utilisateurs par rôle</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Skeleton className="h-full w-full rounded-md" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={roleDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="hsl(var(--chart-6))"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {roleDistributionData.map((entry: any, index: any) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} utilisateurs`, "Nombre"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5 text-warning" />
                    Types de réservations
                  </CardTitle>
                  <CardDescription>Répartition des réservations par catégorie</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] mb-8">
                    {loading ? (
                      <div className="flex items-center justify-center h-full">
                        <Skeleton className="h-full w-full rounded-md" />
                      </div>
                    ) : (
                      <ChartContainer
                        config={reservationCategoryData.reduce((acc: any, item: any, index: any) => {
                          acc[item.name] = {
                            label: item.name,
                            color: COLORS[index % COLORS.length],
                          }
                          return acc
                        }, {})}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={reservationCategoryData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" name="Nombre" fill="var(--color-Local)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Réservations récentes</CardTitle>
                <CardDescription>Les dernières réservations effectuées</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                  </div>
                ) : recentReservations.length > 0 ? (
                  <div className="space-y-4">
                    {recentReservations.map((reservation: any) => (
                      <Link key={reservation.id} href={`/reservations/${reservation.id}`} className="block">
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/50 group relative">
                          <div className="flex items-start space-x-4">
                            <div className="bg-warning/15 p-2 rounded-full">
                              <Calendar className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {reservation.user.first_name} {reservation.user.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.aircraft.registration_number} - {reservation.aircraft.model}
                              </div>
                              <div className="text-sm">
                                {formatDate(reservation.start_time)} - {formatDate(reservation.end_time)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 md:mt-0 flex items-center space-x-2">
                            {getStatusBadge(reservation.status)}
                            <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                              {formatFlightCategory(reservation.flight_category)}
                            </Badge>
                            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Aucune réservation récente trouvée</div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/reservations">Voir toutes les réservations</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-info" />
                    Vols récents
                  </CardTitle>
                  <CardDescription>Les derniers vols enregistrés</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                  ) : recentFlights.length > 0 ? (
                    <div className="space-y-4">
                      {recentFlights.map((flight: any) => (
                        <Link key={flight.id} href={`/reservations/flight-plans/${flight.id}`} className="block">
                          <div className="flex items-start space-x-4 p-4 border rounded-lg transition-colors hover:bg-muted/50 group relative">
                            <div className="bg-info/15 p-2 rounded-full">
                              <Plane className="h-5 w-5 text-info" />
                            </div>
                            <div className="flex-grow">
                              <div className="font-medium">
                                {flight.user.first_name} {flight.user.last_name}
                              </div>
                              <div className="text-sm">
                                {flight.origin_icao} → {flight.destination_icao}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatHours(flight.flight_hours)} • {flight.flight_type}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Aucun vol récent trouvé</div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/flights">Voir tous les vols</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
                    Incidents récents
                  </CardTitle>
                  <CardDescription>Les derniers incidents signalés</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                    </div>
                  ) : recentIncidents.length > 0 ? (
                    <div className="space-y-4">
                      {recentIncidents.map((incident: any) => (
                        <Link key={incident.id} href={`/incidents/${incident.id}`} className="block">
                          <div className="flex items-start space-x-4 p-4 border rounded-lg transition-colors hover:bg-muted/50 group relative">
                            <div className="bg-destructive/15 p-2 rounded-full">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                            </div>
                            <div className="flex-grow">
                              <div className="font-medium">
                                {incident.aircraft.registration_number} - {incident.severity_level}
                              </div>
                              <div className="text-sm">{formatDate(incident.incident_date)}</div>
                              <div className="text-sm text-muted-foreground line-clamp-2">{incident.description}</div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Aucun incident récent trouvé</div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/incidents">Voir tous les incidents</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
