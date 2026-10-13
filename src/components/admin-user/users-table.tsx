"use client"
import { useTranslation } from "react-i18next"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BadgeCheck, Eye, MailPlus, MoreHorizontal, Pencil, Trash2, UserCheck, UserX, Users } from "lucide-react"
import { EmptyState } from "@/components/layout/EmptyState"
import { formatDate } from "@/lib/format"
import { roleLabel } from "@/lib/settings"
import type { User } from "@/interfaces/user"

interface UsersTableProps {
  users: User[]
  loading: boolean
  /** True when a search or a filter is narrowing the list. */
  filtered?: boolean
  onEdit: (user: User) => void
  onViewDetails: (userId: string) => void
  onAddLicense?: (userId: string) => void
  onResetFilters?: () => void
  /** Deactivate (false) or reactivate (true) the account. */
  onSetActive?: (user: User, active: boolean) => void
  onResendInvitation?: (user: User) => void
  onDelete?: (user: User) => void
}

// The API only says "false" for a deactivated account.
const isDeactivated = (user: User) => user.is_active === false

function AccountBadge({ user }: { user: User }) {
  const { t } = useTranslation("administration")
  if (isDeactivated(user)) return <Badge variant="neutral">{t("users.account.inactive")}</Badge>
  return user.isEmailConfirmed ? (
    <Badge variant="success">{t("users.account.active")}</Badge>
  ) : (
    <Badge variant="warning">{t("users.account.pending")}</Badge>
  )
}

const getInitials = (firstName: string, lastName: string) =>
  `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?"

export function UsersTable({
  users,
  loading,
  filtered = false,
  onEdit,
  onViewDetails,
  onAddLicense,
  onResetFilters,
  onSetActive,
  onResendInvitation,
  onDelete,
}: UsersTableProps) {
  const { t } = useTranslation("administration")
  if (loading) {
    return (
      <Card className="divide-y overflow-hidden">
        <Skeleton className="h-11 w-full rounded-none" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="hidden h-5 w-24 md:block" />
          </div>
        ))}
      </Card>
    )
  }

  if (users.length === 0) {
    return filtered ? (
      <EmptyState
        icon={Users}
        title={t("users.table.noMatch.title")}
        description={t("users.table.noMatch.description")}
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              {t("users.table.resetFilters")}
            </Button>
          )
        }
      />
    ) : (
      <EmptyState
        icon={Users}
        title={t("users.table.empty.title")}
        description={t("users.table.empty.description")}
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("users.table.member")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("users.fields.dateOfBirth")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("users.fields.role")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("users.table.account")}</TableHead>
            <TableHead className="hidden lg:table-cell">{t("users.table.twoFactor")}</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">{t("common:labels.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email
            return (
              <TableRow
                key={user.id}
                className={isDeactivated(user) ? "cursor-pointer text-muted-foreground" : "cursor-pointer"}
                onClick={() => onViewDetails(user.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">
                        {getInitials(user.first_name || "", user.last_name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      <div className="mt-1 flex flex-wrap gap-1 md:hidden">
                        <Badge variant="neutral">{roleLabel(user.role?.role_name) ?? t("users.noRole")}</Badge>
                        {(isDeactivated(user) || !user.isEmailConfirmed) && <AccountBadge user={user} />}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap lg:table-cell">
                  {formatDate(user.date_of_birth)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.role ? (
                    <Badge variant="outline">{roleLabel(user.role.role_name)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">{t("users.noRole")}</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <AccountBadge user={user} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {user.is2FAEnabled ? (
                    <Badge variant="success">{t("users.twoFactor.enabled")}</Badge>
                  ) : (
                    <Badge variant="neutral">{t("users.twoFactor.disabled")}</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("users.table.actionsFor", { name: fullName })}
                        title={t("common:labels.actions")}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                        <Eye className="h-4 w-4" />
                        {t("users.table.viewDetails")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="h-4 w-4" />
                        {t("common:actions.edit")}
                      </DropdownMenuItem>
                      {onAddLicense && (
                        <DropdownMenuItem onClick={() => onAddLicense(user.id)}>
                          <BadgeCheck className="h-4 w-4" />
                          {t("users.licence.add")}
                        </DropdownMenuItem>
                      )}
                      {onResendInvitation && !user.isEmailConfirmed && !isDeactivated(user) && (
                        <DropdownMenuItem onClick={() => onResendInvitation(user)}>
                          <MailPlus className="h-4 w-4" />
                          {t("users.accountActions.resendInvitation")}
                        </DropdownMenuItem>
                      )}
                      {(onSetActive || onDelete) && <DropdownMenuSeparator />}
                      {onSetActive &&
                        (isDeactivated(user) ? (
                          <DropdownMenuItem onClick={() => onSetActive(user, true)}>
                            <UserCheck className="h-4 w-4" />
                            {t("users.accountActions.reactivate")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => onSetActive(user, false)}>
                            <UserX className="h-4 w-4" />
                            {t("users.accountActions.deactivate")}
                          </DropdownMenuItem>
                        ))}
                      {onDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {t("users.accountActions.delete")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </Card>
  )
}
