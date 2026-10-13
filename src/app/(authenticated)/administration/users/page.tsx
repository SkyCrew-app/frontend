"use client"

import { useState } from "react"
import { useQuery, useMutation, useLazyQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/hooks/use-toast"
import {
  CREATE_USER,
  DELETE_USER,
  GET_USERS,
  GET_USER_DETAILS,
  RESEND_INVITATION,
  SET_USER_ACTIVE,
  UPDATE_USER,
} from "@/graphql/user"
import { CREATE_LICENSE } from "@/graphql/licences"
import { GET_ROLES } from "@/graphql/roles"
import type { User, Role, UserDetails } from "@/interfaces/user"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import { UsersTable } from "@/components/admin-user/users-table"
import { CreateUserForm } from "@/components/admin-user/create-user-form"
import { EditUserForm } from "@/components/admin-user/edit-user-form"
import { AddLicenseForm, type LicenseFormValues } from "@/components/admin-user/add-license-form"
import { UserDetailsDialog } from "@/components/admin-user/user-details"
import { UserFilters } from "@/components/admin-user/user-filters"
import { PaginationControls } from "@/components/admin-user/pagination-controls"
import { AccountConfirmDialog } from "@/components/admin-user/account-confirm-dialog"
import { calendarDayToISOString } from "@/lib/datetime"
import { apiErrorMessage } from "@/lib/api-error"

const USERS_PER_PAGE = 10

const nameOf = (user: User) => `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || user.email

export default function AdministrationPage() {
  const { t } = useTranslation("administration")
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [isLicenseDialogOpen, setIsLicenseDialogOpen] = useState(false)
  const [licenseUserId, setLicenseUserId] = useState<string | null>(null)
  // Set when the licence dialog was opened from a member sheet, to come back to it.
  const [returnToDetails, setReturnToDetails] = useState(false)
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterRole, setFilterRole] = useState<string | null>(null)
  const [filterConfirmed, setFilterConfirmed] = useState<boolean | null>(null)
  const [filter2FA, setFilter2FA] = useState<boolean | null>(null)
  // The member whose deactivation or deletion is waiting for a confirmation.
  const [accountAction, setAccountAction] = useState<{ kind: "deactivate" | "delete"; user: User } | null>(null)
  // Kept after closing so the dialog text does not change while it fades out.
  const [lastAccountAction, setLastAccountAction] = useState(accountAction)

  const { toast } = useToast()

  const { loading, error, data, refetch } = useQuery<{ getUsers: User[] }>(GET_USERS, {
    fetchPolicy: "cache-and-network",
  })
  const { data: rolesData } = useQuery<{ roles: Role[] }>(GET_ROLES)

  const users: User[] = data?.getUsers ?? []
  const roles: Role[] = rolesData?.roles ?? []

  const [createUser, { loading: creating }] = useMutation(CREATE_USER)
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER)
  const [onAddLicense, { loading: addingLicense }] = useMutation(CREATE_LICENSE)
  const [setUserActive, { loading: settingActive }] = useMutation(SET_USER_ACTIVE)
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER)
  const [resendInvitation] = useMutation(RESEND_INVITATION)
  const [getUserDetails] = useLazyQuery<{ getUserDetails: UserDetails }>(GET_USER_DETAILS, {
    fetchPolicy: "network-only",
  })

  const handleCreateUser = async (userData: {
    first_name: string
    last_name: string
    email: string
    date_of_birth: string
    roleId?: number
  }) => {
    try {
      await createUser({ variables: userData })
      toast({
        title: t("users.toast.created.title"),
        description: t("users.toast.created.description"),
      })
      setIsCreateDialogOpen(false)
      refetch()
    } catch (error) {
      toast({
        title: t("users.toast.createFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.createFailed.description"),
        variant: "destructive",
      })
    }
  }

  const handleUpdateUser = async (userData: {
    first_name: string
    last_name: string
    email: string
    date_of_birth: string
    phone_number: string
  }) => {
    try {
      await updateUser({
        variables: {
          updateUserInput: {
            ...userData,
            // An empty date input is not a date: leave the field out.
            date_of_birth: userData.date_of_birth || undefined,
            roleId: selectedRole ? Number(selectedRole) : null,
          },
        },
      })
      toast({ title: t("users.toast.updated.title") })
      setIsEditDialogOpen(false)
      refetch()
    } catch (error) {
      // The API says why when a rule refuses the change (last administrator…).
      toast({
        title: t("users.toast.updateFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
    }
  }

  const applySetActive = async (user: User, active: boolean) => {
    try {
      await setUserActive({ variables: { id: Number(user.id), active } })
      toast({
        title: t(active ? "users.toast.reactivated.title" : "users.toast.deactivated.title"),
        description: t(active ? "users.toast.reactivated.description" : "users.toast.deactivated.description", {
          name: nameOf(user),
        }),
      })
      setAccountAction(null)
      refetch()
    } catch (error) {
      toast({
        title: t("users.toast.accountFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
    }
  }

  // Deactivating closes the member's sessions: it is confirmed first. Reactivating is not.
  const handleSetActive = (user: User, active: boolean) => {
    if (active) {
      void applySetActive(user, true)
      return
    }
    setAccountAction({ kind: "deactivate", user })
    setLastAccountAction({ kind: "deactivate", user })
  }

  const handleAskDelete = (user: User) => {
    setAccountAction({ kind: "delete", user })
    setLastAccountAction({ kind: "delete", user })
  }

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUser({ variables: { id: Number(user.id) } })
      toast({ title: t("users.toast.deleted.title") })
      setAccountAction(null)
      refetch()
    } catch (error) {
      // Typically: the member has a history and must be deactivated instead.
      toast({
        title: t("users.toast.deleteFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
      setAccountAction(null)
    }
  }

  const handleResendInvitation = async (user: User) => {
    try {
      await resendInvitation({ variables: { id: Number(user.id) } })
      toast({
        title: t("users.toast.invitationSent.title"),
        description: t("users.toast.invitationSent.description", { name: nameOf(user) }),
      })
    } catch (error) {
      toast({
        title: t("users.toast.invitationFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
    }
  }

  const confirmAccountAction = () => {
    if (!accountAction) return
    if (accountAction.kind === "delete") void handleDeleteUser(accountAction.user)
    else void applySetActive(accountAction.user, false)
  }

  const loadUserDetails = async (userId: string) => {
    const result = await getUserDetails({ variables: { id: Number.parseInt(userId) } })
    if (result.data?.getUserDetails) {
      setSelectedUserDetails(result.data.getUserDetails)
      return
    }
    setIsDetailsDialogOpen(false)
    toast({
      title: t("users.toast.detailsFailed.title"),
      description: t("users.toast.retryLater"),
      variant: "destructive",
    })
  }

  // The dialog opens at once with a skeleton, then fills in.
  const handleViewDetails = (userId: string) => {
    setSelectedUserDetails(null)
    setIsDetailsDialogOpen(true)
    void loadUserDetails(userId)
  }

  const handleSubmitLicense = async (values: LicenseFormValues) => {
    try {
      await onAddLicense({
        variables: {
          createLicenseInput: {
            user_id: Number.parseInt(values.userId),
            license_type: values.license_type,
            license_number: values.license_number,
            expiration_date: calendarDayToISOString(values.expirationDate),
            issue_date: calendarDayToISOString(values.issueDate),
            certification_authority: values.certification_authority || null,
            status: values.status || "active",
          },
          documents: values.documents.length > 0 ? values.documents : null,
        },
      })
      toast({ title: t("users.toast.licenceAdded.title") })
      setIsLicenseDialogOpen(false)
      if (returnToDetails) handleViewDetails(values.userId)
    } catch {
      toast({
        title: t("users.toast.licenceFailed.title"),
        description: t("users.toast.licenceFailed.description"),
        variant: "destructive",
      })
    }
  }

  const search = searchTerm.trim().toLowerCase()
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      search === "" ||
      `${user.first_name ?? ""} ${user.last_name ?? ""}`.toLowerCase().includes(search) ||
      `${user.last_name ?? ""} ${user.first_name ?? ""}`.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)

    const matchesRole = filterRole === null || user.role?.id.toString() === filterRole
    const matchesConfirmed = filterConfirmed === null || user.isEmailConfirmed === filterConfirmed
    const matches2FA = filter2FA === null || user.is2FAEnabled === filter2FA

    return matchesSearch && matchesRole && matchesConfirmed && matches2FA
  })

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE))
  // A narrower filter or a refreshed list can leave the current page out of range.
  const page = Math.min(currentPage, totalPages)
  const currentUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE)
  const hasFilters = search !== "" || filterRole !== null || filterConfirmed !== null || filter2FA !== null

  // Any change of filter goes back to the first page.
  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setCurrentPage(1)
    }

  const resetFilters = () => {
    setFilterRole(null)
    setFilterConfirmed(null)
    setFilter2FA(null)
    setSearchTerm("")
    setCurrentPage(1)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setSelectedRole(user.role?.id.toString() || null)
    setIsEditDialogOpen(true)
  }

  const handleEditFromDetails = (userId: string) => {
    const user = users.find((candidate) => candidate.id === userId)
    if (!user) return
    setIsDetailsDialogOpen(false)
    handleEditUser(user)
  }

  const openLicenseDialog = (userId: string | null) => {
    setLicenseUserId(userId)
    setReturnToDetails(false)
    setIsLicenseDialogOpen(true)
  }

  // One dialog at a time: the sheet closes, and reopens once the licence is saved.
  const openLicenseFromDetails = (userId: string) => {
    setIsDetailsDialogOpen(false)
    setLicenseUserId(userId)
    setReturnToDetails(true)
    setIsLicenseDialogOpen(true)
  }

  const failed = Boolean(error) && users.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("users.title")}
        description={t("users.description")}
        className="mb-0"
        actions={
          <>
            <AddLicenseForm
              isOpen={isLicenseDialogOpen}
              onOpenChange={(open) => (open ? openLicenseDialog(null) : setIsLicenseDialogOpen(false))}
              users={users}
              loading={loading}
              defaultUserId={licenseUserId}
              saving={addingLicense}
              onSubmit={handleSubmitLicense}
            />
            <CreateUserForm
              isOpen={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
              saving={creating}
              roles={roles}
              onSubmit={handleCreateUser}
            />
          </>
        }
      />

      {failed ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <UserFilters
            searchTerm={searchTerm}
            setSearchTerm={withPageReset(setSearchTerm)}
            filterRole={filterRole}
            setFilterRole={withPageReset(setFilterRole)}
            filterConfirmed={filterConfirmed}
            setFilterConfirmed={withPageReset(setFilterConfirmed)}
            filter2FA={filter2FA}
            setFilter2FA={withPageReset(setFilter2FA)}
            resetFilters={resetFilters}
            roles={roles}
          />

          <UsersTable
            users={currentUsers}
            loading={loading && users.length === 0}
            filtered={hasFilters}
            onEdit={handleEditUser}
            onViewDetails={handleViewDetails}
            onAddLicense={openLicenseDialog}
            onResetFilters={resetFilters}
            onSetActive={handleSetActive}
            onResendInvitation={handleResendInvitation}
            onDelete={handleAskDelete}
          />

          <PaginationControls
            currentPage={page}
            totalItems={filteredUsers.length}
            itemsPerPage={USERS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemLabel={t("users.pagination.members", { count: filteredUsers.length })}
          />
        </>
      )}

      <EditUserForm
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        roles={roles}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        saving={updating}
        onSubmit={handleUpdateUser}
      />

      {lastAccountAction && (
        <AccountConfirmDialog
          open={accountAction !== null}
          onOpenChange={(open) => !open && setAccountAction(null)}
          title={t(`users.accountActions.${lastAccountAction.kind}Confirm.title`, {
            name: nameOf(lastAccountAction.user),
          })}
          description={t(`users.accountActions.${lastAccountAction.kind}Confirm.description`)}
          confirmLabel={t(`users.accountActions.${lastAccountAction.kind}Confirm.confirm`)}
          pending={settingActive || deleting}
          onConfirm={confirmAccountAction}
        />
      )}

      <UserDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        userDetails={selectedUserDetails}
        onEdit={handleEditFromDetails}
        onAddLicense={openLicenseFromDetails}
        onBalanceAdjusted={(userId) => void loadUserDetails(userId)}
      />
    </div>
  )
}
