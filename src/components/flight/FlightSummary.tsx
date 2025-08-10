"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plane, Clock, Users, Navigation } from "lucide-react"
import type { Weather } from "@/interfaces/weather"
import { useTranslations } from "next-intl"

interface FlightSummaryProps {
  departure: string
  arrival: string
  date: string
  departureTime: string
  arrivalTime: string
  duration: string
  flightNumber: string
  flightType: string
  distance?: number
  passengers?: number
  departureWeather?: Weather
  arrivalWeather?: Weather
}

export function FlightSummary({
  departure,
  arrival,
  date,
  departureTime,
  arrivalTime,
  duration,
  flightNumber,
  flightType,
  distance,
  passengers,
  departureWeather,
  arrivalWeather,
}: FlightSummaryProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE d MMMM yyyy", { locale: fr })
    } catch (e) {
      return dateString
    }
  }

  const formatTime = (timeString: string) => {
    try {
      return format(new Date(timeString), "HH:mm", { locale: fr })
    } catch (e) {
      return timeString
    }
  }

  const getWeatherIcon = (conditions: string) => {
    const condition = conditions.toLowerCase()
    if (condition.includes("pluie") || condition.includes("rain")) return "🌧️"
    if (condition.includes("nuage") || condition.includes("cloud")) return "☁️"
    if (condition.includes("soleil") || condition.includes("sun") || condition.includes("clear")) return "☀️"
    if (condition.includes("neige") || condition.includes("snow")) return "❄️"
    if (condition.includes("brouillard") || condition.includes("fog")) return "🌫️"
    if (condition.includes("orage") || condition.includes("thunder")) return "⛈️"
    return "🌤️"
  }

  const t = useTranslations("reservation")

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="bg-primary/10 p-3 rounded-full mr-4">
              <Plane className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                {flightNumber}
                <Badge variant="outline" className="ml-2 font-normal">
                  {flightType}
                </Badge>
              </h2>
              <p className="text-muted-foreground">{formatDate(date)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {distance && (
              <div className="flex items-center">
                <Navigation className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>{distance.toFixed(0)} km</span>
              </div>
            )}
            {passengers !== undefined && (
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                <span>
                  {passengers} {t('passenger')} {passengers > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>{duration}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-2">
            <p className="text-sm text-muted-foreground">{t('start')}</p>
            <div className="flex items-center">
              <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full mr-3">
                <span className="text-green-700 dark:text-green-300 font-bold">{departure}</span>
              </div>
              <div>
                <p className="font-semibold">{formatTime(departureTime)}</p>
                {departureWeather && (
                  <div className="flex items-center mt-1">
                    <span className="mr-1">{getWeatherIcon(departureWeather.conditions)}</span>
                    <span className="text-sm">
                      {departureWeather.temperature.toFixed(1)}°C, {departureWeather.conditions}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-1 flex justify-center items-center">
            <div className="relative w-full">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-0 w-3 h-3 rounded-full bg-green-500 transform -translate-y-1/2"></div>
              <div className="absolute top-1/2 right-0 w-3 h-3 rounded-full bg-red-500 transform -translate-y-1/2"></div>
              <Plane className="absolute top-1/2 left-1/2 h-6 w-6 text-primary transform -translate-x-1/2 -translate-y-1/2 rotate-90" />
            </div>
          </div>

          <div className="col-span-1 space-y-2">
            <p className="text-sm text-muted-foreground">{t('arrival')}</p>
            <div className="flex items-center">
              <div className="bg-red-100 dark:bg-red-900 p-2 rounded-full mr-3">
                <span className="text-red-700 dark:text-red-300 font-bold">{arrival}</span>
              </div>
              <div>
                <p className="font-semibold">{formatTime(arrivalTime)}</p>
                {arrivalWeather && (
                  <div className="flex items-center mt-1">
                    <span className="mr-1">{getWeatherIcon(arrivalWeather.conditions)}</span>
                    <span className="text-sm">
                      {arrivalWeather.temperature.toFixed(1)}°C, {arrivalWeather.conditions}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
