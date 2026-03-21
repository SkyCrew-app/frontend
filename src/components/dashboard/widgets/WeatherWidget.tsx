"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cloud, Sun, Wind, RefreshCw } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { motion } from "framer-motion"

interface WeatherWidgetProps {
  userEmail: string | null
  preferredAerodrome: string | null
}

export default function WeatherWidget({ userEmail, preferredAerodrome }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<any | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const airportInformation = useCallback(async (aeroport: string) => {
    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/airports?icao=${aeroport}`, {
        headers: {
          "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU",
        },
      })
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des informations de l'aéroport")
      }
      const data = await response.json()
      return data[0] || null
    } catch (error) {
      console.error("Erreur lors de la récupération des informations de l'aéroport:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations de l'aéroport.",
        variant: "destructive",
      })
      return null
    }
  }, [toast])

  const fetchWeather = useCallback(async () => {
    if (!preferredAerodrome) return
    setIsRefreshing(true)
    try {
      const airportInfo = await airportInformation(preferredAerodrome)
      const latitude = airportInfo?.latitude
      const longitude = airportInfo?.longitude
      const response = await fetch(`https://api.api-ninjas.com/v1/weather?lat=${latitude}&lon=${longitude}`, {
        headers: {
          "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU",
        },
      })
      const data = await response.json()
      setWeatherData(data)
      toast({
        title: "Météo mise à jour",
        description: "Les données météorologiques ont été actualisées.",
        variant: "default",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données météo.",
        variant: "destructive",
      })
      console.error("Erreur lors de la récupération des données météo:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [preferredAerodrome, airportInformation, toast])

  useEffect(() => {
    if (preferredAerodrome) {
      fetchWeather()
    }
  }, [preferredAerodrome])

  const getWeatherConditionIcon = () => {
    if (!weatherData) return <Cloud className="h-5 w-5" />
    const cloudPct = weatherData.cloud_pct || 0
    if (cloudPct < 30) return <Sun className="h-5 w-5 text-yellow-500" />
    if (cloudPct < 70) return <Cloud className="h-5 w-5 text-blue-400" />
    return <Cloud className="h-5 w-5 text-gray-500" />
  }

  const getWeatherConditionText = () => {
    if (!weatherData) return "Inconnu"
    const cloudPct = weatherData.cloud_pct || 0
    if (cloudPct < 30) return "Ensoleillé"
    if (cloudPct < 70) return "Partiellement nuageux"
    return "Nuageux"
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchWeather}
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </Button>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-t-4 border-t-primary hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Température</CardTitle>
              <Sun className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{weatherData?.temp || "--"}°C</div>
              <p className="text-xs text-muted-foreground">Ressenti {weatherData?.feels_like || "--"}°C</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-t-4 border-t-indigo-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conditions</CardTitle>
              {getWeatherConditionIcon()}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getWeatherConditionText()}</div>
              <p className="text-xs text-muted-foreground">
                Nuages: {weatherData?.cloud_pct || "--"}% | Humidité: {weatherData?.humidity || "--"}%
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-t-4 border-t-amber-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Soleil</CardTitle>
              <Sun className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold">Lever</div>
                  <div className="text-xl font-bold">
                    {weatherData?.sunrise
                      ? new Date(weatherData.sunrise * 1000).toLocaleTimeString("fr-FR", {
                          timeZone: "Europe/Paris",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-right">Coucher</div>
                  <div className="text-xl font-bold">
                    {weatherData?.sunset
                      ? new Date(weatherData.sunset * 1000).toLocaleTimeString("fr-FR", {
                          timeZone: "Europe/Paris",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-t-4 border-t-accent hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vent</CardTitle>
              <Wind className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{weatherData?.wind_speed || "--"} km/h</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="relative">
                  <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center">
                    <div
                      className="absolute w-3 h-0.5 bg-gray-500 origin-center"
                      style={{
                        transform: `rotate(${weatherData?.wind_degrees || 0}deg)`,
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                </div>
                <span>Direction: {weatherData?.wind_degrees || "--"}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  )
}
