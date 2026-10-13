"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@apollo/client"
import { Bell, ChevronRight, CreditCard, LogOut, Menu, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GET_USER_PROFILE } from "@/graphql/user"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { io } from "socket.io-client"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { cn } from "@/lib/utils"
import { formatDateTime, formatMoney } from "@/lib/format"
import { GET_NOTIFICATIONS, SEEN_NOTIFICATION } from "@/graphql/notifications"
import { type AppNotification, isHighPriority, notificationTypeLabel } from "@/interfaces/notification"
import ThemeToggle from "@/components/theme/ThemeToggle"
import LanguageToggle from "@/components/theme/LanguageToggle"
import { roleLabel } from "./role-label"
import { useLogout } from "@/components/hooks/useLogout"
import { useMounted } from "@/components/hooks/useMounted"

const PREVIEW_COUNT = 5

interface NavbarProps {
  onToggleMobileMenu: () => void
}

export default function Navbar({ onToggleMobileMenu }: NavbarProps) {
  const { t } = useTranslation("nav")
  const router = useRouter()
  const handleLogout = useLogout()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])

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
      // The server identifies the user from the session cookie.
      const newSocket = io(getBackendBaseUrl(), {
        withCredentials: true,
      })

      newSocket.on("notification", (payload) => {
        setNotifications((prevNotifications) => [payload, ...prevNotifications])
        refetchNotifications()
      })

      return () => {
        newSocket.disconnect()
      }
    }
  }, [userId, refetchNotifications])

  const { data, loading } = useQuery(GET_USER_PROFILE, {
    variables: { email: userEmail || "" },
    skip: !userEmail,
  })
  // The server always renders the loading state: the browser does the same on
  // its first render, even when the profile is already in its cache.
  const mounted = useMounted()
  const showLoading = !mounted || loading

  const profile = data?.userByEmail
  const firstName: string = profile?.first_name ?? ""
  const lastName: string = profile?.last_name ?? ""
  const userName = `${firstName} ${lastName}`.trim() || t("account.fallbackName")
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  const userRole: string | null = profile?.role?.role_name || null
  const profilePicture: string | null = profile?.profile_picture || null
  const balance = profile ? formatMoney(profile.user_account_balance) : null

  const handleNotificationClick = async (notification: AppNotification) => {
    try {
      if (!notification.is_read) {
        await seenNotification({ variables: { id: notification.id } })
        refetchNotifications()
      }
      if (notification.action_url) {
        router.push(notification.action_url)
      }
    } catch (error) {
      console.error("Erreur lors du marquage de la notification comme vue:", error)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const unreadLabel = unreadCount > 99 ? "99+" : String(unreadCount)

  const avatar = (className: string) => (
    <Avatar className={className}>
      {profilePicture && <AvatarImage src={`${getBackendBaseUrl()}${profilePicture}`} alt="" />}
      <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
        {initials || <User className="h-4 w-4" aria-hidden="true" />}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-card/80 px-4 backdrop-blur-md md:px-6">
      {/* Left section */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onToggleMobileMenu}
        aria-label={t("navbar.openMenu")}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full"
              aria-label={
                unreadCount > 0 ? t("navbar.notificationsUnread", { unread: unreadLabel }) : t("pages.notifications")
              }
              title={t("pages.notifications")}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full border-2 border-card bg-destructive px-1 text-[10px] font-semibold tabular-nums text-destructive-foreground"
                  aria-hidden="true"
                >
                  {unreadLabel}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto p-0">
            <DropdownMenuLabel className="px-4 py-3">
              <span className="block text-sm font-semibold">{t("pages.notifications")}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {unreadCount > 0 ? t("navbar.unread", { count: unreadCount, unread: unreadLabel }) : t("navbar.allRead")}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="m-0" />

            {notifications.length > 0 ? (
              notifications.slice(0, PREVIEW_COUNT).map((notification) => {
                const unread = !notification.is_read
                return (
                  <DropdownMenuItem
                    key={notification.id}
                    onSelect={() => handleNotificationClick(notification)}
                    className={cn(
                      "cursor-pointer items-start gap-3 rounded-none border-b border-border px-4 py-3",
                      unread && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        isHighPriority(notification) ? "bg-destructive" : unread ? "bg-primary" : "bg-transparent",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", unread ? "font-semibold" : "font-medium")}>
                        {notificationTypeLabel(notification.notification_type)}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDateTime(notification.notification_date)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )
              })
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("navbar.empty")}</p>
            )}

            <DropdownMenuItem
              onSelect={() => router.push("/notifications")}
              className="cursor-pointer justify-center rounded-none py-3 text-sm font-medium text-primary focus:text-primary"
            >
              {t("navbar.seeAll")}
              <ChevronRight className="h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        {showLoading ? (
          <div className="flex items-center gap-2" aria-hidden="true">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="hidden space-y-1.5 sm:block">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-10 gap-2 rounded-full pl-1 pr-1 sm:pr-3"
                aria-label={t("account.menu", { name: userName })}
              >
                {avatar("h-8 w-8")}
                <span className="hidden flex-col items-start leading-tight sm:flex">
                  <span className="max-w-[10rem] truncate text-sm font-medium text-foreground">{userName}</span>
                  {balance && <span className="text-xs font-normal text-muted-foreground tabular-nums">{balance}</span>}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-3 font-normal">
                {avatar("h-10 w-10")}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{userName}</span>
                  {userRole && <span className="block truncate text-xs text-muted-foreground">{roleLabel(userRole)}</span>}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/profile/")} className="cursor-pointer">
                <User className="h-4 w-4 text-muted-foreground" />
                {t("pages.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/profile/money_account")} className="cursor-pointer">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {t("pages.balance")}
                {balance && <span className="ml-auto text-sm font-medium tabular-nums">{balance}</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handleLogout()}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {t("account.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
