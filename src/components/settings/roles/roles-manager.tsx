"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { Plus, UserCog } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE, GET_ROLES } from "@/graphql/roles"
import { ROLE_ADMIN, ROLE_INSTRUCTOR } from "@/lib/roles"
import { SettingsSection } from "../settings-field"
import { DeleteItemDialog, ItemList, NameDialog } from "../item-list"

interface Role {
  id: string
  role_name: string
}

// The application recognises these two roles by their name.
const isBuiltInRole = (role: Role) => role.role_name === ROLE_ADMIN || role.role_name === ROLE_INSTRUCTOR

const BUILT_IN_NOTICE =
  "L'application reconnaît ce rôle à son nom : le renommer ou le supprimer peut retirer leurs accès aux membres concernés."

export function RoleManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  // Kept after closing so the dialog text does not change while it fades out.
  const [lastRoleToDelete, setLastRoleToDelete] = useState<Role | null>(null)
  const [mutationInProgress, setMutationInProgress] = useState(false)

  const { data, loading, error, refetch } = useQuery<{ roles: Role[] }>(GET_ROLES)
  const roles = data?.roles ?? []
  const roleNames = roles.map((role) => role.role_name)

  const [createRole] = useMutation(CREATE_ROLE)
  const [updateRole] = useMutation(UPDATE_ROLE)
  const [deleteRole] = useMutation(DELETE_ROLE)

  const handleCreateRole = async (role_name: string) => {
    setMutationInProgress(true)
    try {
      await createRole({ variables: { createRoleInput: { role_name } } })
      toast({ title: "Rôle créé", description: `Le rôle « ${role_name} » a été ajouté.` })
      setIsCreateDialogOpen(false)
      await refetch()
    } catch {
      toast({
        title: "Création impossible",
        description: "Le rôle n'a pas pu être créé. Réessayez.",
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
      toast({ title: "Rôle modifié", description: `Le rôle s'appelle maintenant « ${role_name} ».` })
      setRoleToEdit(null)
      await refetch()
    } catch {
      toast({
        title: "Modification impossible",
        description: "Le rôle n'a pas pu être renommé. Réessayez.",
        variant: "destructive",
      })
    }
    setMutationInProgress(false)
  }

  const handleDeleteRole = async () => {
    if (!roleToDelete) return

    setMutationInProgress(true)
    try {
      await deleteRole({ variables: { id: roleToDelete.id } })
      toast({ title: "Rôle supprimé", description: `Le rôle « ${roleToDelete.role_name} » a été supprimé.` })
      setRoleToDelete(null)
      await refetch()
    } catch {
      toast({
        title: "Suppression impossible",
        description: "Le rôle n'a pas pu être supprimé. Vérifiez qu'aucun membre ne l'utilise encore.",
        variant: "destructive",
      })
    }
    setMutationInProgress(false)
  }

  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      Ajouter un rôle
    </Button>
  )

  return (
    <SettingsSection
      title="Rôles"
      description="Les rôles que l'on peut attribuer aux membres. Chaque ajout, modification ou suppression est enregistré immédiatement."
      action={!error && !loading && roles.length > 0 ? addButton : undefined}
    >
      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="Aucun rôle"
          description="Créez un premier rôle pour pouvoir l'attribuer aux membres."
          action={addButton}
        />
      ) : (
        <ItemList
          items={roles.map((role) => ({
            key: String(role.id),
            name: role.role_name,
            meta: isBuiltInRole(role) ? <Badge variant="neutral">Rôle de l'application</Badge> : undefined,
          }))}
          onEdit={(item) => setRoleToEdit(roles.find((role) => String(role.id) === item.key) ?? null)}
          onDelete={(item) => {
            const role = roles.find((candidate) => String(candidate.id) === item.key) ?? null
            setRoleToDelete(role)
            setLastRoleToDelete(role)
          }}
        />
      )}

      <NameDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title="Ajouter un rôle"
        description="Le rôle pourra ensuite être attribué aux membres."
        label="Nom du rôle"
        placeholder="Ex. Mécanicien"
        submitLabel="Créer le rôle"
        existingNames={roleNames}
        duplicateMessage="Un rôle porte déjà ce nom."
        isSubmitting={mutationInProgress}
        onSubmit={handleCreateRole}
      />

      <NameDialog
        open={roleToEdit !== null}
        onOpenChange={(open) => !open && setRoleToEdit(null)}
        title="Modifier le rôle"
        description="Le nouveau nom s'applique à tous les membres qui ont ce rôle."
        label="Nom du rôle"
        placeholder="Ex. Mécanicien"
        initialValue={roleToEdit?.role_name ?? ""}
        submitLabel="Enregistrer"
        existingNames={roleNames}
        duplicateMessage="Un rôle porte déjà ce nom."
        isSubmitting={mutationInProgress}
        notice={
          roleToEdit && isBuiltInRole(roleToEdit) ? (
            <p className="rounded-md bg-warning/15 p-3 text-sm text-warning">{BUILT_IN_NOTICE}</p>
          ) : undefined
        }
        onSubmit={handleUpdateRole}
      />

      <DeleteItemDialog
        open={roleToDelete !== null}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
        title="Supprimer ce rôle ?"
        description={
          <>
            Le rôle « {(roleToDelete ?? lastRoleToDelete)?.role_name} » sera supprimé définitivement.
            {roleToDelete && isBuiltInRole(roleToDelete) && <> {BUILT_IN_NOTICE}</>}
          </>
        }
        isDeleting={mutationInProgress}
        onConfirm={handleDeleteRole}
      />
    </SettingsSection>
  )
}
