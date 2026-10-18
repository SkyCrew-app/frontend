"use client"

import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GET_MY_LOGIN_EVENTS } from "@/graphql/login-events"
import { formatDateTime } from "@/lib/format"
import { loginDeviceLabel, loginOutcomeBadge, loginOutcomeLabel, type LoginEvent } from "@/lib/login-events"

interface MySignInsProps {
  /** Asked for only once the security tab is shown. */
  active: boolean
}

/** The latest sign-ins on the member's own account, to spot one they did not make. */
export function MySignIns({ active }: MySignInsProps) {
  const { t } = useTranslation("profile")
  const { data, loading, error, refetch } = useQuery<{ myLoginEvents: LoginEvent[] }>(GET_MY_LOGIN_EVENTS, {
    skip: !active,
    fetchPolicy: "cache-and-network",
  })
  const events = data?.myLoginEvents ?? []

  // The tab is not shown yet: nothing to ask, nothing to draw.
  if (!active && !data) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("signIns.title")}</CardTitle>
        <CardDescription>{t("signIns.description")}</CardDescription>
        <p className="flex items-start gap-2 pt-1 text-sm">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {t("signIns.hint")}
        </p>
      </CardHeader>
      <CardContent>
        {!data && loading ? (
          <Skeleton className="h-40 w-full" aria-busy="true" aria-label={t("signIns.loading")} />
        ) : !data && error ? (
          <div className="flex flex-wrap items-center justify-between gap-3" role="alert">
            <p className="text-sm text-muted-foreground">{t("signIns.loadError")}</p>
            <Button variant="outline" size="sm" onClick={() => refetch().catch(() => undefined)}>
              {t("common:actions.retry")}
            </Button>
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("signIns.empty")}</p>
        ) : (
          <>
            <div className="hidden rounded-lg border md:block">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-44">{t("signIns.date")}</TableHead>
                    <TableHead>{t("signIns.device")}</TableHead>
                    <TableHead className="w-40">{t("signIns.ip")}</TableHead>
                    <TableHead className="w-60">{t("signIns.outcome")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="tabular-nums">{formatDateTime(event.created_at)}</TableCell>
                      <TableCell className="break-words">{loginDeviceLabel(event)}</TableCell>
                      <TableCell className="break-all font-mono text-xs">{event.ip_address || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={loginOutcomeBadge(event.outcome)}>{loginOutcomeLabel(event.outcome)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y rounded-lg border md:hidden" aria-label={t("signIns.title")}>
              {events.map((event) => (
                <li key={event.id} className="space-y-1.5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium tabular-nums">{formatDateTime(event.created_at)}</span>
                    <Badge variant={loginOutcomeBadge(event.outcome)}>{loginOutcomeLabel(event.outcome)}</Badge>
                  </div>
                  <p className="break-words text-sm text-muted-foreground">{loginDeviceLabel(event)}</p>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    <span className="sr-only">{t("signIns.ip")} </span>
                    {event.ip_address || "—"}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
