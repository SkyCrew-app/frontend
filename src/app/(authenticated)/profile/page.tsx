"use client"

import React, { useState, useEffect } from "react"
import { useQuery } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Bell, Settings, Award, Lock, Shield } from "lucide-react"
import { GET_USER_BY_EMAIL } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { useMediaQuery } from "@/hooks/use-media-query"
import { ProfileForm } from "@/components/profile/profile-form"
import { NotificationForm } from "@/components/profile/notification-form"
import { PreferencesForm } from "@/components/profile/preferences-form"
import { PasswordForm } from "@/components/profile/password-form"
import { LicensesSection } from "@/components/profile/licenses-section"
import { motion } from "framer-motion"

const ProfileCard = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="h-full">
    <div
      className="h-full border rounded-lg p-6 cursor-pointer hover:shadow-md transition-all duration-200 bg-card"
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-3 bg-primary/10 rounded-full">
          {React.cloneElement(icon as React.ReactElement, { size: 24, className: "text-primary" })}
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <p className="text-base text-muted-foreground">{description}</p>
    </div>
  </motion.div>
)

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [show2FAAlert, setShow2FAAlert] = useState(false)
  const userEmail = useCurrentUser()
  const userConnexion = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("profile")
  const router = useRouter()
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (userConnexion) {
      setUserId(userConnexion.id)
    }
  }, [userConnexion])

  const {
    data: userData,
    loading,
    error: errorUser,
    refetch,
  } = useQuery(GET_USER_BY_EMAIL, {
    variables: { email: userEmail || "" },
    skip: !userEmail,
    fetchPolicy: "cache-first",
  })

  const handleCardClick = (sectionName: string) => {
    setActiveSection(activeSection === sectionName ? null : sectionName)
  }

  const handleActivate2FA = () => {
    setShow2FAAlert(true)
  }

  const confirmActivate2FA = () => {
    router.push("/administration/2fa")
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-1/3 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (errorUser) {
    toast({
      variant: "destructive",
      title: "Erreur",
      description: "Erreur lors de la récupération des données utilisateur",
    })
  }

  if (isMobile) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold text-center mb-6">Mon Profil</h1>

        <Tabs defaultValue="profile" className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
            <TabsTrigger value="security">Sécurité</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <ProfileForm userData={userData?.userByEmail} userId={userId} refetch={refetch} />

            <LicensesSection licenses={userData?.userByEmail?.licenses || []} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <NotificationForm userData={userData?.userByEmail} userId={userId} refetch={refetch} />

            <PreferencesForm userData={userData?.userByEmail} userId={userId} refetch={refetch} />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <PasswordForm userId={userId} />

            <div className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Authentification à deux facteurs (2FA)</h3>
              <p className="mb-4 text-muted-foreground">
                Renforcez la sécurité de votre compte en activant l'authentification à deux facteurs.
              </p>
              <Button className="w-full" onClick={handleActivate2FA}>
                Activer le 2FA
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {show2FAAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center max-w-sm mx-auto"
            >
              <p className="text-lg mb-4">Voulez-vous vraiment activer le 2FA ?</p>
              <div className="flex justify-center space-x-4">
                <Button onClick={confirmActivate2FA}>Oui</Button>
                <Button variant="secondary" onClick={() => setShow2FAAlert(false)}>
                  Non
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 relative">
      <h1 className="text-3xl font-bold text-center mb-8">Mon Profil</h1>

      {!activeSection && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <ProfileCard
            icon={<User className="h-6 w-6" />}
            title="Profil"
            description={
              userData?.userByEmail
                ? `${userData.userByEmail.first_name} ${userData.userByEmail.last_name} - ${userData.userByEmail.email}`
                : "Informations personnelles"
            }
            onClick={() => handleCardClick("profile")}
          />

          <ProfileCard
            icon={<Bell className="h-6 w-6" />}
            title="Notifications"
            description={
              userData?.userByEmail
                ? `Email: ${userData.userByEmail.email_notifications_enabled ? "Activé" : "Désactivé"} - SMS: ${userData.userByEmail.sms_notifications_enabled ? "Activé" : "Désactivé"}`
                : "Paramètres de notifications"
            }
            onClick={() => handleCardClick("notifications")}
          />

          <ProfileCard
            icon={<Settings className="h-6 w-6" />}
            title="Préférences"
            description="Modifier les préférences utilisateur pour le site."
            onClick={() => handleCardClick("preferences")}
          />

          <ProfileCard
            icon={<Award className="h-6 w-6" />}
            title="Licences"
            description={
              userData?.userByEmail?.licenses && userData.userByEmail.licenses.length > 0
                ? `${userData.userByEmail.licenses.length} licences`
                : "Aucune licence"
            }
            onClick={() => handleCardClick("licenses")}
          />

          <ProfileCard
            icon={<Lock className="h-6 w-6" />}
            title="Mot de passe"
            description="Changez votre mot de passe pour sécuriser votre compte."
            onClick={() => handleCardClick("password")}
          />

          <ProfileCard
            icon={<Shield className="h-6 w-6" />}
            title="Activer le 2FA"
            description="Renforcez la sécurité de votre compte en activant le 2FA."
            onClick={handleActivate2FA}
          />
        </div>
      )}

      {activeSection === "profile" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Modifier votre profil</h2>
              <Button variant="outline" onClick={() => setActiveSection(null)}>
                Retour
              </Button>
            </div>
            <ProfileForm userData={userData?.userByEmail} userId={userId} refetch={refetch} />
          </div>
        </motion.div>
      )}

      {activeSection === "notifications" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Paramètres de notifications</h2>
              <Button variant="outline" onClick={() => setActiveSection(null)}>
                Retour
              </Button>
            </div>
            <NotificationForm userData={userData?.userByEmail} userId={userId} refetch={refetch} />
          </div>
        </motion.div>
      )}

      {activeSection === "preferences" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Préférences utilisateur</h2>
              <Button variant="outline" onClick={() => setActiveSection(null)}>
                Retour
              </Button>
            </div>
            <PreferencesForm userData={userData?.userByEmail} userId={userId} refetch={refetch} />
          </div>
        </motion.div>
      )}

      {activeSection === "licenses" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Vos licences</h2>
              <Button variant="outline" onClick={() => setActiveSection(null)}>
                Retour
              </Button>
            </div>
            <LicensesSection licenses={userData?.userByEmail?.licenses || []} />
          </div>
        </motion.div>
      )}

      {activeSection === "password" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Modifier votre mot de passe</h2>
              <Button variant="outline" onClick={() => setActiveSection(null)}>
                Retour
              </Button>
            </div>
            <PasswordForm userId={userId} />
          </div>
        </motion.div>
      )}

      {show2FAAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md"
          >
            <h3 className="text-xl font-semibold mb-4">Activation du 2FA</h3>
            <p className="mb-6">Voulez-vous vraiment activer l'authentification à deux facteurs ?</p>
            <div className="flex justify-center space-x-4">
              <Button onClick={confirmActivate2FA}>Oui, activer</Button>
              <Button variant="outline" onClick={() => setShow2FAAlert(false)}>
                Annuler
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
