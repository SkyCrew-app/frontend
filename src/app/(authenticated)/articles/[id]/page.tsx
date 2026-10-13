"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { endOfDay } from "date-fns"
import { ArrowLeft, Calendar, CalendarPlus, Clock, FileSearch, FileText, Link2, Printer, Share2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { articleTagLabel } from "@/components/articles/article-card"
import { ArticleImage, articleFileName, articleFileUrl } from "@/components/articles/article-image"
import { useToast } from "@/components/hooks/use-toast"
import { RichText } from "@/components/ui/rich-text"
import { GET_ARTICLE_BY_ID } from "@/graphql/articles"
import { formatDate, formatDateTime } from "@/lib/format"

interface Article {
  id: string
  title: string
  description: string
  text: string
  tags: string[] | null
  photo_url: string | null
  createdAt: string
  eventDate: string | null
  documents_url: string[] | null
}

const WORDS_PER_MINUTE = 200

// An event saved without a time is stored at midnight: show the day only.
const hasTime = (date: Date) => date.getHours() !== 0 || date.getMinutes() !== 0

const formatEventDate = (date: Date) => (hasTime(date) ? formatDateTime(date) : formatDate(date))

const toCalendarStamp = (date: Date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "")

const BackLink = () => {
  const { t } = useTranslation("articles")
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3 print:hidden">
      <Link href="/articles">
        <ArrowLeft className="h-4 w-4" />
        {t("reader.backToList")}
      </Link>
    </Button>
  )
}

export default function ArticlePage() {
  const { t } = useTranslation("articles")
  const { id } = useParams()
  const { toast } = useToast()

  const intId = Number.parseInt(id as string, 10)

  const { data, loading, error, refetch } = useQuery(GET_ARTICLE_BY_ID, {
    variables: { id: intId },
    skip: !id,
  })

  const article: Article | undefined = data?.article

  const readingTime = useMemo(() => {
    if (!article?.text) return 0
    const words = article.text
      .replace(/<[^>]*>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
  }, [article?.text])

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" role="status" aria-label={t("reader.loading")}>
        <BackLink />
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="aspect-[2/1] w-full rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink />
        <ErrorState onRetry={() => refetch()} />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <BackLink />
        <EmptyState
          icon={FileSearch}
          title={t("reader.notFound.title")}
          description={t("reader.notFound.description")}
          action={
            <Button asChild variant="outline">
              <Link href="/articles">{t("reader.notFound.action")}</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const tags = article.tags ?? []
  const documents = article.documents_url ?? []
  const eventDate = article.eventDate ? new Date(article.eventDate) : null
  // An event without a time lasts the whole day.
  const eventEnd = eventDate && !hasTime(eventDate) ? endOfDay(eventDate) : eventDate
  const isUpcoming = eventEnd ? eventEnd.getTime() >= Date.now() : false

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: t("reader.toast.linkCopied.title"),
        description: t("reader.toast.linkCopied.description"),
      })
    } catch {
      toast({
        title: t("reader.toast.copyFailed.title"),
        description: t("reader.toast.copyFailed.description"),
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (!navigator.share) {
      await copyToClipboard()
      return
    }
    try {
      await navigator.share({
        title: article.title,
        text: article.description,
        url: window.location.href,
      })
    } catch {
      // The share sheet was closed: nothing to report.
    }
  }

  const addToCalendar = (type: "google" | "ics") => {
    if (!eventDate) return

    const endDate = new Date(eventDate)
    endDate.setHours(endDate.getHours() + 2)

    if (type === "google") {
      window.open(
        `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(article.title)}&details=${encodeURIComponent(
          article.description,
        )}&dates=${toCalendarStamp(eventDate)}/${toCalendarStamp(endDate)}`,
        "_blank",
      )
      return
    }

    const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${article.title}
DESCRIPTION:${article.description}
DTSTART:${toCalendarStamp(eventDate)}
DTEND:${toCalendarStamp(endDate)}
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

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <BackLink />

      <div className="space-y-3">
        <PageHeader title={article.title} className="mb-0" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {t("shared.publishedOn", { date: formatDate(article.createdAt) })}
          </span>
          {readingTime > 0 && (
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t("reader.readingTime", { minutes: readingTime })}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {articleTagLabel(tag)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <ArticleImage
        src={article.photo_url}
        alt={t("reader.imageAlt", { title: article.title })}
        className="aspect-[2/1] w-full rounded-xl"
        iconClassName="h-10 w-10"
      />

      {eventDate && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{t("shared.event")}</p>
              <Badge variant={isUpcoming ? "info" : "neutral"}>
                {isUpcoming ? t("reader.event.upcoming") : t("reader.event.past")}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{formatEventDate(eventDate)}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="print:hidden">
                <CalendarPlus className="h-4 w-4" />
                {t("reader.event.addToCalendar")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => addToCalendar("google")}>
                {t("reader.event.googleCalendar")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addToCalendar("ics")}>
                {t("reader.event.icsFile")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {article.description && <p className="text-base font-medium leading-relaxed">{article.description}</p>}

      <RichText
        html={article.text}
        className="prose prose-sm max-w-none text-foreground sm:prose-base prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-li:marker:text-muted-foreground prose-img:rounded-lg"
      />

      {documents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("reader.documents")}</h2>
          <ul className="space-y-2">
            {documents.map((path) => (
              <li key={path}>
                <a
                  href={articleFileUrl(path) ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 truncate font-medium">{articleFileName(path)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Separator className="print:hidden" />

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4" />
          {t("reader.share")}
        </Button>
        <Button variant="outline" onClick={copyToClipboard}>
          <Link2 className="h-4 w-4" />
          {t("reader.copyLink")}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          {t("common:actions.print")}
        </Button>
      </div>
    </article>
  )
}

function handlePrint() {
  window.print()
}
