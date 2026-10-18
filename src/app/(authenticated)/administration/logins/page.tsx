"use client"

import { Suspense, useState } from "react"
import { useQuery } from "@apollo/client"
import { useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { KeyRound, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { PaginationControls } from "@/components/admin-user/pagination-controls"
import { GET_LOGIN_EVENTS } from "@/graphql/login-events"
import { GET_USERS } from "@/graphql/user"
import { formatDateTime } from "@/lib/format"
import { currentLocale } from "@/lib/i18n"
import {
  LOGIN_OUTCOMES,
  LOGIN_PERIODS,
  loginAccountLabel,
  loginDeviceLabel,
  loginMethodLabel,
  loginOutcomeBadge,
  loginOutcomeLabel,
  periodStart,
  type LoginEvent,
  type LoginPeriod,
} from "@/lib/login-events"

const PAGE_SIZE = 25
const ALL = "all"

interface LoginEventsData {
  loginEvents: { total: number; page: number; pageSize: number; items: LoginEvent[] }
}

interface MemberOption {
  id: string
  first_name?: string | null
  last_name?: string | null
  email: string
}

const memberName = (member: MemberOption) =>
  `${member.last_name ?? ""} ${member.first_name ?? ""}`.trim() || member.email

function Outcome({ event }: { event: LoginEvent }) {
  // The password is the usual way in: only the second step says how it was checked.
  const method = event.method === "TWO_FACTOR_CODE" ? loginMethodLabel(event.method) : null
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge variant={loginOutcomeBadge(event.outcome)}>{loginOutcomeLabel(event.outcome)}</Badge>
      {method && <span className="text-xs text-muted-foreground">{method}</span>}
    </span>
  )
}

function LoginLogContent() {
  const { t } = useTranslation("administration")
  const searchParams = useSearchParams()
  // Opened from a member's sheet: their lines only.
  const [memberId, setMemberId] = useState(() => {
    const member = searchParams?.get("member")
    return member && /^\d+$/.test(member) ? member : ALL
  })
  const [outcome, setOutcome] = useState(ALL)
  const [period, setPeriod] = useState<LoginPeriod>("all")
  // The start of the period is fixed when it is chosen, not at every render.
  const [from, setFrom] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data, previousData, loading, error, refetch } = useQuery<LoginEventsData>(GET_LOGIN_EVENTS, {
    variables: {
      memberId: memberId === ALL ? null : Number(memberId),
      outcome: outcome === ALL ? null : outcome,
      from,
      to: null,
      page,
      pageSize: PAGE_SIZE,
    },
    fetchPolicy: "cache-and-network",
  })
  const { data: membersData } = useQuery<{ getUsers: MemberOption[] }>(GET_USERS)

  const members = [...(membersData?.getUsers ?? [])].sort((a, b) =>
    memberName(a).localeCompare(memberName(b), currentLocale()),
  )

  // Every filter change brings the list back to its first page.
  const withFirstPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }
  const choosePeriod = (value: string) => {
    setPeriod(value as LoginPeriod)
    setFrom(periodStart(value as LoginPeriod))
    setPage(1)
  }
  const hasFilters = memberId !== ALL || outcome !== ALL || period !== "all"
  const resetFilters = () => {
    setMemberId(ALL)
    setOutcome(ALL)
    setPeriod("all")
    setFrom(null)
    setPage(1)
  }

  // The page being left stays on screen while the next one loads.
  const shown = (data ?? previousData)?.loginEvents
  const items = shown?.items ?? []

  const empty = hasFilters ? (
    <EmptyState
      icon={Search}
      title={t("loginLog.noMatch.title")}
      description={t("loginLog.noMatch.description")}
      action={
        <Button variant="outline" onClick={resetFilters}>
          {t("common:actions.clearFilters")}
        </Button>
      }
      className="border-0"
    />
  ) : (
    <EmptyState
      icon={KeyRound}
      title={t("loginLog.empty.title")}
      description={t("loginLog.empty.description")}
      className="border-0"
    />
  )

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
        <Select value={memberId} onValueChange={withFirstPage(setMemberId)}>
          <SelectTrigger className="lg:w-64" aria-label={t("loginLog.filters.member")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("loginLog.filters.allMembers")}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={String(member.id)}>
                {memberName(member)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={outcome} onValueChange={withFirstPage(setOutcome)}>
          <SelectTrigger className="lg:w-72" aria-label={t("loginLog.filters.outcome")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("loginLog.filters.allOutcomes")}</SelectItem>
            {LOGIN_OUTCOMES.map((value) => (
              <SelectItem key={value} value={value}>
                {loginOutcomeLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={choosePeriod}>
          <SelectTrigger className="lg:w-56" aria-label={t("loginLog.filters.period")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOGIN_PERIODS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`loginLog.filters.periods.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" className="justify-self-start" onClick={resetFilters}>
            {t("common:actions.clearFilters")}
          </Button>
        )}
      </div>

      {!shown && loading ? (
        <Skeleton className="h-96 w-full" aria-busy="true" aria-label={t("loginLog.loading")} />
      ) : !shown && error ? (
        <ErrorState onRetry={() => refetch().catch(() => undefined)} />
      ) : (
        <>
          {/* Wide screens: a table that fits the page (long values wrap, nothing scrolls inside it). */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">{t("loginLog.table.date")}</TableHead>
                    <TableHead>{t("loginLog.table.account")}</TableHead>
                    <TableHead className="w-64">{t("loginLog.table.outcome")}</TableHead>
                    <TableHead>{t("loginLog.table.device")}</TableHead>
                    <TableHead className="w-40">{t("loginLog.table.ip")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="tabular-nums">{formatDateTime(event.created_at)}</TableCell>
                        <TableCell className="break-words font-medium">{loginAccountLabel(event)}</TableCell>
                        <TableCell>
                          <Outcome event={event} />
                        </TableCell>
                        <TableCell className="break-words text-muted-foreground">{loginDeviceLabel(event)}</TableCell>
                        <TableCell className="break-all font-mono text-xs">{event.ip_address || "—"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={5} className="p-4">
                        {empty}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Phones and tablets: one card per sign-in. */}
          <div className="lg:hidden">
            {items.length > 0 ? (
              <ul className="space-y-3" aria-label={t("loginLog.title")}>
                {items.map((event) => (
                  <li key={event.id}>
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="min-w-0 break-words font-medium">{loginAccountLabel(event)}</p>
                          <p className="text-sm tabular-nums text-muted-foreground">
                            {formatDateTime(event.created_at)}
                          </p>
                        </div>
                        <Outcome event={event} />
                        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                          <dt className="text-muted-foreground">{t("loginLog.table.device")}</dt>
                          <dd className="min-w-0 break-words">{loginDeviceLabel(event)}</dd>
                          <dt className="text-muted-foreground">{t("loginLog.table.ip")}</dt>
                          <dd className="min-w-0 break-all font-mono text-xs leading-5">{event.ip_address || "—"}</dd>
                        </dl>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : (
              <Card>
                <CardContent className="p-4">{empty}</CardContent>
              </Card>
            )}
          </div>

          <PaginationControls
            currentPage={shown?.page ?? page}
            totalItems={shown?.total ?? 0}
            itemsPerPage={shown?.pageSize ?? PAGE_SIZE}
            onPageChange={setPage}
            itemLabel={t("loginLog.pagination.events", { count: shown?.total ?? 0 })}
          />
        </>
      )}
    </>
  )
}

function Header() {
  const { t } = useTranslation("administration")
  return <PageHeader className="mb-0" title={t("loginLog.title")} description={t("loginLog.description")} />
}

export default function LoginLogPage() {
  return (
    <div className="space-y-6">
      <Header />
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <div className="space-y-6">
          <LoginLogContent />
        </div>
      </Suspense>
    </div>
  )
}
