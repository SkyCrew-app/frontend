'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Calendar, Cloud, Sun, Wind } from 'lucide-react'
import { useToast } from '@/components/hooks/use-toast'
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from '@apollo/client'
import { GET_USER_PROFILE } from '@/graphql/user'
import Link from 'next/link'
import { GET_ARTICLES } from '@/graphql/articles'
import { useCurrentUser, useUserData } from '@/components/hooks/userHooks';

export default function ActualitesAeroclub() {
  const [weatherData, setWeatherData] = useState<any | null>(null)
  const userEmail = useCurrentUser();
  const userData = useUserData(userEmail);
  const [userId, setUserId] = useState<string | null>(null);
  const [first_name, setFirstName] = useState<string | null>(null);
  const { toast } = useToast()

  const { data: articlesData, loading: articlesLoading, error: articlesError } = useQuery(GET_ARTICLES)

  const fetchWeather = async () => {
    try {
      const latitude = 48.866667
      const longitude = 2.333333
      const response = await fetch(
        `https://api.api-ninjas.com/v1/weather?lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'X-Api-Key': 'KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU',
          },
        }
      )
      const data = await response.json()
      setWeatherData(data)
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les données météo.",
        variant: "destructive",
      })
      console.error('Erreur lors de la récupération des données météo:', error)
    }
  }

  useEffect(() => {
    fetchWeather()
  }, [])

  useEffect(() => {
    if (userData) {
      setUserId(userData.id);
    }
  }, [userData]);

  const { data: userInfo, loading: userLoading, error: userError } = useQuery(GET_USER_PROFILE, {
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
      });
    }
  }, [userError, toast]);

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
    fetchWeather();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Bienvenue, {first_name || <Skeleton className="h-6 w-32" />}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Température</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weatherData?.temp || '--'}°C</div>
            <p className="text-xs text-muted-foreground">
              Ressenti {weatherData?.feels_like || '--'}°C
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conditions</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weatherData?.cloud_pct || '---'}%</div>
            <p className="text-xs text-muted-foreground">Humidité: {weatherData?.humidity || '--'}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Soleil</CardTitle>
            <Sun className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Levée {weatherData?.sunrise ? new Date(weatherData.sunrise * 1000).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }) : '---'}</div>
            <p className="text-xs text-muted-foreground">Couché {weatherData?.sunset ? new Date(weatherData.sunset * 1000).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris' }) : '---'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vent</CardTitle>
            <Wind className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weatherData?.wind_speed || '--'} km/h</div>
            <p className="text-xs text-muted-foreground">
              Direction: {weatherData?.wind_degrees || '--'}°
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4 mt-8">Découvrez nos dernières actualités</h2>
      {articlesLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : articles.length === 0 ? (
        <p className="text-center text-lg text-gray-600">Aucun article pour le moment.</p>
      ) : (
        <Carousel className="w-full max-w-4xl mx-auto mb-6">
          <CarouselContent>
            {articles.map((article: any, index: number) => (
              <CarouselItem key={article.id}>
                <Card className="border-0 shadow-none">
                  <CardHeader className="relative p-0">
                    <img
                      src={article.photo_url ? `http://localhost:3000${article.photo_url}` : 'https://via.placeholder.com/800x400'}
                      alt={article.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                      <CardTitle className="text-xl font-bold text-white">
                        {article.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant="secondary">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(article.createdAt).toLocaleDateString('fr-FR')}
                      </Badge>
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex space-x-2">
                          {article.tags.slice(0, 2).map((tag: string) => (
                            <Badge
                              key={tag}
                              style={{
                                backgroundColor: getRandomColor(),
                                color: '#fff',
                              }}
                            >
                              {tag}
                            </Badge>
                          ))}
                          {article.tags.length > 2 && (
                            <Badge variant="secondary">+{article.tags.length - 2}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-sm line-clamp-3">{article.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full">
                      <Link href={`/articles/${article.id}`}>
                        Lire plus
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center mt-4 space-x-2">
            <CarouselPrevious />
            <CarouselNext />
          </div>
        </Carousel>
      )}
    </div>
  )
}

function getRandomColor(): string {
  const colors = [
    '#FF5733',
    '#33FF57',
    '#3357FF',
    '#FFC300',
    '#FF33A8',
    '#33FFF1',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}