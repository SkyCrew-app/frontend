"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Plus, UserCog } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { CREATE_ROLE, UPDATE_ROLE, DELETE_ROLE, GET_ROLES } from "@/graphql/roles"
import { BUILT_IN_ROLES } from "@/lib/roles"
import { apiErrorMessage } from "@/lib/api-error"
import { roleLabel } from "@/lib/settings"
import { SettingsSection } from "../settings-field"
import { DeleteItemDialog, ItemList, NameDialog } from "../item-list"

interface Role {
  id: string
  role_name: string
}

// The application recognises these roles by their name: the API refuses to rename or delete them.
const isBuiltInRole = (role: Role) => BUILT_IN_ROLES.includes(role.role_name)

export function RoleManager() {
  const { t } = useTranslation("administration")
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
      toast({
        title: t("settings.roles.toast.created.title"),
        description: t("settings.roles.toast.created.description", { name: role_name }),
      })
      setIsCreateDialogOpen(false)
      await refetch()
    } catch (error) {
      toast({
        title: t("settings.roles.toast.createFailed.title"),
        description: apiErrorMessage(error) ?? t("settings.roles.toast.createFailed.description"),
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
      toast({
        title: t("settings.roles.toast.updated.title"),
        description: t("settings.roles.toast.updated.description", { name: role_name }),
      })
      setRoleToEdit(null)
      await refetch()
    } catch (error) {
      toast({
        title: t("settings.roles.toast.updateFailed.title"),
        description: apiErrorMessage(error) ?? t("settings.roles.toast.updateFailed.description"),
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
      toast({
        title: t("settings.roles.toast.deleted.title"),
        description: t("settings.roles.toast.deleted.description", { name: roleLabel(roleToDelete.role_name) }),
      })
      setRoleToDelete(null)
      await refetch()
    } catch (error) {
      toast({
        title: t("settings.roles.toast.deleteFailed.title"),
        description: apiErrorMessage(error) ?? t("settings.roles.toast.deleteFailed.description"),
        variant: "destructive",
      })
    }
    setMutationInProgress(false)
  }

  const addButton = (
    <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      {t("settings.roles.add")}
    </Button>
  )

  return (
    <SettingsSection
      title={t("settings.roles.title")}
      description={t("settings.roles.description")}
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
          title={t("settings.roles.empty.title")}
          description={t("settings.roles.empty.description")}
          action={addButton}
        />
      ) : (
        <ItemList
          items={roles.map((role) => ({
            key: String(role.id),
            name: roleLabel(role.role_name),
            meta: isBuiltInRole(role) ? <Badge variant="neutral">{t("settings.roles.builtIn")}</Badge> : undefined,
            locked: isBuiltInRole(role),
          }))}
          onEdit={(item) => setRoleToEdit(roles.find((role) => String(role.id) === item.key) ?? null)}
          onDelete={(item) => {
            const role = roles.find((candidate) => String(candidate.id) === item.key) ?? null
            setRoleToDelete(role)
            setLastRoleToDelete(role)
          }}
        />
      )}

      {roles.some(isBuiltInRole) && (
        <p className="text-sm text-muted-foreground">{t("settings.roles.builtInHint")}</p>
      )}

      <NameDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        title={t("settings.roles.add")}
        description={t("settings.roles.addDescription")}
        label={t("settings.roles.name")}
        placeholder={t("settings.roles.namePlaceholder")}
        submitLabel={t("settings.roles.create")}
        existingNames={roleNames}
        duplicateMessage={t("settings.roles.duplicate")}
        isSubmitting={mutationInProgress}
        onSubmit={handleCreateRole}
      />

      <NameDialog
        open={roleToEdit !== null}
        onOpenChange={(open) => !open && setRoleToEdit(null)}
        title={t("settings.roles.edit")}
        description={t("settings.roles.editDescription")}
        label={t("settings.roles.name")}
        placeholder={t("settings.roles.namePlaceholder")}
        initialValue={roleToEdit?.role_name ?? ""}
        submitLabel={t("common:actions.save")}
        existingNames={roleNames}
        duplicateMessage={t("settings.roles.duplicate")}
        isSubmitting={mutationInProgress}
        onSubmit={handleUpdateRole}
      />

      <DeleteItemDialog
        open={roleToDelete !== null}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
        title={t("settings.roles.deleteTitle")}
        description={t("settings.roles.deleteDescription", {
          name: roleLabel((roleToDelete ?? lastRoleToDelete)?.role_name),
        })}
        isDeleting={mutationInProgress}
        onConfirm={handleDeleteRole}
      />
    </SettingsSection>
  )
}
