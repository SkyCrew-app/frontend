"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Calendar, Cloud, Sun, Wind, RefreshCw, Plane, Info, ArrowRight } from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@apollo/client"
import { GET_USER_PROFILE } from "@/graphql/user"
import Link from "next/link"
import { GET_ARTICLES } from "@/graphql/articles"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { motion } from "framer-motion"

export default function ActualitesAeroclub() {
  const [weatherData, setWeatherData] = useState<any | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const [first_name, setFirstName] = useState<string | null>(null)
  const { toast } = useToast()

  const { data: articlesData, loading: articlesLoading, error: articlesError } = useQuery(GET_ARTICLES)

  const fetchWeather = async () => {
    setIsRefreshing(true)
    try {
      const latitude = 48.866667
      const longitude = 2.333333
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
  }

  useEffect(() => {
    fetchWeather()
  }, [])

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const {
    data: userInfo,
    loading: userLoading,
    error: userError,
  } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail },
    skip: !userEmail,
  })

  useEffect(() => {
    if (userInfo && userInfo.userByEmail) {
      const { first_name } = userInfo.userByEmail
      if (first_name) {
        setFirstName(first_name)
      }
    }
  }, [userInfo])

  useEffect(() => {
    if (userError) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données utilisateur.",
        variant: "destructive",
      })
    }
  }, [userError, toast])

  useEffect(() => {
    if (articlesError) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les articles.",
        variant: "destructive",
      })
    }
  }, [articlesError, toast])

  const articles = articlesData?.articles || []

  const refreshWeather = () => {
    fetchWeather()
  }

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
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  }

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

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {first_name ? (
              <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                Bienvenue, {first_name}
              </span>
            ) : (
              <Skeleton className="h-8 w-48" />
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Voici les dernières actualités et conditions météo</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 flex items-center gap-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          >
            <Plane className="h-3.5 w-3.5 rotate-45" />
            <span>Toulouse, France</span>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshWeather}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualiser la météo</span>
          </Button>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
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
                Nuages: {weatherData?.cloud_pct || "--"}% • Humidité: {weatherData?.humidity || "--"}%
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
          <Card className="overflow-hidden border-t-4 border-t-cyan-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vent</CardTitle>
              <Wind className="h-4 w-4 text-cyan-500" />
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
                <span>Direction: {weatherData?.wind_degrees || "--"}°</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Actualités de l'aéroclub
          </h2>
          <Link
            href="/articles"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
          >
            Voir toutes les actualités
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>

        {articlesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="pt-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <Card className="bg-gray-50 dark:bg-gray-900 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Info className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-center text-lg text-gray-600 dark:text-gray-400 font-medium">
                Aucun article pour le moment
              </p>
              <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-1">
                Les actualités de l'aéroclub seront affichées ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {articles.map((article: any) => (
                  <CarouselItem key={article.id} className="pl-2 md:pl-4 sm:basis-1/2 lg:basis-1/3">
                    <Card className="overflow-hidden h-full border hover:shadow-md transition-all">
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={
                            article.photo_url
                              ? `http://localhost:3000${article.photo_url}`
                              : "https://via.placeholder.com/800x400?text=Aéroclub"
                          }
                          alt={article.title}
                          className="w-full h-full object-cover transition-transform hover:scale-105 duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {article.tags &&
                            article.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} className="bg-black/70 hover:bg-black/80 text-white backdrop-blur-sm">
                                {tag}
                              </Badge>
                            ))}
                          {article.tags && article.tags.length > 2 && (
                            <Badge className="bg-black/70 hover:bg-black/80 text-white backdrop-blur-sm">
                              +{article.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <Badge
                          variant="outline"
                          className="mb-2 text-xs flex w-fit items-center gap-1 text-gray-600 dark:text-gray-400"
                        >
                          <Calendar className="w-3 h-3" />
                          {new Date(article.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Badge>
                        <h3 className="font-bold text-lg mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">
                          {article.description}
                        </p>
                        <Link
                          href={`/articles/${article.id}`}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                        >
                          Lire l'article complet
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                <CarouselPrevious className="bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800" />
              </div>
              <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                <CarouselNext className="bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800" />
              </div>
            </Carousel>
          </div>
        )}
      </div>
    </div>
  )
}
