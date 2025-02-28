"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Bell, Check, Trash2, Filter, AlertTriangle, Info, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { Badge } from "@/components/ui/badge"
import { GET_NOTIFICATIONS, SEEN_NOTIFICATION, REMOVE_NOTIFICATION } from "@/graphql/notifications"
import { getNotificationTypeInFrench } from "@/interfaces/notification"

export default function NotificationsPage() {
  const router = useRouter()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState<string>("all")

  const { data: notificationsData, refetch: refetchNotifications } = useQuery(GET_NOTIFICATIONS, {
    variables: { userId: userId || 0 },
    skip: !userId,
  })

  const [seenNotification] = useMutation(SEEN_NOTIFICATION)
  const [removeNotification] = useMutation(REMOVE_NOTIFICATION)

  useEffect(() => {
    if (userData) {
      setUserId(Number.parseInt(userData.id))
    }
  }, [userData])

  useEffect(() => {
    if (notificationsData) {
      setNotifications(notificationsData.notificationsByUser)
    }
  }, [notificationsData])

  const handleNotificationAction = async (notificationId: number, actionUrl?: string) => {
    try {
      await seenNotification({ variables: { id: notificationId } })
      refetchNotifications()
      if (actionUrl) {
        router.push(actionUrl)
      }
    } catch (error) {
      console.error("Erreur lors du marquage de la notification comme vue:", error)
    }
  }

  const handleRemoveNotification = async (notificationId: number) => {
    try {
      await removeNotification({ variables: { id: notificationId } })
      refetchNotifications()
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error)
    }
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.is_read
    return notification.priority === filter
  })

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="text-red-500" />
      case "medium":
        return <Info className="text-yellow-500" />
      case "low":
        return <CheckCircle className="text-green-500" />
      default:
        return <Bell className="text-blue-500" />
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Notifications</h1>

      <div className="flex justify-between items-center mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtrer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <DropdownMenuCheckboxItem checked={filter === "all"} onCheckedChange={() => setFilter("all")}>
              Toutes
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filter === "unread"} onCheckedChange={() => setFilter("unread")}>
              Non lues
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
            <DropdownMenuCheckboxItem checked={filter === "high"} onCheckedChange={() => setFilter("high")}>
              Priorité haute
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filter === "medium"} onCheckedChange={() => setFilter("medium")}>
              Priorité moyenne
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={filter === "low"} onCheckedChange={() => setFilter("low")}>
              Priorité basse
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
          {filteredNotifications.length} notification(s)
        </Badge>
      </div>

      {filteredNotifications.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">Aucune notification</p>
      ) : (
        <ul className="space-y-4">
          {filteredNotifications.map((notification) => (
            <li
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 ${
                !notification.is_read ? "border-l-4 border-blue-500" : ""
              }`}
            >
              <div className="p-4 flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-full ${priorityColor(notification.priority)}`}>
                    {priorityIcon(notification.priority)}
                  </div>
                </div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg mb-1 text-gray-800 dark:text-white">
                    {getNotificationTypeInFrench(notification.notification_type)}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{notification.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(notification.notification_date).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div className="flex-shrink-0 space-x-2">
                  {!notification.is_read && (
                    <Button
                      onClick={() => handleNotificationAction(notification.id)}
                      size="sm"
                      variant="ghost"
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  {notification.action_url && (
                    <Button
                      onClick={() => handleNotificationAction(notification.id, notification.action_url)}
                      size="sm"
                      variant="outline"
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                    >
                      Voir
                    </Button>
                  )}
                  <Button
                    onClick={() => handleRemoveNotification(notification.id)}
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
