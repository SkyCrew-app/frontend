"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { UPDATE_NOTIFICATION_SETTINGS } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { buildNotificationSettings } from "@/lib/notification-settings"

interface NotificationFormProps {
  userData: any
  userId: string | null
  refetch: () => Promise<any>
}

export function NotificationForm({ userData, refetch }: NotificationFormProps) {
  const { t } = useTranslation("profile")
  const [notifications, setNotifications] = useState({
    email_notifications_enabled: false,
    sms_notifications_enabled: false,
  })

  const [isUpdating, setIsUpdating] = useState(false)

  const { toast } = useToast()
  const [updateNotifications] = useMutation(UPDATE_NOTIFICATION_SETTINGS)

  useEffect(() => {
    if (userData) {
      setNotifications({
        email_notifications_enabled: userData.email_notifications_enabled || false,
        sms_notifications_enabled: userData.sms_notifications_enabled || false,
      })
    }
  }, [userData])

  const handleSwitchChange = async (
    name: "email_notifications_enabled" | "sms_notifications_enabled",
    checked: boolean,
  ) => {
    // Sans les données du serveur, on ne connaît pas l'abonnement à la newsletter :
    // l'envoyer à l'aveugle écraserait la valeur enregistrée.
    if (!userData) return

    setNotifications(prev => ({ ...prev, [name]: checked }))

    setIsUpdating(true)

    try {
      const { data } = await updateNotifications({
        variables: buildNotificationSettings(userData, { [name]: checked }),
      })

      if (data?.updateNotificationSettings) {
        toast({
          title: t("toast.success"),
          description: t("notifications.toast.updated"),
        })
        await refetch()
      } else {
        throw new Error("La mise à jour a échoué")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des notifications:", error)
      toast({
        variant: "destructive",
        title: t("toast.error"),
        description: t("notifications.toast.failed"),
      })

      setNotifications(prev => ({
        ...prev,
        [name]: userData?.[name] || false
      }))
    } finally {
      setIsUpdating(false)
    }
  }

  const settings = [
    {
      name: "email_notifications_enabled" as const,
      label: t("notifications.email.label"),
      description: t("notifications.email.description"),
    },
    {
      name: "sms_notifications_enabled" as const,
      label: t("notifications.sms.label"),
      description: t("notifications.sms.description"),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("notifications.title")}</CardTitle>
        <CardDescription>{t("notifications.description")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y border-t p-0">
        {settings.map((setting) => (
          <div key={setting.name} className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="min-w-0">
              <Label htmlFor={setting.name} className="cursor-pointer">
                {setting.label}
              </Label>
              <p className="mt-1 text-sm text-muted-foreground">{setting.description}</p>
            </div>
            <Switch
              id={setting.name}
              checked={notifications[setting.name]}
              onCheckedChange={(checked) => handleSwitchChange(setting.name, checked)}
              disabled={isUpdating || !userData}
              className="shrink-0"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
