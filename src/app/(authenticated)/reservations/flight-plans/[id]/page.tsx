"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "@apollo/client"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/hooks/use-toast"
import { FlightSummary } from "@/components/flight/FlightSummary"
import { AirportInfo } from "@/components/flight/AirportInfo"
import { WaypointInfo } from "@/components/flight/WaypointInfo"
import { FuelBriefing } from "@/components/flight/FuelBriefing"
import { NavLog } from "@/components/flight/NavLog"
import { VerticalProfile } from "@/components/flight/VerticalProfile"
import { OFPExport } from "@/components/flight/OFPExport"
import { FlightPlanActions } from "@/components/flight/flight-action-plans"
import { GET_FLIGHT_PLAN_BY_ID } from "@/graphql/flights"
import { getWeather } from "@/lib/weather"
import {
  AlertTriangle,
  Plane,
  MapPin,
  Clock,
  Route,
  Users,
  Fuel,
  Gauge,
  Navigation,
  TrendingUp,
  FileText,
  Radio,
  Compass,
  ArrowRight,
} from "lucide-react"
import type { Weather } from "@/interfaces/weather"

import "@/styles/print.css"

const MapboxMap = dynamic(() => import("@/components/flight/MapboxMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-muted/50 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <Compass className="h-8 w-8 text-muted-foreground animate-spin" />
        <span className="text-sm text-muted-foreground">Chargement de la carte…</span>
      </div>
    </div>
  ),
})

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null
  if (typeof raw === "object") return raw as T
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ */
/*  Animated Aviation Loader                                           */
/* ------------------------------------------------------------------ */

const LOADING_STEPS = [
  { label: "Chargement du plan de vol…", icon: FileText },
  { label: "Calcul de la route…", icon: Route },
  { label: "Récupération des données météo…", icon: Compass },
  { label: "Préparation de la carte…", icon: MapPin },
]

function FlightPlanLoader() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s))
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto px-6">
        {/* Animated plane on route line */}
        <div className="relative h-20 mb-10">
          {/* Route dashed line */}
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2">
            <div className="h-[2px] bg-border rounded-full" />
            <motion.div
              className="h-[2px] bg-primary rounded-full absolute top-0 left-0"
              initial={{ width: "0%" }}
              animate={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
          </div>

          {/* Departure dot */}
          <div className="absolute top-1/2 left-8 -translate-y-1/2 -translate-x-1/2">
            <div className="w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-500/20" />
          </div>

          {/* Arrival dot */}
          <div className="absolute top-1/2 right-8 -translate-y-1/2 translate-x-1/2">
            <div className="w-3 h-3 rounded-full bg-primary ring-4 ring-primary/20" />
          </div>

          {/* Animated plane */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2"
            initial={{ left: "32px" }}
            animate={{ left: `calc(32px + ${((step + 1) / LOADING_STEPS.length) * (100 - 16)}% - 12px)` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Plane className="h-6 w-6 text-primary rotate-0" />
              </motion.div>
              {/* Trail */}
              <motion.div
                className="absolute top-1/2 right-full -translate-y-1/2 h-[2px] bg-gradient-to-l from-primary/40 to-transparent"
                initial={{ width: 0 }}
                animate={{ width: 40 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        </div>

        {/* Step indicators */}
        <div className="space-y-3">
          {LOADING_STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isDone ? 0.5 : isActive ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ delay: i * 0.15, duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isDone
                      ? "bg-green-500/20 text-green-500"
                      : isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isDone ? (
                    <motion.svg
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <motion.path d="M5 13l4 4L19 7" />
                    </motion.svg>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Icon className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-8 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section wrapper with stagger animation                             */
/* ------------------------------------------------------------------ */

function Section({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card for hero section                                         */
/* ------------------------------------------------------------------ */

function StatChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-background/60 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-semibold truncate">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FlightPlanDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState("overview")
  const [showMap, setShowMap] = useState(false)
  const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number } | undefined>(undefined)
  const { toast } = useToast()
  const [weatherData, setWeatherData] = useState<{
    departure: Weather | null
    arrival: Weather | null
  }>({
    departure: null,
    arrival: null,
  })

  const { loading, error, data } = useQuery(GET_FLIGHT_PLAN_BY_ID, {
    variables: { id: Number.parseInt(id as string) },
  })

  useEffect(() => {
    if (data && data.getFlightById) {
      const timer = setTimeout(() => setShowMap(true), 300)
      return () => clearTimeout(timer)
    }
  }, [data])

  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors du chargement du plan de vol. Veuillez réessayer plus tard.",
        variant: "destructive",
      })
    }
  }, [error, toast])

  useEffect(() => {
    if (data && data.getFlightById) {
      toast({
        title: "Avertissement",
        description:
          "Vérifiez les NOTAMs et les conditions météorologiques avant le départ. Assurez-vous d'avoir tous les documents nécessaires pour votre vol.",
        duration: 10000,
      })

      const fetchWeather = async () => {
        const flight = data.getFlightById
        try {
          const depInfo = JSON.parse(flight.departure_airport_info)
          const arrInfo = JSON.parse(flight.arrival_airport_info)

          const [departureWeather, arrivalWeather] = await Promise.all([
            getWeather(depInfo.lat, depInfo.lon),
            getWeather(arrInfo.lat, arrInfo.lon),
          ])

          setWeatherData({
            departure: departureWeather
              ? {
                  temperature: Number.parseFloat(departureWeather.main.temp),
                  conditions: departureWeather.weather[0].description,
                  icon: departureWeather.weather[0].icon,
                  wind: { speed: departureWeather.wind.speed, direction: departureWeather.wind.deg },
                  humidity: departureWeather.main.humidity,
                  pressure: departureWeather.main.pressure,
                  visibility: departureWeather.visibility,
                }
              : null,
            arrival: arrivalWeather
              ? {
                  temperature: Number.parseFloat(arrivalWeather.main.temp),
                  conditions: arrivalWeather.weather[0].description,
                  icon: arrivalWeather.weather[0].icon,
                  wind: { speed: arrivalWeather.wind.speed, direction: arrivalWeather.wind.deg },
                  humidity: arrivalWeather.main.humidity,
                  pressure: arrivalWeather.main.pressure,
                  visibility: arrivalWeather.visibility,
                }
              : null,
          })
        } catch (err) {
          console.error("Error fetching weather data:", err)
          setWeatherData({ departure: null, arrival: null })
        }
      }

      fetchWeather()
    }
  }, [data, toast])

  /* ---- Parse enriched OFP data ---- */
  const fuelPolicy = useMemo(() => safeJsonParse<any>(data?.getFlightById?.fuel_policy), [data])
  const windSummary = useMemo(() => safeJsonParse<any>(data?.getFlightById?.wind_summary), [data])

  const updateActiveTab = (tab: string) => {
    setActiveTab(tab)
    if (!data?.getFlightById) return

    const flight = data.getFlightById
    const depInfo = JSON.parse(flight.departure_airport_info)
    const arrInfo = JSON.parse(flight.arrival_airport_info)
    const wps = JSON.parse(flight.waypoints)

    switch (tab) {
      case "overview":
        setMapFocus(undefined)
        break
      case "departure":
        setMapFocus({ center: [depInfo.lon, depInfo.lat], zoom: 10 })
        break
      case "arrival":
        setMapFocus({ center: [arrInfo.lon, arrInfo.lat], zoom: 10 })
        break
      case "waypoints":
        if (wps?.length > 0) {
          const lats = wps.map((wp: any) => wp.lat)
          const lons = wps.map((wp: any) => wp.lon)
          setMapFocus({
            center: [
              lons.reduce((a: number, b: number) => a + b, 0) / lons.length,
              lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
            ],
            zoom: 5,
          })
        }
        break
    }
  }

  const handleFocusWaypoint = (index: number) => {
    if (!data?.getFlightById) return
    const wps = JSON.parse(data.getFlightById.waypoints)
    if (wps?.[index]) {
      setMapFocus({ center: [wps[index].lon, wps[index].lat], zoom: 12 })
    }
  }

  /* ================================================================== */
  /*  Loading                                                            */
  /* ================================================================== */
  if (loading) {
    return <FlightPlanLoader />
  }

  /* ================================================================== */
  /*  Error                                                              */
  /* ================================================================== */
  if (error || !data?.getFlightById) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Alert variant="destructive" className="shadow-lg">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg">Plan de vol introuvable</AlertTitle>
            <AlertDescription className="mt-2">
              Une erreur s&apos;est produite lors du chargement du plan de vol. Vérifiez l&apos;identifiant ou réessayez plus tard.
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    )
  }

  /* ================================================================== */
  /*  Parse all data                                                     */
  /* ================================================================== */
  const fp = data.getFlightById
  const departureInfo = JSON.parse(fp.departure_airport_info)
  const arrivalInfo = JSON.parse(fp.arrival_airport_info)
  const waypoints = JSON.parse(fp.waypoints)

  const aircraft = fp.reservation?.aircraft
    ? {
        registration_number: fp.reservation.aircraft.registration_number,
        model: fp.reservation.aircraft.model,
        cruiseSpeed: fp.reservation.aircraft.cruiseSpeed,
        consumption: fp.reservation.aircraft.consumption,
        maxAltitude: fp.reservation.aircraft.maxAltitude,
        total_flight_hours: fp.reservation.aircraft.total_flight_hours,
        image_url: fp.reservation.aircraft.image_url,
      }
    : null

  const pilotName = fp.user ? `${fp.user.first_name} ${fp.user.last_name}` : undefined
  const pilotEmail = fp.user?.email
  const flightNumber = fp.reservation?.id ? `RES-${fp.reservation.id}` : "N/A"

  const departureTimeStr = fp.departure_time
    ? new Date(fp.departure_time).toLocaleTimeString()
    : fp.reservation?.start_time
      ? new Date(fp.reservation.start_time).toLocaleTimeString()
      : "N/A"

  const arrivalTimeStr = fp.arrival_time
    ? new Date(fp.arrival_time).toLocaleTimeString()
    : fp.reservation?.end_time
      ? new Date(fp.reservation.end_time).toLocaleTimeString()
      : "N/A"

  const dateStr = fp.departure_time
    ? new Date(fp.departure_time).toLocaleDateString()
    : fp.reservation?.start_time
      ? new Date(fp.reservation.start_time).toLocaleDateString()
      : "N/A"

  const durationMin = fp.estimated_flight_time ? (fp.estimated_flight_time * 60).toFixed(0) : null

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  return (
    <div className="min-h-screen" data-print-date={new Date().toLocaleString()}>
      {/* ============================================================ */}
      {/*  HERO HEADER                                                  */}
      {/* ============================================================ */}
      <Section delay={0}>
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5 border-b border-border/40">
          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="container mx-auto px-4 py-8 md:py-12 relative">
            {/* Top row: badge + OFP button */}
            <div className="flex items-center justify-between mb-6">
              <Badge variant="outline" className="text-xs font-mono tracking-wider">
                {fp.flight_type} • {flightNumber}
              </Badge>
              <OFPExport
                departureInfo={departureInfo}
                arrivalInfo={arrivalInfo}
                waypoints={waypoints}
                aircraft={aircraft}
                pilotName={pilotName}
                pilotEmail={pilotEmail}
                flightType={fp.flight_type}
                flightNumber={flightNumber}
                departureTime={departureTimeStr}
                arrivalTime={arrivalTimeStr}
                totalDistanceKm={fp.distance_km}
                totalTimeHours={fp.estimated_flight_time}
                fuelPolicy={fuelPolicy}
                windSummary={windSummary}
                performanceProfile={fp.performance_profile}
                weatherConditions={fp.weather_conditions}
                passengers={fp.number_of_passengers}
              />
            </div>

            {/* Route display */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-8">
              {/* Departure */}
              <div className="text-center md:text-right">
                <p className="text-4xl md:text-5xl font-black tracking-tight">{departureInfo.ICAO}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px] truncate">
                  {departureInfo.name || departureInfo.city}
                </p>
              </div>

              {/* Route line */}
              <div className="flex items-center gap-3 px-4">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-500/20 shrink-0" />
                <div className="relative w-24 md:w-40">
                  <div className="h-[2px] bg-border w-full" />
                  <motion.div
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Plane className="h-5 w-5 text-primary" />
                  </motion.div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20 shrink-0" />
              </div>

              {/* Arrival */}
              <div className="text-center md:text-left">
                <p className="text-4xl md:text-5xl font-black tracking-tight">{arrivalInfo.ICAO}</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px] truncate">
                  {arrivalInfo.name || arrivalInfo.city}
                </p>
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
              <StatChip icon={Clock} label="Départ" value={departureTimeStr} />
              <StatChip icon={Clock} label="Arrivée" value={arrivalTimeStr} />
              {durationMin && <StatChip icon={Gauge} label="Durée" value={`${durationMin} min`} />}
              <StatChip icon={Route} label="Distance" value={`${fp.distance_km.toFixed(0)} km`} />
              {fp.number_of_passengers != null && (
                <StatChip icon={Users} label="PAX" value={`${fp.number_of_passengers}`} />
              )}
              {aircraft && <StatChip icon={Plane} label="Avion" value={aircraft.registration_number} />}
              {fp.estimated_fuel_liters && (
                <StatChip icon={Fuel} label="Carburant" value={`${fp.estimated_fuel_liters.toFixed(0)} L`} />
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                 */}
      {/* ============================================================ */}
      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* ---- Flight Summary ---- */}
        <Section delay={0.1}>
          <FlightSummary
            departure={departureInfo.ICAO}
            arrival={arrivalInfo.ICAO}
            date={dateStr}
            departureTime={departureTimeStr}
            arrivalTime={arrivalTimeStr}
            duration={durationMin ? `${durationMin} min` : "N/A"}
            flightNumber={flightNumber}
            flightType={fp.flight_type}
            distance={fp.distance_km}
            passengers={fp.number_of_passengers}
            departureWeather={weatherData.departure ?? undefined}
            arrivalWeather={weatherData.arrival ?? undefined}
          />
        </Section>

        {/* ---- Map + Tabs ---- */}
        <Section delay={0.2}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Tabs panel — 2 cols */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={activeTab} onValueChange={updateActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-11">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm">Aperçu</TabsTrigger>
                  <TabsTrigger value="departure" className="text-xs sm:text-sm">Départ</TabsTrigger>
                  <TabsTrigger value="arrival" className="text-xs sm:text-sm">Arrivée</TabsTrigger>
                  <TabsTrigger value="waypoints" className="text-xs sm:text-sm">Points</TabsTrigger>
                </TabsList>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="overview" className="mt-4">
                      <Card className="border-border/50">
                        <CardContent className="p-5 space-y-5">
                          {/* Flight details */}
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Navigation className="h-4 w-4" /> Détails du vol
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: "Type", value: fp.flight_type },
                                { label: "Distance", value: `${fp.distance_km.toFixed(1)} km` },
                                { label: "Durée", value: durationMin ? `${durationMin} min` : "N/A" },
                                { label: "Passagers", value: fp.number_of_passengers?.toString() || "N/A" },
                                ...(fp.performance_profile
                                  ? [{ label: "Profil perf", value: fp.performance_profile }]
                                  : []),
                                ...(fp.estimated_fuel_liters
                                  ? [{ label: "Carburant", value: `${fp.estimated_fuel_liters.toFixed(1)} L` }]
                                  : []),
                              ].map((item) => (
                                <div key={item.label} className="bg-muted/50 rounded-lg p-2.5">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                                  <p className="text-sm font-semibold font-mono">{item.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Aircraft + Pilot */}
                          <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Plane className="h-4 w-4" /> Avion & Pilote
                            </h3>
                            {aircraft ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                                  <div className="bg-primary/10 rounded-full p-2">
                                    <Plane className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-bold font-mono text-base">{aircraft.registration_number}</p>
                                    <p className="text-xs text-muted-foreground">{aircraft.model}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  {aircraft.cruiseSpeed && (
                                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground uppercase">Vcrz</p>
                                      <p className="text-xs font-semibold font-mono">{aircraft.cruiseSpeed} km/h</p>
                                    </div>
                                  )}
                                  {aircraft.consumption && (
                                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground uppercase">Conso</p>
                                      <p className="text-xs font-semibold font-mono">{aircraft.consumption} L/h</p>
                                    </div>
                                  )}
                                  {aircraft.maxAltitude && (
                                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                                      <p className="text-[10px] text-muted-foreground uppercase">Plafond</p>
                                      <p className="text-xs font-semibold font-mono">{aircraft.maxAltitude} ft</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Aucun avion assigné</p>
                            )}
                            {pilotName && (
                              <div className="mt-3 flex items-center gap-2 text-sm">
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {pilotName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium leading-tight">{pilotName}</p>
                                  <p className="text-xs text-muted-foreground">PIC</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* METAR */}
                          {fp.weather_conditions && (
                            <div>
                              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Radio className="h-4 w-4" /> METAR
                              </h3>
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="font-mono text-xs leading-relaxed break-all">{fp.weather_conditions}</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="departure" className="mt-4">
                      <AirportInfo airportInfo={departureInfo} type="departure" weather={weatherData.departure || undefined} />
                    </TabsContent>

                    <TabsContent value="arrival" className="mt-4">
                      <AirportInfo airportInfo={arrivalInfo} type="arrival" weather={weatherData.arrival ?? undefined} />
                    </TabsContent>

                    <TabsContent value="waypoints" className="mt-4">
                      <WaypointInfo waypoints={waypoints} onFocusWaypoint={handleFocusWaypoint} />
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </Tabs>
            </div>

            {/* Map — 3 cols */}
            <div className="lg:col-span-3">
              <div className="relative h-[500px] lg:h-full lg:min-h-[600px] rounded-xl overflow-hidden shadow-lg border border-border/30 bg-muted/30">
                <AnimatePresence>
                  {showMap && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      <MapboxMap
                        waypoints={waypoints}
                        departure={{
                          icao: departureInfo.ICAO,
                          name: departureInfo.name,
                          lat: Number.parseFloat(departureInfo.lat),
                          lon: Number.parseFloat(departureInfo.lon),
                        }}
                        arrival={{
                          icao: arrivalInfo.ICAO,
                          name: arrivalInfo.name,
                          lat: Number.parseFloat(arrivalInfo.lat),
                          lon: Number.parseFloat(arrivalInfo.lon),
                        }}
                        focusPoint={mapFocus}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Section>

        {/* ---- Vertical Profile ---- */}
        <Section delay={0.3}>
          <VerticalProfile waypoints={waypoints} maxAltitude={aircraft?.maxAltitude} />
        </Section>

        {/* ---- Navigation Log ---- */}
        <Section delay={0.35}>
          <NavLog
            waypoints={waypoints}
            aircraft={aircraft}
            pilotName={pilotName}
            flightType={fp.flight_type}
            totalDistanceKm={fp.distance_km}
            totalTimeHours={fp.estimated_flight_time}
            departureIcao={departureInfo.ICAO}
            arrivalIcao={arrivalInfo.ICAO}
          />
        </Section>

        {/* ---- Fuel Briefing ---- */}
        <Section delay={0.4}>
          <FuelBriefing
            fuelPolicy={fuelPolicy}
            windSummary={windSummary}
            performanceProfile={fp.performance_profile}
            estimatedFuelLiters={fp.estimated_fuel_liters}
            flightType={fp.flight_type}
          />
        </Section>

        {/* ---- Actions ---- */}
        <Section delay={0.45} className="pb-12">
          <FlightPlanActions
            flightPlanId={typeof id === "string" ? id : Array.isArray(id) ? id[0] : 0}
            flightDetails={{
              departure: departureInfo.ICAO,
              arrival: arrivalInfo.ICAO,
              date: dateStr,
            }}
          />
        </Section>
      </div>
    </div>
  )
}
