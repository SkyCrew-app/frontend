"use client"

import React, { useState } from "react"
import { useTranslation } from "react-i18next"
import { useQuery } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Badge } from "@/components/ui/badge"
import { GET_TWO_FACTOR_STATUS, GET_USER_BY_EMAIL } from "@/graphql/user"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { PageHeader } from "@/components/layout/PageHeader"
import { ErrorState } from "@/components/layout/ErrorState"
import { ProfileForm } from "@/components/profile/profile-form"
import { NotificationForm } from "@/components/profile/notification-form"
import { PreferencesForm } from "@/components/profile/preferences-form"
import { PasswordForm } from "@/components/profile/password-form"
import { DisableTwoFactorDialog } from "@/components/profile/disable-two-factor-dialog"
import { LicensesSection } from "@/components/profile/licenses-section"

const TABS = ["profile", "security", "notifications", "preferences", "licenses"]

export default function ProfilePage() {
  const { t } = useTranslation("profile")
  const [activeTab, setActiveTab] = useState("profile")
  const [show2FAAlert, setShow2FAAlert] = useState(false)
  const [showDisable2FA, setShowDisable2FA] = useState(false)
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

  // The real state comes from the API; it changes on the setup page, hence the network refresh.
  const twoFactorQuery = useQuery(GET_TWO_FACTOR_STATUS, { fetchPolicy: "cache-and-network" })
  const twoFactorEnabled: boolean | undefined = twoFactorQuery.data?.twoFactorEnabled
  const twoFactorKnown = typeof twoFactorEnabled === "boolean"

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
        title={t("page.title")}
        description={t("page.description")}
        className="mb-0"
      />

      {loading && !user ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      ) : errorUser && !user ? (
        <ErrorState
          description={t("page.loadError")}
          onRetry={() => refetch()}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`page.tabs.${tab}`)}
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>{t("twoFactor.title")}</CardTitle>
                  {twoFactorKnown ? (
                    <Badge variant={twoFactorEnabled ? "success" : "neutral"}>
                      {twoFactorEnabled ? t("twoFactor.enabled") : t("twoFactor.disabled")}
                    </Badge>
                  ) : twoFactorQuery.loading ? (
                    <Skeleton className="h-6 w-20 rounded-full" />
                  ) : null}
                </div>
                <CardDescription>{t("twoFactor.description")}</CardDescription>
              </CardHeader>
              {!twoFactorKnown && !twoFactorQuery.loading && (
                <CardContent>
                  <p className="text-sm text-muted-foreground" role="alert">
                    {t("twoFactor.statusUnknown")}
                  </p>
                </CardContent>
              )}
              <CardFooter className="justify-end">
                {twoFactorKnown ? (
                  twoFactorEnabled ? (
                    <Button variant="outline" className="text-destructive" onClick={() => setShowDisable2FA(true)}>
                      {t("twoFactor.disable")}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setShow2FAAlert(true)}>
                      {t("twoFactor.enable")}
                    </Button>
                  )
                ) : (
                  !twoFactorQuery.loading && (
                    <Button variant="outline" onClick={() => twoFactorQuery.refetch()}>
                      {t("common:actions.retry")}
                    </Button>
                  )
                )}
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
            <AlertDialogTitle>{t("twoFactor.enableDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("twoFactor.enableDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivate2FA}>{t("twoFactor.enableDialog.confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DisableTwoFactorDialog open={showDisable2FA} onOpenChange={setShowDisable2FA} />
    </div>
  )
}
