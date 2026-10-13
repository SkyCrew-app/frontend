"use client"

import { useState, useEffect, useCallback } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { Cloud, CloudOff, CloudSun, MapPin, RefreshCw, Sun, Sunrise, Thermometer, Wind } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useApolloClient } from "@apollo/client"
import { cn } from "@/lib/utils"
import i18n, { currentLocale } from "@/lib/i18n"
import { WEATHER_AT } from "@/graphql/aviation"
import { findAerodromeByCode } from "@/lib/aerodromes"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/hooks/use-toast"
import { WIDGET_REGISTRY } from "@/interfaces/dashboard"
import WidgetContainer, { WidgetEmpty, WidgetError } from "../WidgetContainer"

interface WeatherData {
  temperature?: number | null
  feelsLike?: number | null
  humidity?: number | null
  cloudCover?: number | null
  /** Kilometres per hour: the API converts the provider's m/s. */
  windSpeedKmh?: number | null
  windDegrees?: number | null
  sunrise?: number | null
  sunset?: number | null
}

interface WeatherWidgetProps {
  preferredAerodrome: string | null
  /** True when the widget spans two columns: the four figures fit on one line. */
  wide?: boolean
}

const figure = (value: number | null | undefined, unit: string) =>
  value === undefined || value === null ? "—" : `${Math.round(value)}${unit}`

// The zone the browser can format with, or null: an unknown name makes
// `toLocaleTimeString` throw.
const usableTimeZone = (timeZone: string | null | undefined) => {
  if (!timeZone) return null
  try {
    new Intl.DateTimeFormat(undefined, { timeZone })
    return timeZone
  } catch {
    return null
  }
}

// In the aerodrome's own zone when it is known, otherwise the browser's.
const sunTime = (timestamp: number | null | undefined, timeZone: string | null) =>
  timestamp
    ? new Date(timestamp * 1000).toLocaleTimeString(currentLocale(), {
        ...(timeZone ? { timeZone } : {}),
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

const skyCondition = (cloudPct: number | null | undefined): { label: string; icon: LucideIcon } => {
  if (cloudPct === undefined || cloudPct === null) return { label: "—", icon: Cloud }
  if (cloudPct < 30) return { label: i18n.t("dashboard:weather.condition.sunny"), icon: Sun }
  if (cloudPct < 70) return { label: i18n.t("dashboard:weather.condition.partlyCloudy"), icon: CloudSun }
  return { label: i18n.t("dashboard:weather.condition.cloudy"), icon: Cloud }
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
  const [timeZone, setTimeZone] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
  // The API answered, with nothing: the club has no weather provider, the
  // provider is silent or it does not know the aerodrome. Not an error.
  const [unavailable, setUnavailable] = useState(false)
  const { toast } = useToast()
  const { t } = useTranslation("dashboard")
  const client = useApolloClient()

  // `manual` is true when the member pressed the refresh button: only then is
  // the outcome announced by a toast.
  const fetchWeather = useCallback(
    async (manual: boolean) => {
      if (!preferredAerodrome) return
      setIsRefreshing(true)
      try {
        const airport = await findAerodromeByCode(client, preferredAerodrome)
        const located = typeof airport?.latitude === "number" && typeof airport?.longitude === "number"
        const conditions = located
          ? (
              await client.query<{ weatherAt: WeatherData | null }>({
                query: WEATHER_AT,
                variables: { latitude: airport.latitude, longitude: airport.longitude },
                // The API keeps the conditions for a few minutes itself.
                fetchPolicy: "network-only",
              })
            ).data?.weatherAt
          : null
        setFailed(false)
        if (!conditions) {
          setWeatherData(null)
          setUnavailable(true)
          if (manual) {
            toast({ title: t("weather.unavailable.title"), description: t("weather.unavailable.description") })
          }
          return
        }
        setUnavailable(false)
        setWeatherData(conditions)
        setTimeZone(usableTimeZone(airport?.timezone))
        if (manual) {
          toast({
            title: t("weather.toast.refreshed.title"),
            description: t("weather.toast.refreshed.description", { aerodrome: preferredAerodrome }),
          })
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données météo:", error)
        setFailed(true)
        if (manual) {
          toast({
            title: t("weather.toast.failed.title"),
            description: t("weather.toast.failed.description"),
            variant: "destructive",
          })
        }
      } finally {
        setIsRefreshing(false)
      }
    },
    [client, preferredAerodrome, toast, t],
  )

  useEffect(() => {
    fetchWeather(false)
  }, [fetchWeather])

  const sky = skyCondition(weatherData?.cloudCover)
  const grid = cn("grid grid-cols-2 gap-3", wide && "sm:grid-cols-4")

  const renderContent = () => {
    if (!preferredAerodrome) {
      return (
        <WidgetEmpty
          icon={MapPin}
          title={t("weather.empty.title")}
          description={t("weather.empty.description")}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/profile">{t("weather.empty.action")}</Link>
            </Button>
          }
        />
      )
    }
    if (!weatherData && failed) return <WidgetError onRetry={() => fetchWeather(true)} />
    if (!weatherData && unavailable) {
      return (
        <WidgetEmpty
          icon={CloudOff}
          title={t("weather.unavailable.title")}
          description={t("weather.unavailable.description")}
        />
      )
    }
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
          label={t("weather.temperature")}
          icon={Thermometer}
          value={figure(weatherData.temperature, " °C")}
          hint={t("weather.feelsLike", { value: figure(weatherData.feelsLike, " °C") })}
        />
        <Tile
          label={t("weather.sky")}
          icon={sky.icon}
          value={sky.label}
          hint={t("weather.skyHint", {
            clouds: figure(weatherData.cloudCover, " %"),
            humidity: figure(weatherData.humidity, " %"),
          })}
        />
        <Tile
          label={t("weather.wind")}
          icon={Wind}
          value={figure(weatherData.windSpeedKmh, " km/h")}
          hint={t("weather.windDirection", { value: figure(weatherData.windDegrees, "°") })}
        />
        <Tile
          label={t("weather.sun")}
          icon={Sunrise}
          value={`${sunTime(weatherData.sunrise, timeZone)} – ${sunTime(weatherData.sunset, timeZone)}`}
          hint={t(timeZone ? "weather.sunHintAerodrome" : "weather.sunHintBrowser")}
        />
      </div>
    )
  }

  return (
    <WidgetContainer
      title={WIDGET_REGISTRY["weather"].label}
      description={preferredAerodrome ? t("weather.aerodrome", { code: preferredAerodrome }) : undefined}
      action={
        preferredAerodrome ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => fetchWeather(true)}
            disabled={isRefreshing}
            aria-label={t("weather.refresh")}
            title={t("weather.refresh")}
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
