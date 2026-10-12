"use client"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BadgeCheck, Eye, MoreHorizontal, Pencil, Users } from "lucide-react"
import { EmptyState } from "@/components/layout/EmptyState"
import { formatDate } from "@/lib/format"
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
}: UsersTableProps) {
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
        title="Aucun membre ne correspond"
        description="Modifiez la recherche ou les filtres pour élargir la liste."
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              Réinitialiser les filtres
            </Button>
          )
        }
      />
    ) : (
      <EmptyState
        icon={Users}
        title="Aucun membre pour le moment"
        description="Ajoutez un premier membre : il recevra un e-mail pour activer son compte."
      />
    )
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membre</TableHead>
            <TableHead className="hidden lg:table-cell">Date de naissance</TableHead>
            <TableHead className="hidden md:table-cell">Rôle</TableHead>
            <TableHead className="hidden md:table-cell">Compte</TableHead>
            <TableHead className="hidden lg:table-cell">2FA</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email
            return (
              <TableRow
                key={user.id}
                className="cursor-pointer"
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
                        <Badge variant="neutral">{user.role?.role_name ?? "Aucun rôle"}</Badge>
                        {!user.isEmailConfirmed && <Badge variant="warning">Invitation en attente</Badge>}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap lg:table-cell">
                  {formatDate(user.date_of_birth)}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.role ? (
                    <Badge variant="outline">{user.role.role_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Aucun rôle</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {user.isEmailConfirmed ? (
                    <Badge variant="success">Activé</Badge>
                  ) : (
                    <Badge variant="warning">Invitation en attente</Badge>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {user.is2FAEnabled ? (
                    <Badge variant="success">Activée</Badge>
                  ) : (
                    <Badge variant="neutral">Désactivée</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions pour ${fullName}`} title="Actions">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir la fiche
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(user)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      {onAddLicense && (
                        <DropdownMenuItem onClick={() => onAddLicense(user.id)}>
                          <BadgeCheck className="mr-2 h-4 w-4" />
                          Ajouter une licence
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
