"use client"

import { useMemo, useState } from "react"
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
const formatScore = (score: number | null | undefined) => (score == null ? "—" : `${Math.round(score)} %`)

export default function EvaluationsPage() {
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
        title="Mes évaluations"
        description="Les évaluations à passer et les résultats de celles que vous avez déjà passées."
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
            <StatCard label="À passer" value={toTake.length} icon={ClipboardList} tone="warning" />
            <StatCard label="Réussies" value={passedCount} icon={CheckCircle2} tone="success" />
            <StatCard label="Score moyen" value={average === null ? "—" : `${average} %`} icon={Award} tone="primary" />
            <StatCard
              label="Dernière tentative"
              value={lastAttempt?.completed_at ? formatDate(lastAttempt.completed_at) : "—"}
              hint={lastAttempt?.evaluation?.module?.title}
              icon={History}
              tone="neutral"
            />
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">À passer</h2>
            {toTake.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Aucune évaluation à passer"
                description="Toutes les évaluations disponibles sont réussies. Les nouvelles apparaîtront ici."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {toTake.map((evaluation) => {
                  const lastTry = latestAttempts.get(Number(evaluation.id))
                  return (
                    <Card key={evaluation.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base leading-snug">
                            {evaluation.module?.title ?? "Évaluation"}
                          </CardTitle>
                          <Badge variant={lastTry ? "warning" : "neutral"} className="shrink-0">
                            {lastTry ? "À repasser" : "À passer"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-1 pb-4 text-sm text-muted-foreground">
                        <p>Score requis : {formatScore(evaluation.pass_score)}</p>
                        {lastTry && (
                          <p>
                            Dernier score : {formatScore(lastTry.score)}
                            {lastTry.completed_at && `, le ${formatDate(lastTry.completed_at)}`}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="justify-end">
                        <Button size="sm" asChild>
                          <Link href={learningRoutes.evaluation(evaluation.id)}>
                            {lastTry ? "Repasser l'évaluation" : "Passer l'évaluation"}
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
            <h2 className="text-lg font-semibold">Mes résultats</h2>

            {(attempts ?? []).length === 0 ? (
              <EmptyState
                icon={History}
                title="Aucun résultat pour le moment"
                description="Vos scores apparaîtront ici après votre première évaluation."
              />
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      aria-label="Rechercher un résultat par module"
                      placeholder="Rechercher un module, ex. navigation"
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
                    <SelectTrigger className="w-full sm:w-48" aria-label="Filtrer par résultat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les résultats</SelectItem>
                      <SelectItem value="passed">Réussies</SelectItem>
                      <SelectItem value="failed">Non réussies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto rounded-xl border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Module</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Score requis</TableHead>
                        <TableHead>Résultat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="p-4">
                            <EmptyState
                              icon={Search}
                              title="Aucun résultat ne correspond"
                              description={
                                isFiltered ? "Modifiez la recherche ou le filtre." : "Aucune tentative enregistrée."
                              }
                              className="border-0"
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((attempt) => (
                          <TableRow key={attempt.id}>
                            <TableCell className="min-w-[10rem] font-medium">
                              {attempt.evaluation?.module?.title ?? "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(attempt.completed_at)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatScore(attempt.score)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatScore(attempt.evaluation?.pass_score)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={attempt.passed ? "success" : "danger"}>
                                {attempt.passed ? "Réussie" : "Non réussie"}
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
