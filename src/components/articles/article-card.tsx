"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { motion } from "framer-motion"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

interface Article {
  id: string
  title: string
  description: string
  text: string
  tags: string[]
  photo_url: string
  createdAt: string
  eventDate: string | null
}

interface ArticleCardProps {
  article: Article
  viewMode: "grid" | "list"
}

export function ArticleCard({ article, viewMode }: ArticleCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const t = useTranslations('articles');

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMMM yyyy", { locale: fr })
  }

  const truncateDescription = (text: string, length: number) => {
    if (text.length <= length) return text
    return text.substring(0, length) + "..."
  }

  const descriptionLength = viewMode === "grid" ? 120 : 200

  if (viewMode === "list") {
    return (
      <motion.div variants={item}>
        <Card
          className="overflow-hidden transition-all hover:shadow-md"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="relative h-48 w-full sm:h-auto sm:w-1/3 md:w-1/4">
              <Image
                src={article.photo_url || "/placeholder.svg?height=400&width=600"}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-500 ease-in-out"
                style={{
                  transform: isHovered ? "scale(1.05)" : "scale(1)",
                }}
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 33vw, 25vw"
              />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <CardHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {article.eventDate ? (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                        {t('eventLabel', { date: formatDate(article.eventDate!) })}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {t('publishedLabel', { date: formatDate(article.createdAt)})}
                    </span>
                  )}
                </div>
                <CardTitle className="line-clamp-1 text-xl">{article.title}</CardTitle>
                <CardDescription className="line-clamp-3 mt-1">
                  {truncateDescription(article.description, descriptionLength)}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                  {article.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {article.tags?.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{article.tags.length - 3}
                    </Badge>
                  )}
                </div>
                <Button asChild size="sm" className="group gap-1">
                  <Link href={`/articles/${article.id}`}>
                      {t('readArticle')}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </CardFooter>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div variants={item}>
      <Card
        className="h-full overflow-hidden transition-all hover:shadow-md"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={article.photo_url || "/placeholder.svg?height=400&width=600"}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 ease-in-out"
            style={{
              transform: isHovered ? "scale(1.05)" : "scale(1)",
            }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
            {article.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} className="bg-primary/90 text-xs hover:bg-primary">
                {tag}
              </Badge>
            ))}
            {article.tags?.length > 2 && (
              <Badge variant="outline" className="bg-black/50 text-xs text-white hover:bg-black/70">
                +{article.tags.length - 2}
              </Badge>
            )}
          </div>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {article.eventDate ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t('eventLabel', { date: formatDate(article.eventDate!) })}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {t('publishedLabel', { date: formatDate(article.createdAt)})}
              </span>
            )}
          </div>
          <CardTitle className="line-clamp-2 mt-1.5 text-lg">{article.title}</CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {truncateDescription(article.description, descriptionLength)}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="group -ml-2 gap-1 px-2 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href={`/articles/${article.id}`}>
              {t('readArticle')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
