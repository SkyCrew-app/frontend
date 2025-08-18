"use client"

import { useQuery } from "@apollo/client"
import { useParams, useRouter } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  Calendar,
  Tag,
  Share2,
  Printer,
  ArrowLeft,
  Clock,
  User,
  CalendarClock,
  BookOpen,
  AlertCircle,
} from "lucide-react"
import { useToast } from "@/components/hooks/use-toast"
import { GET_ARTICLE_BY_ID } from "@/graphql/articles"
import { motion } from "framer-motion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"

export default function ArticlePage() {
  const t = useTranslations("articles")
  const { id } = useParams()
  const { toast } = useToast()
  const router = useRouter()
  const [readingTime, setReadingTime] = useState<number>(0)
  const [imageLoaded, setImageLoaded] = useState(false)

  const intId = Number.parseInt(id as string, 10)

  const { data, loading, error } = useQuery(GET_ARTICLE_BY_ID, {
    variables: { id: intId },
    skip: !id,
    onError: () => {
      toast({
        title: t("error"),
        description: t("error"),
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    if (data?.article?.text) {
      const wordCount = data.article.text.replace(/<[^>]*>/g, "").split(/\s+/).length
      const readTime = Math.ceil(wordCount / 200)
      setReadingTime(readTime)
    }
  }, [data])

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="mb-4 flex items-center">
          <Skeleton className="h-10 w-24" />
        </div>
        <Card className="overflow-hidden shadow-lg">
          <Skeleton className="h-72 w-full" />
          <div className="p-6">
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-5 w-1/3 mb-6" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-6" />
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </Card>
      </div>
    )
  }

  if (error || !data?.article) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Button variant="ghost" className="mb-6 flex items-center" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("notFoundTitle")}</AlertTitle>
          <AlertDescription>{t("notFoundDescription")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const article = data.article
  const formattedDate = new Date(article.createdAt).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const formattedEventDate = article.eventDate
    ? new Date(article.eventDate).toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.description,
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: t("linkCopiedTitle"),
        description: t("linkCopiedDescription"),
      })
    }
  }

  const addToCalendar = (type: "google" | "apple" | "outlook") => {
    if (!article.eventDate) {
      toast({
        title: t("error"),
        description: t("error"),
        variant: "destructive",
      })
      return
    }

    const eventDate = new Date(article.eventDate)
    const endDate = new Date(eventDate)
    endDate.setHours(endDate.getHours() + 2)

    if (type === "google") {
      window.open(
        `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(article.title)}&details=${encodeURIComponent(
          article.description,
        )}&dates=${eventDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}/${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}`,
        "_blank",
      )
    } else if (type === "apple" || type === "outlook") {
      const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${article.title}
DESCRIPTION:${article.description}
DTSTART:${eventDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
DTEND:${endDate.toISOString().replace(/-|:|\.\d\d\d/g, "")}
END:VEVENT
END:VCALENDAR`
      const blob = new Blob([calendarData], { type: "text/calendar" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${article.title}.ics`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href)
    toast({
      title: t("linkCopiedTitle"),
      description: t("linkCopiedDescription"),
    })
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 print:p-0">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Button variant="ghost" className="mb-6 flex items-center print:hidden" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>

        <Card className="overflow-hidden shadow-lg print:shadow-none">
          <CardHeader className="p-0 relative">
            <div className="relative w-full h-[400px] bg-muted/30">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="w-full h-full absolute" />
                </div>
              )}
              <img
                src={
                  article.photo_url
                    ? `${process.env.NEXT_PUBLIC_API_URL}${article.photo_url}`
                    : "https://via.placeholder.com/1200x600?text=Article+Image"
                }
                alt={article.title}
                className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImageLoaded(true)}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6">
                <motion.h1
                  className="text-white text-3xl md:text-4xl font-bold"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {article.title}
                </motion.h1>
              </div>
            </div>
          </CardHeader>

          <CardContent className="mt-6 print:mt-2">
            <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                <span>{t("publishedLabel", { date: formattedDate })}</span>
              </div>

              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>{t("readingTime", { time: readingTime })}</span>
              </div>

              {article.author && (
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  <span>{article.author}</span>
                </div>
              )}
            </div>

            {article.eventDate && (
              <motion.div
                className="mb-6 p-4 border border-primary/20 rounded-lg bg-primary/5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="flex items-start gap-3">
                  <CalendarClock className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{t("eventLabel", { date: formattedEventDate || '--'})}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Calendar className="w-4 h-4 mr-2" />
                            {t("addToCalendar")}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => addToCalendar("google")}>{t("googleCalendar")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addToCalendar("apple")}>{t("appleCalendar")}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addToCalendar("outlook")}>{t("outlookCalendar")}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <p className="text-lg font-medium mb-6">{article.description}</p>

              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  {article.tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="flex items-center">
                      <Tag className="w-3 h-3 mr-1" /> {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator className="my-6" />

              <div
                className="mt-6 text-base leading-relaxed prose prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-md max-w-none"
                dangerouslySetInnerHTML={{ __html: article.text }}
              />
            </motion.div>
          </CardContent>

          <CardFooter className="mt-6 flex flex-wrap justify-between gap-4 print:hidden">
            <div className="flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Article #{article.id}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyToClipboard}>
                <Share2 className="w-4 h-4 mr-2" />
                {t("copyLink")}
              </Button>

              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                  {t("share")}
              </Button>

              <Button variant="secondary" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                  {t("print")}
              </Button>
            </div>
          </CardFooter>
        </Card>

        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <motion.div
            className="mt-12 print:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <h2 className="text-2xl font-bold mb-6">{t("relatedArticles")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {article.relatedArticles.map((relatedArticle: any) => (
                <Card key={relatedArticle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-40 overflow-hidden">
                    <img
                      src={
                        relatedArticle.photo_url
                          ? `${process.env.NEXT_PUBLIC_API_URL}${relatedArticle.photo_url}`
                          : "https://via.placeholder.com/300x200?text=Article"
                      }
                      alt={relatedArticle.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-2">{relatedArticle.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">{relatedArticle.description}</p>
                    <Button
                      variant="link"
                      className="p-0 mt-2 h-auto"
                      onClick={() => router.push(`/articles/${relatedArticle.id}`)}
                    >
                      {t("readArticle")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
