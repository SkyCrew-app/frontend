"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import { Bell, ChevronRight, User, LogOut, CreditCard } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { GET_USER_PROFILE } from "@/graphql/user"
import { LOGOUT_MUTATION } from "@/graphql/system"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { io, type Socket } from "socket.io-client"
import { GET_NOTIFICATIONS, SEEN_NOTIFICATION } from "@/graphql/notifications"
import { getNotificationTypeInFrench } from "@/interfaces/notification"
import { CustomDropdown, CustomDropdownItem, CustomDropdownSeparator } from "@/components/ui/custom-dropdown"
import ThemeToggle from "@/components/theme/ThemeToggle"

interface NavbarProps {
  onToggleMobileMenu: () => void
}

export default function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const router = useRouter()
  const [logout] = useMutation(LOGOUT_MUTATION)
  const [initials, setInitials] = useState<string | null>(null)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [userAccountBalance, setUserAccountBalance] = useState<number | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
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
    variables: { email: userEmail || "" },
    skip: !userEmail,
  })

  useEffect(() => {
    if (data && data.userByEmail) {
      const { first_name, last_name, profile_picture, user_account_balance } = data.userByEmail
      setInitials(`${first_name[0]}${last_name[0]}`)
      setUserName(`${first_name} ${last_name}`)
      setUserRole(data.userByEmail.role?.role_name || "Utilisateur")
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

  if (loading)
    return (
      <div className="h-[86px] w-full flex items-center justify-center bg-card border-b border-border">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-muted h-8 w-8"></div>
          <div className="flex-1 space-y-2 py-1 max-w-[200px]">
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-2 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="h-[86px] w-full flex items-center justify-center bg-card border-b border-border">
        <div className="text-destructive">Erreur lors du chargement des informations utilisateur.</div>
      </div>
    )

  return (
    <header className="sticky top-0 z-30 h-16 w-full flex items-center justify-between px-4 md:px-6 bg-card/80 backdrop-blur-md border-b border-border shadow-sm">
      {/* Left section */}
      <div className="flex items-center">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-foreground/70 hover:bg-secondary"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="sr-only">Toggle menu</span>
        </button>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        <ThemeToggle />

        {/* Notifications - Custom Dropdown */}
        <CustomDropdown
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full bg-secondary hover:bg-secondary/80"
            >
              <Bell className="h-5 w-5 text-foreground/70" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full border-2 border-card">
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          }
          align="end"
          className="w-80 max-h-[70vh] overflow-y-auto p-0 rounded-xl"
        >
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {unreadNotificationsCount > 0
                ? `Vous avez ${unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount} nouvelle${unreadNotificationsCount > 1 ? "s" : ""} notification${unreadNotificationsCount > 1 ? "s" : ""}`
                : "Aucune nouvelle notification"}
            </p>
          </div>

          {notifications.length > 0 ? (
            <>
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.action_url)}
                  className={`flex flex-col items-start p-4 border-b border-border/50 hover:bg-secondary/50 cursor-pointer ${
                    !notification.is_read ? "bg-primary/5 dark:bg-primary/10" : ""
                  }`}
                >
                  <div className="flex items-center w-full">
                    <div
                      className={`h-2 w-2 rounded-full mr-2 ${
                        notification.priority === "high"
                          ? "bg-destructive"
                          : !notification.is_read
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                      }`}
                    ></div>
                    <span
                      className={`font-semibold text-sm ${
                        notification.priority === "high"
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {getNotificationTypeInFrench(notification.notification_type)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(notification.notification_date).toLocaleString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground mt-2">{notification.message}</span>
                </div>
              ))}
              <div
                onClick={() => router.push("/notifications")}
                className="flex items-center justify-center p-4 text-primary hover:bg-secondary/50 cursor-pointer"
              >
                Toutes les notifications
                <ChevronRight className="ml-2 h-4 w-4" />
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Pas de nouvelles notifications</p>
            </div>
          )}
        </CustomDropdown>

        {/* User menu - Custom Dropdown */}
        <CustomDropdown
          trigger={
            <Button
              variant="ghost"
              className="relative h-10 pl-2 pr-4 rounded-full bg-secondary hover:bg-secondary/80"
            >
              <Avatar className="h-8 w-8 mr-2 border-2 border-card">
                {profilePicture ? (
                  <AvatarImage src={`http://localhost:3000${profilePicture}`} alt="User Avatar" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">{userName}</span>
                <span className="text-xs text-muted-foreground">{userAccountBalance} €</span>
              </div>
            </Button>
          }
          align="end"
          className="w-64 p-2 rounded-xl"
        >
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center">
              <Avatar className="h-10 w-10 mr-3 border-2 border-card">
                {profilePicture ? (
                  <AvatarImage src={`http://localhost:3000${profilePicture}`} alt="User Avatar" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
            </div>
          </div>
          <CustomDropdownItem
            onClick={handleProfile}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-secondary"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Mon Profil</span>
          </CustomDropdownItem>
          <CustomDropdownItem
            onClick={handleAmount}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-secondary"
          >
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span>Mon Solde</span>
              <span className="text-sm font-semibold text-primary">{userAccountBalance} €</span>
            </div>
          </CustomDropdownItem>
          <CustomDropdownSeparator className="my-1 bg-border" />
          <CustomDropdownItem
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </CustomDropdownItem>
        </CustomDropdown>
      </div>
    </header>
  )
}
