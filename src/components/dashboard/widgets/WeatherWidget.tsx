"use client"

import { useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Cloud, CloudSun, MapPin, RefreshCw, Sun, Sunrise, Thermometer, Wind } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/hooks/use-toast"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import WidgetContainer, { WidgetEmpty, WidgetError } from "../WidgetContainer"

const API_BASE = "https://api.api-ninjas.com/v1"
const API_HEADERS = { "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU" }

interface WeatherData {
  temp?: number
  feels_like?: number
  humidity?: number
  cloud_pct?: number
  wind_speed?: number
  wind_degrees?: number
  sunrise?: number
  sunset?: number
}

interface WeatherWidgetProps {
  preferredAerodrome: string | null
  /** True when the widget spans two columns: the four figures fit on one line. */
  wide?: boolean
}

const figure = (value: number | undefined, unit: string) =>
  value === undefined || value === null ? "—" : `${Math.round(value)}${unit}`

const sunTime = (timestamp: number | undefined) =>
  timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString("fr-FR", {
        timeZone: "Europe/Paris",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

const skyCondition = (cloudPct: number | undefined): { label: string; icon: LucideIcon } => {
  if (cloudPct === undefined || cloudPct === null) return { label: "—", icon: Cloud }
  if (cloudPct < 30) return { label: "Ensoleillé", icon: Sun }
  if (cloudPct < 70) return { label: "Éclaircies", icon: CloudSun }
  return { label: "Nuageux", icon: Cloud }
}

function Tile({ label, icon: Icon, value, hint }: { label: string; icon: LucideIcon; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {label}
        <Icon className="h-4 w-4" aria-hidden="true" />
      </p>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

export default function WeatherWidget({ preferredAerodrome, wide = false }: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  const { toast } = useToast()

  // `manual` is true when the member pressed the refresh button: only then is
  // the outcome announced by a toast.
  const fetchWeather = useCallback(
    async (manual: boolean) => {
      if (!preferredAerodrome) return
      setIsRefreshing(true)
      try {
        const airportResponse = await fetch(`${API_BASE}/airports?icao=${encodeURIComponent(preferredAerodrome)}`, {
          headers: API_HEADERS,
        })
        if (!airportResponse.ok) throw new Error("Aérodrome introuvable")
        const airport = (await airportResponse.json())?.[0]
        if (!airport?.latitude || !airport?.longitude) throw new Error("Aérodrome introuvable")

        const response = await fetch(`${API_BASE}/weather?lat=${airport.latitude}&lon=${airport.longitude}`, {
          headers: API_HEADERS,
        })
        if (!response.ok) throw new Error("Météo indisponible")
        setWeatherData(await response.json())
        setFailed(false)
        if (manual) {
          toast({ title: "Météo actualisée", description: `Conditions à jour pour ${preferredAerodrome}.` })
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données météo:", error)
        setFailed(true)
        if (manual) {
          toast({
            title: "Actualisation impossible",
            description: "La météo n'a pas pu être récupérée. Réessayez dans un instant.",
            variant: "destructive",
          })
        }
      } finally {
        setIsRefreshing(false)
      }
    },
    [preferredAerodrome, toast],
  )

  useEffect(() => {
    fetchWeather(false)
  }, [fetchWeather])

  const sky = skyCondition(weatherData?.cloud_pct)
  const grid = cn("grid grid-cols-2 gap-3", wide && "sm:grid-cols-4")

  const renderContent = () => {
    if (!preferredAerodrome) {
      return (
        <WidgetEmpty
          icon={MapPin}
          title="Aucun aérodrome préféré"
          description="Indiquez votre aérodrome dans votre profil pour voir sa météo ici."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">Compléter mon profil</Link>
            </Button>
          }
        />
      )
    }
    if (!weatherData && failed) return <WidgetError onRetry={() => fetchWeather(true)} />
    if (!weatherData) {
      return (
        <div className={grid} aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[5.25rem] rounded-lg" />
          ))}
        </div>
      )
    }

    return (
      <div className={grid}>
        <Tile
          label="Température"
          icon={Thermometer}
          value={figure(weatherData.temp, " °C")}
          hint={`Ressenti ${figure(weatherData.feels_like, " °C")}`}
        />
        <Tile
          label="Ciel"
          icon={sky.icon}
          value={sky.label}
          hint={`Nuages ${figure(weatherData.cloud_pct, " %")} · Humidité ${figure(weatherData.humidity, " %")}`}
        />
        <Tile
          label="Vent"
          icon={Wind}
          value={figure(weatherData.wind_speed, " km/h")}
          hint={`Direction ${figure(weatherData.wind_degrees, "°")}`}
        />
        <Tile
          label="Soleil"
          icon={Sunrise}
          value={`${sunTime(weatherData.sunrise)} – ${sunTime(weatherData.sunset)}`}
          hint="Lever – coucher (heure de Paris)"
        />
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["weather"].label}
      description={preferredAerodrome ? `Aérodrome ${preferredAerodrome}` : undefined}
      action={
        preferredAerodrome ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => fetchWeather(true)}
            disabled={isRefreshing}
            aria-label="Actualiser la météo"
            title="Actualiser la météo"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        ) : undefined
      }
    >
      {renderContent()}
    </WidgetContainer>
  )
}
