"use client"

import React, { useState, useEffect } from "react"
import { useMutation } from "@apollo/client"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { UPDATE_USER } from "@/graphql/user"
import { useToast } from "@/components/hooks/use-toast"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"

interface NotificationFormProps {
  userData: any
  userId: string | null
  refetch: () => Promise<any>
}

export function NotificationForm({ userData, userId, refetch }: NotificationFormProps) {
  const t = useTranslations("profile")
  const [notifications, setNotifications] = useState({
    email_notifications_enabled: false,
    sms_notifications_enabled: false,
  })

  const [isUpdating, setIsUpdating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { toast } = useToast()
  const [updateNotifications] = useMutation(UPDATE_USER)

  useEffect(() => {
    if (userData) {
      setNotifications({
        email_notifications_enabled: userData.email_notifications_enabled || false,
        sms_notifications_enabled: userData.sms_notifications_enabled || false,
      })
    }
  }, [userData])

  const handleSwitchChange = async (name: string, checked: boolean) => {
    setNotifications(prev => ({ ...prev, [name]: checked }))
    setSaveSuccess(false)

    setIsUpdating(true)

    try {
      const { data } = await updateNotifications({
        variables: {
          updateUserInput: {
            id: userId,
            [name]: checked,
          },
        },
      })

      if (data?.updateUser) {
        toast({
          title: t('success'),
          description: t('parameterUpdated'),
        })
        setSaveSuccess(true)
        await refetch()
      } else {
        throw new Error("La mise à jour a échoué")
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des notifications:", error)
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('errorNotification'),
      })

      setNotifications(prev => ({
        ...prev,
        [name]: userData?.[name] || false
      }))
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">{t('notificationSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div>
              <Label htmlFor="email_notifications_enabled" className="text-base font-medium cursor-pointer">
                {t('notificationsByEmail')}
              </Label>
              <p className="text-sm text-gray-500 mt-1">{t('notificationByEmailDescription')}</p>
            </div>
            <Switch
              id="email_notifications_enabled"
              checked={notifications.email_notifications_enabled}
              onCheckedChange={(checked) => handleSwitchChange("email_notifications_enabled", checked)}
              disabled={isUpdating}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <div>
              <Label htmlFor="sms_notifications_enabled" className="text-base font-medium cursor-pointer">
                {t('notificationsBySms')}
              </Label>
              <p className="text-sm text-gray-500 mt-1">{t('notificationBySmsDescription')}</p>
            </div>
            <Switch
              id="sms_notifications_enabled"
              checked={notifications.sms_notifications_enabled}
              onCheckedChange={(checked) => handleSwitchChange("sms_notifications_enabled", checked)}
              disabled={isUpdating}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200"
            >
              {t('updatedPreferences')}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
