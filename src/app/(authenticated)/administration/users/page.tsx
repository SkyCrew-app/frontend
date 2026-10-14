"use client"

import { useState } from "react"
import { useQuery, useMutation, useLazyQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { useToast } from "@/components/hooks/use-toast"
import {
  CREATE_USER,
  DEACTIVATE_MEMBER,
  DELETE_USER,
  GET_USERS,
  GET_USER_DETAILS,
  RESEND_INVITATION,
  SET_USER_ACTIVE,
  UPDATE_USER,
} from "@/graphql/user"
import { CREATE_LICENSE, DELETE_LICENSE, GET_PENDING_LICENSES, UPDATE_LICENSE, VALIDATE_LICENSE } from "@/graphql/licences"
import { GET_ROLES } from "@/graphql/roles"
import type { License, User, Role, UserDetails } from "@/interfaces/user"
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
import { DeactivateMemberDialog } from "@/components/admin-user/deactivate-member-dialog"
import { PendingLicencesNotice, type PendingLicence } from "@/components/admin-user/pending-licences-notice"
import { formatMoney } from "@/lib/format"
import { calendarDayToISOString } from "@/lib/datetime"
import { apiErrorMessage, apiRefusalMessage } from "@/lib/api-error"

const USERS_PER_PAGE = 10

interface MemberFormValues {
  first_name: string
  last_name: string
  email: string
  date_of_birth: string
  phone_number: string
}

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
  // The member sheet opens on its licences when it is opened to validate one.
  const [detailsTab, setDetailsTab] = useState<"personal-info" | "licenses">("personal-info")
  const [validatingLicenseId, setValidatingLicenseId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [filterRole, setFilterRole] = useState<string | null>(null)
  const [filterConfirmed, setFilterConfirmed] = useState<boolean | null>(null)
  const [filter2FA, setFilter2FA] = useState<boolean | null>(null)
  // The member whose deactivation or deletion is waiting for a confirmation.
  const [accountAction, setAccountAction] = useState<{ kind: "deactivate" | "delete"; user: User } | null>(null)
  // Kept after closing so the dialog text does not change while it fades out.
  const [lastAccountAction, setLastAccountAction] = useState(accountAction)
  // A licence being corrected or renewed (in the licence panel), or waiting for its deletion to be confirmed.
  const [licenseChange, setLicenseChange] = useState<{
    action: "edit" | "renew" | "delete"
    license: License
    userId: string
  } | null>(null)
  const [lastLicenseChange, setLastLicenseChange] = useState(licenseChange)
  // A role change the API refused because the member still instructs: what it listed.
  const [roleChange, setRoleChange] = useState<{
    userData: MemberFormValues
    message: string
  } | null>(null)

  const { toast } = useToast()

  const { loading, error, data, refetch } = useQuery<{ getUsers: User[] }>(GET_USERS, {
    fetchPolicy: "cache-and-network",
  })
  const { data: rolesData } = useQuery<{ roles: Role[] }>(GET_ROLES)
  const { data: licencesData, refetch: refetchPendingLicences } = useQuery<{ getAllLicenses: PendingLicence[] }>(
    GET_PENDING_LICENSES,
    { fetchPolicy: "cache-and-network" },
  )
  const pendingLicences = (licencesData?.getAllLicenses ?? []).filter(
    (licence) => (licence.status ?? "").toLowerCase() === "pending",
  )

  const users: User[] = data?.getUsers ?? []
  const roles: Role[] = rolesData?.roles ?? []

  const [createUser, { loading: creating }] = useMutation(CREATE_USER)
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER)
  // The count of licences waiting for a validation follows every change of a licence.
  const licenceChanged = { refetchQueries: ["GetPendingLicenses"] }
  const [onAddLicense, { loading: addingLicense }] = useMutation(CREATE_LICENSE, licenceChanged)
  const [updateLicense, { loading: updatingLicense }] = useMutation(UPDATE_LICENSE, licenceChanged)
  const [deleteLicense, { loading: deletingLicense }] = useMutation(DELETE_LICENSE, licenceChanged)
  const [validateLicense] = useMutation(VALIDATE_LICENSE)
  const [setUserActive] = useMutation(SET_USER_ACTIVE)
  const [deactivateMember, { loading: deactivating }] = useMutation<{
    deactivateMember: {
      cancelledReservations: number
      refundedAmount: number
      keptReservationIds: number[]
      upcomingInstructionReservations: number
      cancelledInstructionReservations: number
      refundedToStudents: number
      upcomingCourses: number
    }
  }>(DEACTIVATE_MEMBER)
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

  const handleUpdateUser = async (
    userData: MemberFormValues,
    cancelInstructionCommitments = false,
  ) => {
    try {
      await updateUser({
        variables: {
          updateUserInput: {
            ...userData,
            // An empty date input is not a date: leave the field out.
            date_of_birth: userData.date_of_birth || undefined,
            roleId: selectedRole ? Number(selectedRole) : null,
            ...(cancelInstructionCommitments && { cancelInstructionCommitments }),
          },
        },
      })
      toast({ title: t("users.toast.updated.title") })
      setRoleChange(null)
      setIsEditDialogOpen(false)
      refetch()
    } catch (error) {
      // Taking the instructor role away while they still instruct bookings or courses: the API
      // lists them (409) and the administrator confirms that they are cancelled.
      const commitments = cancelInstructionCommitments ? undefined : apiRefusalMessage(error, 409)
      if (commitments) {
        setRoleChange({ userData, message: commitments })
        return
      }
      setRoleChange(null)
      // The API says why when a rule refuses the change (last administrator…).
      toast({
        title: t("users.toast.updateFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
    }
  }

  const reactivate = async (user: User) => {
    try {
      await setUserActive({ variables: { id: Number(user.id), active: true } })
      toast({
        title: t("users.toast.reactivated.title"),
        description: t("users.toast.reactivated.description", { name: nameOf(user) }),
      })
      refetch()
    } catch (error) {
      toast({
        title: t("users.toast.accountFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
    }
  }

  // The API closes the account and, when asked, cancels and refunds the bookings still to
  // come; the toast says what it did with them.
  const deactivate = async (user: User, cancelUpcomingBookings: boolean) => {
    try {
      const { data: result } = await deactivateMember({
        variables: { id: Number(user.id), cancelUpcomingBookings },
      })
      const outcome = result?.deactivateMember
      const kept = outcome?.keptReservationIds ?? []
      const description = [
        t("users.toast.deactivated.description", { name: nameOf(user) }),
        outcome && outcome.cancelledReservations > 0
          ? t("users.departure.cancelled", {
              count: outcome.cancelledReservations,
              amount: formatMoney(outcome.refundedAmount),
            })
          : null,
        outcome && outcome.cancelledInstructionReservations > 0
          ? t("users.departure.instructionCancelled", {
              count: outcome.cancelledInstructionReservations,
              amount: formatMoney(outcome.refundedToStudents),
            })
          : null,
        kept.length > 0 ? t("users.departure.kept", { count: kept.length, ids: kept.join(", ") }) : null,
        // Left on the schedule with an instructor who can no longer log in.
        outcome && !cancelUpcomingBookings && outcome.upcomingInstructionReservations > 0
          ? t("users.departure.instructionLeft", { count: outcome.upcomingInstructionReservations })
          : null,
        outcome && outcome.upcomingCourses > 0
          ? t("users.departure.coursesLeft", { count: outcome.upcomingCourses })
          : null,
      ]
        .filter(Boolean)
        .join(" ")
      toast({ title: t("users.toast.deactivated.title"), description })
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
      void reactivate(user)
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
    if (accountAction?.kind === "delete") void handleDeleteUser(accountAction.user)
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
  const handleViewDetails = (userId: string, tab: "personal-info" | "licenses" = "personal-info") => {
    setDetailsTab(tab)
    setSelectedUserDetails(null)
    setIsDetailsDialogOpen(true)
    void loadUserDetails(userId)
  }

  const handleSubmitLicense = async (values: LicenseFormValues) => {
    if (values.licenseId) return handleUpdateLicense(values)
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
      if (returnToDetails) handleViewDetails(values.userId, "licenses")
    } catch {
      toast({
        title: t("users.toast.licenceFailed.title"),
        description: t("users.toast.licenceFailed.description"),
        variant: "destructive",
      })
    }
  }

  // A correction or a renewal; back to the member's sheet afterwards.
  const handleUpdateLicense = async (values: LicenseFormValues) => {
    const renewing = licenseChange?.action === "renew"
    try {
      await updateLicense({
        variables: {
          updateLicenseInput: {
            id: Number.parseInt(values.licenseId as string),
            license_type: values.license_type,
            license_number: values.license_number,
            expiration_date: calendarDayToISOString(values.expirationDate),
            issue_date: calendarDayToISOString(values.issueDate),
            certification_authority: values.certification_authority || null,
            status: values.status || "active",
          },
          // Without new files the API keeps the documents already on the licence.
          documents: values.documents.length > 0 ? values.documents : null,
        },
      })
      toast({ title: t(renewing ? "users.toast.licenceRenewed.title" : "users.toast.licenceUpdated.title") })
      setIsLicenseDialogOpen(false)
      setLicenseChange(null)
      handleViewDetails(values.userId, "licenses")
    } catch {
      toast({
        title: t("users.toast.licenceUpdateFailed.title"),
        description: t("users.toast.licenceUpdateFailed.description"),
        variant: "destructive",
      })
    }
  }

  const handleLicenseAction = (action: "edit" | "renew" | "delete", license: License, userId: string) => {
    const change = { action, license, userId }
    setLicenseChange(change)
    setLastLicenseChange(change)
    if (action === "delete") return
    // One panel at a time: the sheet closes, and reopens once the licence is saved.
    setIsDetailsDialogOpen(false)
    setLicenseUserId(userId)
    setReturnToDetails(true)
    setIsLicenseDialogOpen(true)
  }

  // A licence the member entered becomes valid (or stays expired when its date has passed).
  const handleValidateLicense = async (license: License, userId: string) => {
    setValidatingLicenseId(String(license.id))
    try {
      await validateLicense({ variables: { id: Number.parseInt(String(license.id)) } })
      toast({
        title: t("users.toast.licenceValidated.title"),
        description: t("users.toast.licenceValidated.description", { type: license.license_type }),
      })
      setDetailsTab("licenses")
      void loadUserDetails(userId)
      void refetchPendingLicences().catch(() => undefined)
    } catch (error) {
      toast({
        title: t("users.toast.licenceValidateFailed.title"),
        description: apiErrorMessage(error) ?? t("users.toast.retryLater"),
        variant: "destructive",
      })
    } finally {
      setValidatingLicenseId(null)
    }
  }

  const confirmDeleteLicense = async () => {
    if (!licenseChange || licenseChange.action !== "delete") return
    try {
      await deleteLicense({ variables: { id: Number.parseInt(licenseChange.license.id) } })
      toast({ title: t("users.toast.licenceDeleted.title") })
      setLicenseChange(null)
      void loadUserDetails(licenseChange.userId)
    } catch {
      toast({
        title: t("users.toast.licenceDeleteFailed.title"),
        description: t("users.toast.licenceDeleteFailed.description"),
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
    setLicenseChange(null)
    setLicenseUserId(userId)
    setReturnToDetails(false)
    setIsLicenseDialogOpen(true)
  }

  // One dialog at a time: the sheet closes, and reopens once the licence is saved.
  const openLicenseFromDetails = (userId: string) => {
    setLicenseChange(null)
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
              saving={addingLicense || updatingLicense}
              onSubmit={handleSubmitLicense}
              license={licenseChange && licenseChange.action !== "delete" ? licenseChange.license : null}
              mode={licenseChange && licenseChange.action !== "delete" ? licenseChange.action : "add"}
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
          <PendingLicencesNotice
            licences={pendingLicences}
            onOpenMember={(userId) => handleViewDetails(userId, "licenses")}
          />

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

      <AccountConfirmDialog
        open={roleChange !== null}
        onOpenChange={(open) => !open && setRoleChange(null)}
        title={t("users.roleChange.title")}
        description={roleChange?.message ?? ""}
        confirmLabel={t("users.roleChange.confirm")}
        pending={updating}
        onConfirm={() => roleChange && void handleUpdateUser(roleChange.userData, true)}
      />

      {lastAccountAction?.kind === "delete" && (
        <AccountConfirmDialog
          open={accountAction?.kind === "delete"}
          onOpenChange={(open) => !open && setAccountAction(null)}
          title={t("users.accountActions.deleteConfirm.title", { name: nameOf(lastAccountAction.user) })}
          description={t("users.accountActions.deleteConfirm.description")}
          confirmLabel={t("users.accountActions.deleteConfirm.confirm")}
          pending={deleting}
          onConfirm={confirmAccountAction}
        />
      )}

      {lastAccountAction?.kind === "deactivate" && (
        <DeactivateMemberDialog
          open={accountAction?.kind === "deactivate"}
          onOpenChange={(open) => !open && setAccountAction(null)}
          member={{ id: lastAccountAction.user.id, name: nameOf(lastAccountAction.user) }}
          pending={deactivating}
          onConfirm={(cancelUpcomingBookings) => void deactivate(lastAccountAction.user, cancelUpcomingBookings)}
        />
      )}

      <UserDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        userDetails={selectedUserDetails}
        onEdit={handleEditFromDetails}
        onAddLicense={openLicenseFromDetails}
        onBalanceAdjusted={(userId) => void loadUserDetails(userId)}
        onLicenseAction={handleLicenseAction}
        onValidateLicense={(license, userId) => void handleValidateLicense(license, userId)}
        validatingLicenseId={validatingLicenseId}
        initialTab={detailsTab}
      />

      {lastLicenseChange?.action === "delete" && (
        <AccountConfirmDialog
          open={licenseChange?.action === "delete"}
          onOpenChange={(open) => !open && setLicenseChange(null)}
          title={t("users.licence.deleteConfirm.title", {
            type: lastLicenseChange.license.license_type,
            name: selectedUserDetails
              ? `${selectedUserDetails.first_name ?? ""} ${selectedUserDetails.last_name ?? ""}`.trim()
              : "",
          })}
          description={t("users.licence.deleteConfirm.description")}
          confirmLabel={t("users.licence.deleteConfirm.confirm")}
          pending={deletingLicense}
          onConfirm={() => void confirmDeleteLicense()}
        />
      )}
    </div>
  )
}
