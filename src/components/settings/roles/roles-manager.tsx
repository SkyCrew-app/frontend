"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { PlusCircle, UserCog } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/hooks/use-toast"
import { CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE, GET_ROLES } from "@/graphql/roles"
import { RoleForm } from "./role-form"
import { RoleActions } from "./role-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

interface Role {
  id: string
  role_name: string
}

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([])
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [mutationInProgress, setMutationInProgress] = useState(false)

  const { loading, error, refetch } = useQuery(GET_ROLES, {
    onCompleted: (data) => setRoles(data.roles),
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de charger les rôles.",
        variant: "destructive",
      })
    },
  })

  const [createRole] = useMutation(CREATE_ROLE)
  const [updateRole] = useMutation(UPDATE_ROLE)
  const [deleteRole] = useMutation(DELETE_ROLE)

  const handleCreateRole = async (role_name: string) => {
    setMutationInProgress(true)
    try {
      await createRole({ variables: { createRoleInput: { role_name } } })
      toast({ title: "Rôle créé", description: "Le nouveau rôle a été créé avec succès." })
      setIsCreateDialogOpen(false)
      await refetch()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du rôle.",
        variant: "destructive",
      })
    }
    setMutationInProgress(false)
  }

  const handleUpdateRole = async (role_name: string) => {
    if (!roleToEdit) return

    setMutationInProgress(true)
    try {
      await updateRole({
        variables: { updateRoleInput: { id: roleToEdit.id, role_name } },
      })
      toast({ title: "Rôle mis à jour", description: "Le rôle a été modifié avec succès." })
      setIsEditDialogOpen(false)
      setRoleToEdit(null)
      await refetch()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour du rôle.",
        variant: "destructive",
      })
    }
    setMutationInProgress(false)
  }

  const handleDeleteRole = async (role: Role) => {
    setMutationInProgress(true)
    try {
      await deleteRole({ variables: { id: role.id } })
      toast({ title: "Rôle supprimé", description: "Le rôle a été supprimé avec succès." })
      await refetch()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du rôle.",
        variant: "destructive",
      })
    }
    setMutationInProgress(false)
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-md">
        Une erreur est survenue lors du chargement des rôles.
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="border-t-4 border-t-blue-500 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-500" />
            Gestion des rôles
          </CardTitle>
          <CardDescription>Configurez les rôles des utilisateurs de l'aéroclub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mutationInProgress && <Progress value={50} className="animate-pulse" />}

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Liste des rôles</h3>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter un rôle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un rôle</DialogTitle>
                </DialogHeader>
                <RoleForm onSubmit={handleCreateRole} isSubmitting={mutationInProgress} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Nom du rôle</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array(3)
                      .fill(0)
                      .map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-6 w-3/4" />
                          </TableCell>
                          <TableCell className="flex justify-end space-x-2">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </TableCell>
                        </TableRow>
                      ))
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                        Aucun rôle trouvé. Créez votre premier rôle en cliquant sur "Ajouter un rôle".
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id} className="hover:bg-blue-50/30">
                        <TableCell className="font-medium">{role.role_name}</TableCell>
                        <TableCell>
                          <RoleActions
                            role={role}
                            onEdit={(role) => {
                              setRoleToEdit(role)
                              setIsEditDialogOpen(true)
                            }}
                            onDelete={handleDeleteRole}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Dialog pour éditer un rôle */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le rôle</DialogTitle>
              </DialogHeader>
              {roleToEdit && (
                <RoleForm
                  defaultValue={roleToEdit.role_name}
                  onSubmit={handleUpdateRole}
                  isSubmitting={mutationInProgress}
                />
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </motion.div>
  )
}
