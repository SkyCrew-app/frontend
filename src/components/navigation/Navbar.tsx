"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import { Bell, ChevronRight } from "lucide-react"
import ToggleThemeButton from "../ui/ToggleThemeButton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { GET_USER_PROFILE } from "@/graphql/user"
import { LOGOUT_MUTATION } from "@/graphql/system"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { io, type Socket } from "socket.io-client"
import { GET_NOTIFICATIONS, SEEN_NOTIFICATION } from "@/graphql/notifications"
import { getNotificationTypeInFrench } from "@/interfaces/notification"

export default function Navbar() {
  const router = useRouter()
  const [logout] = useMutation(LOGOUT_MUTATION)
  const [initials, setInitials] = useState<string | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [userAccountBalance, setUserAccountBalance] = useState<number | null>(null)
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)

  const { data: notificationsData, refetch: refetchNotifications } = useQuery(GET_NOTIFICATIONS, {
    variables: { userId: userId || 0 },
    skip: !userId,
  })

  const [seenNotification] = useMutation(SEEN_NOTIFICATION)

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

  useEffect(() => {
    if (userId) {
      const newSocket = io("http://localhost:3000", {
        query: { userId },
      })

      newSocket.on("connect", () => {
        console.log("Connected to WebSocket")
      })

      newSocket.on("notification", (payload) => {
        setNotifications((prevNotifications) => [payload, ...prevNotifications])
        refetchNotifications()
      })

      setSocket(newSocket)

      return () => {
        newSocket.disconnect()
      }
    }
  }, [userId, refetchNotifications])

  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail },
    skip: !userEmail,
  })

  useEffect(() => {
    if (data && data.userByEmail) {
      const { first_name, last_name, profile_picture, user_account_balance } = data.userByEmail
      setInitials(`${first_name[0]}${last_name[0]}`)
      setUserAccountBalance(user_account_balance)
      if (profile_picture) {
        setProfilePicture(profile_picture)
      }
    }
  }, [data])

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/")
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    }
  }

  const handleProfile = () => {
    router.push("/profile/")
  }

  const handleAmount = () => {
    router.push("/profile/money_account")
  }

  const handleNotificationClick = async (notificationId: number, actionUrl?: string) => {
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

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length

  if (loading) return <div>Chargement...</div>
  if (error) return <div>Erreur lors du chargement des informations utilisateur.</div>

  return (
    <header className="w-full flex items-center justify-end p-4 border-b bg-white dark:bg-gray-900 space-x-3 shadow-sm">
      <ToggleThemeButton />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative p-2">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center h-4 w-4 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 max-h-[70vh] overflow-y-auto p-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
        >
          {notifications.length > 0 ? (
            <>
              {notifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.action_url)}
                  className={`flex flex-col items-start p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.is_read ? "bg-blue-50 dark:bg-blue-900" : ""
                  }`}
                >
                  <span
                    className={`font-semibold text-sm ${notification.priority === "high" ? "text-red-500" : "text-gray-800 dark:text-gray-200"}`}
                  >
                    {getNotificationTypeInFrench(notification.notification_type)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.message}</span>
                  <span className="text-xs text-gray-400 mt-2">
                    {new Date(notification.notification_date).toLocaleString("fr-FR")}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => router.push("/notifications")}
                className="flex items-center justify-center p-3 text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Toutes les notifications
                <ChevronRight className="ml-2 h-4 w-4" />
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem className="p-3 text-center text-gray-500 dark:text-gray-400">
              Pas de nouvelles notifications
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar className="h-8 w-8 cursor-pointer">
            {profilePicture ? (
              <AvatarImage src={`http://localhost:3000${profilePicture}`} alt="User Avatar" />
            ) : (
              <AvatarFallback className="bg-blue-500 text-white">{initials}</AvatarFallback>
            )}
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <DropdownMenuItem onClick={handleProfile} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            Mon Profil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleAmount} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            Mon Solde: <span className="font-semibold ml-1">{userAccountBalance} €</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2 border-gray-200 dark:border-gray-700" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500 dark:text-red-400"
          >
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

