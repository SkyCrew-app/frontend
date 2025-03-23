"use client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Edit, Eye, MoreHorizontal } from "lucide-react"
import type { User } from "@/interfaces/user"

interface UsersTableProps {
  users: User[]
  loading: boolean
  onEdit: (user: User) => void
  onViewDetails: (userId: string) => void
}

export function UsersTable({ users, loading, onEdit, onViewDetails }: UsersTableProps) {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Utilisateur</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Date de naissance</TableHead>
              <TableHead className="hidden md:table-cell">Rôle</TableHead>
              <TableHead className="hidden md:table-cell">2FA</TableHead>
              <TableHead className="hidden md:table-cell">Email confirmé</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.first_name || "", user.last_name || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{`${user.first_name} ${user.last_name}`}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {new Date(user.date_of_birth).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.role ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {user.role.role_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">
                        Aucun rôle
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.is2FAEnabled ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Activé
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Désactivé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.isEmailConfirmed ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Confirmé
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        En attente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewDetails(user.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
