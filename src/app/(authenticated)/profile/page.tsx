"use client"

import React, { useState } from "react"
import { useQuery } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { GET_USER_BY_EMAIL } from "@/graphql/user"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import { ProfileForm } from "@/components/profile/profile-form"
import { NotificationForm } from "@/components/profile/notification-form"
import { PreferencesForm } from "@/components/profile/preferences-form"
import { PasswordForm } from "@/components/profile/password-form"
import { LicensesSection } from "@/components/profile/licenses-section"

const TABS = [
  { value: "profile", label: "Profil" },
  { value: "security", label: "Sécurité" },
  { value: "notifications", label: "Notifications" },
  { value: "preferences", label: "Préférences" },
  { value: "licenses", label: "Licences" },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [show2FAAlert, setShow2FAAlert] = useState(false)
  const userEmail = useCurrentUser()
  const userConnexion = useUserData(userEmail)
  const userId: string | null = userConnexion?.id ?? null
  const router = useRouter()

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

  const user = userData?.userByEmail

  const confirmActivate2FA = () => {
    router.push("/administration/2fa")
  }

  // Every panel stays mounted so that switching tabs never loses what was typed.
  const panelProps = (value: string) => ({
    value,
    forceMount: true as const,
    hidden: activeTab !== value,
    className: "mt-6 space-y-6 data-[state=inactive]:hidden",
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon profil"
        description="Vos informations personnelles, la sécurité de votre compte et vos préférences."
        className="mb-0"
      />

      {loading && !user ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : errorUser && !user ? (
        <ErrorState
          description="Votre profil n'a pas pu être chargé. Vérifiez votre connexion puis réessayez."
          onRetry={() => refetch()}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent {...panelProps("profile")}>
            <ProfileForm userData={user} userId={userId} refetch={refetch} />
          </TabsContent>

          <TabsContent {...panelProps("security")}>
            <PasswordForm />

            <Card>
              <CardHeader>
                <CardTitle>Double authentification (2FA)</CardTitle>
                <CardDescription>
                  En plus du mot de passe, un code à usage unique généré par une application sur votre téléphone est
                  demandé à chaque connexion.
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-end">
                <Button variant="outline" onClick={() => setShow2FAAlert(true)}>
                  Activer le 2FA
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent {...panelProps("notifications")}>
            <NotificationForm userData={user} userId={userId} refetch={refetch} />
          </TabsContent>

          <TabsContent {...panelProps("preferences")}>
            <PreferencesForm userData={user} userId={userId} refetch={refetch} />
          </TabsContent>

          <TabsContent {...panelProps("licenses")}>
            <LicensesSection licenses={user?.licenses || []} />
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={show2FAAlert} onOpenChange={setShow2FAAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer la double authentification ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez être dirigé vers la page de configuration. Munissez-vous de votre téléphone et d'une
              application d'authentification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivate2FA}>Configurer le 2FA</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
