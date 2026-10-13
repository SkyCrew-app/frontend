"use client"

import { useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { ClipboardList, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { PaginationControls } from "@/components/admin-user/pagination-controls"
import { GET_ADMIN_ACTIONS, GET_ADMIN_ACTION_NAMES } from "@/graphql/admin"
import { GET_USERS } from "@/graphql/user"
import { formatDateTime } from "@/lib/format"
import { currentLocale } from "@/lib/i18n"
import { adminActionDetails, adminActionLabel, adminTargetLabel, type AdminAction } from "@/lib/admin-actions"

const PAGE_SIZE = 25
const ALL = "all"

interface AdminActionsData {
  adminActions: { total: number; page: number; pageSize: number; items: AdminAction[] }
}

interface MemberOption {
  id: string
  first_name?: string | null
  last_name?: string | null
  email: string
}

const memberName = (member: MemberOption) =>
  `${member.last_name ?? ""} ${member.first_name ?? ""}`.trim() || member.email

export default function AdminActionsPage() {
  const { t } = useTranslation("administration")
  const [memberId, setMemberId] = useState(ALL)
  const [action, setAction] = useState(ALL)
  const [page, setPage] = useState(1)

  const { data, previousData, loading, error, refetch } = useQuery<AdminActionsData>(GET_ADMIN_ACTIONS, {
    variables: {
      memberId: memberId === ALL ? null : Number(memberId),
      action: action === ALL ? null : action,
      page,
      pageSize: PAGE_SIZE,
    },
    fetchPolicy: "cache-and-network",
  })
  // The filters are filled by the API: every member, and every action the log knows.
  const { data: membersData } = useQuery<{ getUsers: MemberOption[] }>(GET_USERS)
  const { data: namesData } = useQuery<{ adminActionNames: string[] }>(GET_ADMIN_ACTION_NAMES)

  const members = [...(membersData?.getUsers ?? [])].sort((a, b) =>
    memberName(a).localeCompare(memberName(b), currentLocale()),
  )
  const actionNames = [...(namesData?.adminActionNames ?? [])].sort((a, b) =>
    adminActionLabel(a).localeCompare(adminActionLabel(b), currentLocale()),
  )

  // Every filter change brings the list back to its first page.
  const withFirstPage = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }
  const hasFilters = memberId !== ALL || action !== ALL
  const resetFilters = () => {
    setMemberId(ALL)
    setAction(ALL)
    setPage(1)
  }

  // The page being left stays on screen while the next one loads.
  const shown = (data ?? previousData)?.adminActions
  const items = shown?.items ?? []

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={t("actionLog.title")} description={t("actionLog.description")} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={memberId} onValueChange={withFirstPage(setMemberId)}>
          <SelectTrigger className="sm:w-64" aria-label={t("actionLog.filters.member")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("actionLog.filters.allMembers")}</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={String(member.id)}>
                {memberName(member)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={withFirstPage(setAction)}>
          <SelectTrigger className="sm:w-72" aria-label={t("actionLog.filters.action")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("actionLog.filters.allActions")}</SelectItem>
            {actionNames.map((name) => (
              <SelectItem key={name} value={name}>
                {adminActionLabel(name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={resetFilters}>
            {t("common:actions.clearFilters")}
          </Button>
        )}
      </div>

      {!shown && loading ? (
        <Skeleton className="h-96 w-full" aria-busy="true" aria-label={t("actionLog.loading")} />
      ) : !shown && error ? (
        <ErrorState onRetry={() => refetch().catch(() => undefined)} />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("actionLog.table.date")}</TableHead>
                      <TableHead>{t("actionLog.table.actor")}</TableHead>
                      <TableHead>{t("actionLog.table.action")}</TableHead>
                      <TableHead>{t("actionLog.table.target")}</TableHead>
                      <TableHead>{t("actionLog.table.details")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length > 0 ? (
                      items.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {formatDateTime(entry.created_at)}
                          </TableCell>
                          <TableCell>{entry.actor_label || "—"}</TableCell>
                          <TableCell className="font-medium">{adminActionLabel(entry.action)}</TableCell>
                          <TableCell>{adminTargetLabel(entry)}</TableCell>
                          <TableCell className="max-w-md text-muted-foreground">
                            {adminActionDetails(entry.summary).map((line) => (
                              <span key={line} className="block break-words">
                                {line}
                              </span>
                            ))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="p-4">
                          {hasFilters ? (
                            <EmptyState
                              icon={Search}
                              title={t("actionLog.noMatch.title")}
                              description={t("actionLog.noMatch.description")}
                              action={
                                <Button variant="outline" onClick={resetFilters}>
                                  {t("common:actions.clearFilters")}
                                </Button>
                              }
                              className="border-0"
                            />
                          ) : (
                            <EmptyState
                              icon={ClipboardList}
                              title={t("actionLog.empty.title")}
                              description={t("actionLog.empty.description")}
                              className="border-0"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <PaginationControls
            currentPage={shown?.page ?? page}
            totalItems={shown?.total ?? 0}
            itemsPerPage={shown?.pageSize ?? PAGE_SIZE}
            onPageChange={setPage}
            itemLabel={t("actionLog.pagination.actions", { count: shown?.total ?? 0 })}
          />
        </>
      )}
    </div>
  )
}
