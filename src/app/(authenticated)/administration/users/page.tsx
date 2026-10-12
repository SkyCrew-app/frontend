"use client"

import { useState } from "react"
import { useQuery, useMutation, useLazyQuery } from "@apollo/client"
import { useToast } from "@/components/hooks/use-toast"
import { CREATE_USER, GET_USERS, UPDATE_USER, GET_USER_DETAILS } from "@/graphql/user"
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
import { calendarDayToISOString } from "@/lib/datetime"

const USERS_PER_PAGE = 10

export default function AdministrationPage() {
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
  const [getUserDetails] = useLazyQuery<{ getUserDetails: UserDetails }>(GET_USER_DETAILS, {
    fetchPolicy: "network-only",
  })

  const handleCreateUser = async (userData: {
    first_name: string
    last_name: string
    email: string
    date_of_birth: string
  }) => {
    try {
      await createUser({ variables: userData })
      toast({
        title: "Membre ajouté",
        description: "Il va recevoir un e-mail pour activer son compte.",
      })
      setIsCreateDialogOpen(false)
      refetch()
    } catch {
      toast({
        title: "Le membre n'a pas pu être ajouté",
        description: "Vérifiez que cette adresse e-mail n'est pas déjà utilisée, puis réessayez.",
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
      toast({ title: "Membre mis à jour" })
      setIsEditDialogOpen(false)
      refetch()
    } catch {
      toast({
        title: "Les modifications n'ont pas pu être enregistrées",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      })
    }
  }

  const loadUserDetails = async (userId: string) => {
    const result = await getUserDetails({ variables: { id: Number.parseInt(userId) } })
    if (result.data?.getUserDetails) {
      setSelectedUserDetails(result.data.getUserDetails)
      return
    }
    setIsDetailsDialogOpen(false)
    toast({
      title: "La fiche du membre n'a pas pu être chargée",
      description: "Réessayez dans un instant.",
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
      toast({ title: "Licence ajoutée" })
      setIsLicenseDialogOpen(false)
      if (returnToDetails) handleViewDetails(values.userId)
    } catch {
      toast({
        title: "La licence n'a pas pu être ajoutée",
        description: "Vérifiez les informations saisies, puis réessayez.",
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
        title="Membres"
        description="Les membres du club, leurs rôles et leurs licences."
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
          />

          <PaginationControls
            currentPage={page}
            totalItems={filteredUsers.length}
            itemsPerPage={USERS_PER_PAGE}
            onPageChange={setCurrentPage}
            itemLabel={filteredUsers.length > 1 ? "membres" : "membre"}
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

      <UserDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        userDetails={selectedUserDetails}
        onEdit={handleEditFromDetails}
        onAddLicense={openLicenseFromDetails}
      />
    </div>
  )
}
