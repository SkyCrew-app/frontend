"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useQuery, useMutation, useLazyQuery } from "@apollo/client"
import { motion } from "framer-motion"
import { useToast } from "@/components/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { CREATE_USER, GET_USERS, UPDATE_USER, GET_USER_DETAILS } from "@/graphql/user"
import { CREATE_LICENSE } from "@/graphql/licences"
import { GET_ROLES } from "@/graphql/roles"
import type { User, Role, UserDetails } from "@/interfaces/user"
import { UsersTable } from "@/components/admin-user/users-table"
import { CreateUserForm } from "@/components/admin-user/create-user-form"
import { EditUserForm } from "@/components/admin-user/edit-user-form"
import { AddLicenseForm } from "@/components/admin-user/add-license-form"
import { UserDetailsDialog } from "@/components/admin-user/user-details"
import { UserFilters } from "@/components/admin-user/user-filters"
import { PaginationControls } from "@/components/admin-user/pagination-controls"

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
}

export default function AdministrationPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null)
  const [currentReservationPage, setCurrentReservationPage] = useState(1)
  const [currentLicensePage, setCurrentLicensePage] = useState(1)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date | null>(null)
  const [issueDate, setIssueDate] = useState<Date | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<string | null>(null)
  const [filterConfirmed, setFilterConfirmed] = useState<boolean | null>(null)
  const [filter2FA, setFilter2FA] = useState<boolean | null>(null)
  const itemsPerPage = 3
  const [usersPerPage] = useState(10)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const { toast } = useToast()

  const { loading, error, data, refetch } = useQuery(GET_USERS, {
    onCompleted: (data) => {
      setUsers(data.getUsers || [])
    },
    fetchPolicy: "cache-and-network",
  })

  const { data: rolesData } = useQuery(GET_ROLES, {
    onCompleted: (data) => setRoles(data.roles),
  })

  const [createUser] = useMutation(CREATE_USER)
  const [updateUser] = useMutation(UPDATE_USER)
  const [onAddLicense] = useMutation(CREATE_LICENSE)
  const [getUserDetails] = useLazyQuery<{ getUserDetails: UserDetails }>(GET_USER_DETAILS)

  useEffect(() => {
    if (data?.getUsers) {
      setUsers(data.getUsers)
    }
  }, [data])

  const handleCreateUser = async (userData: {
    first_name: string
    last_name: string
    email: string
    date_of_birth: string
  }) => {
    try {
      await createUser({ variables: userData })
      toast({
        title: "Utilisateur créé avec succès",
        description: "L'utilisateur va recevoir un email pour confirmer son compte.",
        variant: "default",
      })
      setIsCreateDialogOpen(false)
      refetch()
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Erreur lors de la création de l'utilisateur",
          description: error.message,
          variant: "destructive",
        })
      }
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
            roleId: selectedRole,
          },
        },
      })
      toast({
        title: "Utilisateur mis à jour avec succès",
        variant: "default",
      })
      setIsEditDialogOpen(false)
      refetch()
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Erreur lors de la mise à jour de l'utilisateur",
          description: error.message,
          variant: "destructive",
        })
      }
    }
  }

  const handleViewDetails = (userId: string) => {
    getUserDetails({
      variables: { id: Number.parseInt(userId) },
      onCompleted: (data) => {
        setSelectedUserDetails(data.getUserDetails)
        setIsDetailsDialogOpen(true)
      },
      onError: (error) => {
        toast({
          title: "Erreur",
          description: "Impossible de charger les détails de l'utilisateur: " + error.message,
          variant: "destructive",
        })
      },
    })
  }

  const handleSubmitLicences = async (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)

    if (!selectedUserId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un utilisateur.",
        variant: "destructive",
      })
      return
    }

    const files = formData.getAll("documents") as File[]
    const validFiles = files.filter((file) => file.size > 0)

    onAddLicense({
      variables: {
        createLicenseInput: {
          user_id: Number.parseInt(selectedUserId),
          license_type: formData.get("license_type") as string,
          license_number: formData.get("license_number") as string,
          expiration_date: expirationDate?.toISOString(),
          issue_date: issueDate?.toISOString(),
          certification_authority: (formData.get("certification_authority") as string) || null,
          status: (formData.get("status") as string) || "active",
        },
        documents: validFiles.length > 0 ? validFiles : null,
      },
    })
      .then(() => {
        toast({
          title: "Licence ajoutée avec succès",
          variant: "default",
        })
        setIsDialogOpen(false)
        if (selectedUserDetails && selectedUserId === selectedUserDetails.id) {
          handleViewDetails(selectedUserId)
        }
      })
      .catch((error) => {
        if (error instanceof Error) {
          toast({
            title: "Erreur lors de l'ajout de la licence",
            description: error.message,
            variant: "destructive",
          })
        }
      })
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = filterRole === null || user.role?.id.toString() === filterRole
    const matchesConfirmed = filterConfirmed === null || user.isEmailConfirmed === filterConfirmed
    const matches2FA = filter2FA === null || user.is2FAEnabled === filter2FA

    return matchesSearch && matchesRole && matchesConfirmed && matches2FA
  })

  const handleExpirationDateChange = (date: Date | undefined) => {
    if (date && issueDate && date < issueDate) {
      toast({
        title: "Erreur",
        description: "La date d'expiration ne peut pas être antérieure à la date d'émission.",
        variant: "destructive",
      })
      return
    }
    setExpirationDate(date ?? null)
  }

  const indexOfLastUser = currentPage * usersPerPage
  const indexOfFirstUser = indexOfLastUser - usersPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)

  const paginate = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > Math.ceil(filteredUsers.length / usersPerPage)) {
      return
    }
    setCurrentPage(pageNumber)
  }

  const resetFilters = () => {
    setFilterRole(null)
    setFilterConfirmed(null)
    setFilter2FA(null)
    setSearchTerm("")
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setSelectedRole(user.role?.id.toString() || null)
    setIsEditDialogOpen(true)
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            Une erreur est survenue lors du chargement des utilisateurs: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={() => refetch()}>Réessayer</Button>
      </div>
    )
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeIn} className="container mx-auto p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestion des membres</h1>
          <p className="text-muted-foreground mt-1">Gérez les utilisateurs, leurs licences et leurs informations</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateUserForm
            isOpen={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSubmit={handleCreateUser}
          />

          <AddLicenseForm
            isOpen={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            users={users}
            loading={loading}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            issueDate={issueDate}
            setIssueDate={setIssueDate}
            expirationDate={expirationDate}
            setExpirationDate={setExpirationDate}
            onSubmit={handleSubmitLicences}
            onExpirationDateChange={handleExpirationDateChange}
          />
        </div>
      </div>

      <UserFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterRole={filterRole}
        setFilterRole={setFilterRole}
        filterConfirmed={filterConfirmed}
        setFilterConfirmed={setFilterConfirmed}
        filter2FA={filter2FA}
        setFilter2FA={setFilter2FA}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        resetFilters={resetFilters}
        roles={roles}
      />

      <UsersTable users={currentUsers} loading={loading} onEdit={handleEditUser} onViewDetails={handleViewDetails} />

      {filteredUsers.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={usersPerPage}
          onPageChange={paginate}
          indexOfFirstItem={indexOfFirstUser}
          indexOfLastItem={indexOfLastUser}
        />
      )}

      <EditUserForm
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={selectedUser}
        roles={roles}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onSubmit={handleUpdateUser}
      />

      <UserDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        userDetails={selectedUserDetails}
        currentReservationPage={currentReservationPage}
        setCurrentReservationPage={setCurrentReservationPage}
        currentLicensePage={currentLicensePage}
        setCurrentLicensePage={setCurrentLicensePage}
        itemsPerPage={itemsPerPage}
      />
    </motion.div>
  )
}
