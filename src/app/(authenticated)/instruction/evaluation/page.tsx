"use client"

import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { useQuery } from "@apollo/client"
import { Award, CheckCircle2, ClipboardCheck, ClipboardList, History, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/layout/PageHeader"
import { StatCard } from "@/components/layout/StatCard"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { ListPagination, paginate } from "@/components/courses/ListPagination"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { GET_EVALUATIONS, GET_USER_EVALUATION_RESULTS } from "@/graphql/evaluation"
import { formatDate } from "@/lib/format"
import i18n from "@/lib/i18n"
import { learningRoutes } from "@/lib/learning-navigation"
import { averageScore, evaluationsToTake, latestEvaluationAttempts } from "@/lib/learning-progress"

interface EvaluationSummary {
  id: number
  pass_score: number
  module: { id: number; title: string; description?: string | null } | null
}

interface AttemptResult {
  id: number
  score: number | null
  passed: boolean
  completed_at: string | null
  evaluation: EvaluationSummary | null
}

const PAGE_SIZE = 10

const attemptTime = (attempt: AttemptResult) => (attempt.completed_at ? new Date(attempt.completed_at).getTime() || 0 : 0)
const formatScore = (score: number | null | undefined) =>
  (score == null ? "—" : i18n.t("instruction:shared.percent", { value: Math.round(score) }))

export default function EvaluationsPage() {
  const { t } = useTranslation("instruction")
  const [searchTerm, setSearchTerm] = useState("")
  const [resultFilter, setResultFilter] = useState("all")
  const [page, setPage] = useState(1)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId: number | null = userData ? Number(userData.id) : null
  const skip = userId === null

  const evaluationsQuery = useQuery<{ getEvaluations: EvaluationSummary[] }>(GET_EVALUATIONS, {
    skip,
    fetchPolicy: "cache-and-network",
  })
  const attemptsQuery = useQuery<{ getUserEvaluationResults: AttemptResult[] }>(GET_USER_EVALUATION_RESULTS, {
    variables: { userId },
    skip,
    fetchPolicy: "cache-and-network",
  })

  const attempts = attemptsQuery.data?.getUserEvaluationResults
  const latestAttempts = useMemo(() => latestEvaluationAttempts(attempts), [attempts])
  const toTake = useMemo(
    () => evaluationsToTake(evaluationsQuery.data?.getEvaluations, latestAttempts),
    [evaluationsQuery.data, latestAttempts],
  )

  const results = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return (attempts ?? [])
      .filter((attempt) => {
        const title = attempt.evaluation?.module?.title ?? ""
        const matchesSearch = !search || title.toLowerCase().includes(search)
        const matchesResult =
          resultFilter === "all" || (resultFilter === "passed" ? attempt.passed : !attempt.passed)
        return matchesSearch && matchesResult
      })
      .sort((a, b) => attemptTime(b) - attemptTime(a))
  }, [attempts, searchTerm, resultFilter])

  const { rows, pageCount, page: currentPage } = paginate(results, page, PAGE_SIZE)
  const isFiltered = searchTerm.trim() !== "" || resultFilter !== "all"
  const passedCount = [...latestAttempts.values()].filter((attempt) => attempt.passed).length
  const average = averageScore(latestAttempts.values())
  const lastAttempt = (attempts ?? []).reduce<AttemptResult | null>(
    (latest, attempt) => (!latest || attemptTime(attempt) > attemptTime(latest) ? attempt : latest),
    null,
  )

  const loading =
    skip || (evaluationsQuery.loading && !evaluationsQuery.data) || (attemptsQuery.loading && !attemptsQuery.data)
  const failed = (evaluationsQuery.error && !evaluationsQuery.data) || (attemptsQuery.error && !attemptsQuery.data)

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={t("evaluations.title")}
        description={t("evaluations.page.description")}
      />

      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[104px] rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </>
      ) : failed ? (
        <ErrorState
          onRetry={() => {
            evaluationsQuery.refetch()
            attemptsQuery.refetch()
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t("shared.toTake")} value={toTake.length} icon={ClipboardList} tone="warning" />
            <StatCard label={t("evaluations.page.stats.passed")} value={passedCount} icon={CheckCircle2} tone="success" />
            <StatCard
              label={t("evaluations.page.stats.average")}
              value={average === null ? "—" : t("shared.percent", { value: average })}
              icon={Award}
              tone="primary"
            />
            <StatCard
              label={t("evaluations.page.stats.lastAttempt")}
              value={lastAttempt?.completed_at ? formatDate(lastAttempt.completed_at) : "—"}
              hint={lastAttempt?.evaluation?.module?.title}
              icon={History}
              tone="neutral"
            />
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("shared.toTake")}</h2>
            {toTake.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title={t("evaluations.page.toTake.emptyTitle")}
                description={t("evaluations.page.toTake.emptyDescription")}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {toTake.map((evaluation) => {
                  const lastTry = latestAttempts.get(Number(evaluation.id))
                  return (
                    <Card key={evaluation.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                          <CardTitle className="min-w-0 flex-1 basis-40 break-words text-base leading-snug">
                            {evaluation.module?.title ?? t("shared.evaluationFallback")}
                          </CardTitle>
                          <Badge variant={lastTry ? "warning" : "neutral"} className="shrink-0">
                            {lastTry ? t("shared.toRetake") : t("shared.toTake")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1 pb-4 text-sm text-muted-foreground">
                        <p>{t("shared.requiredScore", { score: formatScore(evaluation.pass_score) })}</p>
                        {lastTry && (
                          <p>
                            {lastTry.completed_at
                              ? t("evaluations.page.toTake.lastScoreOn", {
                                  score: formatScore(lastTry.score),
                                  date: formatDate(lastTry.completed_at),
                                })
                              : t("evaluations.page.toTake.lastScore", { score: formatScore(lastTry.score) })}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="justify-end">
                        <Button size="sm" asChild>
                          <Link href={learningRoutes.evaluation(evaluation.id)}>
                            {lastTry ? t("evaluations.page.toTake.retake") : t("evaluations.page.toTake.take")}
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t("shared.myResults")}</h2>

            {(attempts ?? []).length === 0 ? (
              <EmptyState
                icon={History}
                title={t("evaluations.page.results.emptyTitle")}
                description={t("evaluations.page.results.emptyDescription")}
              />
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      aria-label={t("evaluations.page.results.searchAria")}
                      placeholder={t("evaluations.page.results.searchPlaceholder")}
                      className="pl-9"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value)
                        setPage(1)
                      }}
                    />
                  </div>
                  <Select
                    value={resultFilter}
                    onValueChange={(value) => {
                      setResultFilter(value)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-48" aria-label={t("evaluations.page.results.filterAria")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("evaluations.page.results.filterAll")}</SelectItem>
                      <SelectItem value="passed">{t("evaluations.page.results.filterPassed")}</SelectItem>
                      <SelectItem value="failed">{t("evaluations.page.results.filterFailed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("evaluations.page.results.columns.module")}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t("common:labels.date")}</TableHead>
                        <TableHead className="text-right">{t("evaluations.page.results.columns.score")}</TableHead>
                        <TableHead className="hidden text-right lg:table-cell">
                          {t("evaluations.page.results.columns.requiredScore")}
                        </TableHead>
                        <TableHead>{t("evaluations.page.results.columns.result")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-4">
                            <EmptyState
                              icon={Search}
                              title={t("evaluations.page.results.noMatchTitle")}
                              description={
                                isFiltered
                                  ? t("evaluations.page.results.noMatchFiltered")
                                  : t("evaluations.page.results.noMatchEmpty")
                              }
                              className="border-0"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell className="font-medium">
                              {attempt.evaluation?.module?.title ?? "—"}
                              {/* Narrow screens: the date under the module, its column is hidden. */}
                              <span className="block text-xs font-normal text-muted-foreground lg:hidden">
                                {formatDate(attempt.completed_at)}
                              </span>
                            </TableCell>
                            <TableCell className="hidden whitespace-nowrap lg:table-cell">
                              {formatDate(attempt.completed_at)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-right tabular-nums">{formatScore(attempt.score)}</TableCell>
                            <TableCell className="hidden text-right tabular-nums lg:table-cell">
                              {formatScore(attempt.evaluation?.pass_score)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={attempt.passed ? "success" : "danger"} className="whitespace-nowrap">
                                {attempt.passed ? t("shared.passed") : t("shared.failed")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <ListPagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
