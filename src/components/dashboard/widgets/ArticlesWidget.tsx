"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Calendar, Info, ArrowRight } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@apollo/client"
import { GET_ARTICLES } from "@/graphql/articles"
import { useToast } from "@/components/hooks/use-toast"
import Link from "next/link"

export default function ArticlesWidget() {
  const { data: articlesData, loading: articlesLoading, error: articlesError } = useQuery(GET_ARTICLES)
  const { toast } = useToast()

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

  if (articlesLoading) {
    return (
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
    )
  }

  if (articles.length === 0) {
    return (
      <Card className="bg-muted/30 dark:bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Info className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-center text-lg text-gray-600 dark:text-gray-400 font-medium">
            Aucun article pour le moment
          </p>
          <p className="text-center text-sm text-gray-500 dark:text-gray-500 mt-1">
            Les actualités de l&apos;aéroclub seront affichées ici
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          Actualités
        </h3>
        <Link
          href="/articles"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
        >
          Voir tout
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      <div className="relative">
        <Carousel className="w-full">
          <CarouselContent className="-ml-2 md:-ml-4">
            {articles.map((article: any) => (
              <CarouselItem key={article.id} className="pl-2 md:pl-4 sm:basis-1/2 lg:basis-1/2">
                <Card className="overflow-hidden h-full border hover:shadow-md transition-all">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={
                        article.photo_url
                          ? `http://localhost:3000${article.photo_url}`
                          : "https://placehold.co/600x400"
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
                  <CardContent className="p-4 h-44 flex flex-col">
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 flex-1">
                      {article.description}
                    </p>
                    <Link
                      href={`/articles/${article.id}`}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium flex items-center"
                    >
                      Lire l&apos;article complet
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="absolute -left-1 top-1/2 -translate-y-1/2">
            <CarouselPrevious className="bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800" />
          </div>
          <div className="absolute -right-1 top-1/2 -translate-y-1/2">
            <CarouselNext className="bg-white/80 backdrop-blur-sm hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800" />
          </div>
        </Carousel>
      </div>
    </div>
  )
}
