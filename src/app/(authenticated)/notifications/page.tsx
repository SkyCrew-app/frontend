"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import {
  Bell,
  Check,
  Trash2,
  Filter,
  AlertTriangle,
  Info,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  Loader2,
  X,
  Clock,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { Badge } from "@/components/ui/badge"
import { GET_NOTIFICATIONS, SEEN_NOTIFICATION, REMOVE_NOTIFICATION } from "@/graphql/notifications"
import { getNotificationTypeInFrench } from "@/interfaces/notification"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"

export default function NotificationsPage() {
  const router = useRouter()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<number | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false)
  const [selectedTab, setSelectedTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const itemsPerPage = 5

  const {
    data: notificationsData,
    loading,
    refetch: refetchNotifications,
  } = useQuery(GET_NOTIFICATIONS, {
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

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

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

  const handleMarkAllAsRead = async () => {
    setIsMarkingAllAsRead(true)
    try {
      const unreadNotifications = filteredNotifications.filter((n) => !n.is_read)
      for (const notification of unreadNotifications) {
        await seenNotification({ variables: { id: notification.id } })
      }
      await refetchNotifications()
    } catch (error) {
      console.error("Erreur lors du marquage des notifications comme lues:", error)
    } finally {
      setIsMarkingAllAsRead(false)
    }
  }

  const handleRemoveAllNotifications = async () => {
    try {
      for (const notification of filteredNotifications) {
        await removeNotification({ variables: { id: notification.id } })
      }
      await refetchNotifications()
    } catch (error) {
      console.error("Erreur lors de la suppression des notifications:", error)
    }
  }

  const getFilteredNotifications = () => {
    let filtered = [...notifications]

    if (selectedTab === "unread") {
      filtered = filtered.filter((n) => !n.is_read)
    } else if (selectedTab === "high") {
      filtered = filtered.filter((n) => n.priority === "high")
    }

    if (filter !== "all") {
      if (filter === "unread") {
        filtered = filtered.filter((n) => !n.is_read)
      } else {
        filtered = filtered.filter((n) => n.priority === filter)
      }
    }

    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (n) =>
          n.message.toLowerCase().includes(query) ||
          getNotificationTypeInFrench(n.notification_type).toLowerCase().includes(query),
      )
    }

    return filtered
  }

  const filteredNotifications = getFilteredNotifications()

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage)
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const priorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case "medium":
        return <Info className="h-5 w-5 text-yellow-500" />
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
    }
  }

  const priorityBorder = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-4 border-red-500"
      case "medium":
        return "border-l-4 border-yellow-500"
      case "low":
        return "border-l-4 border-green-500"
      default:
        return "border-l-4 border-blue-500"
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return `Il y a ${diffInSeconds} seconde${diffInSeconds !== 1 ? "s" : ""}`
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""}`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `Il y a ${diffInHours} heure${diffInHours !== 1 ? "s" : ""}`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `Il y a ${diffInDays} jour${diffInDays !== 1 ? "s" : ""}`
    }

    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const renderContent = () => {
    if (loading) {
      return (
        <div className="container mx-auto p-4 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="flex justify-between items-center mb-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-40 w-full rounded-lg mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="w-full p-4 max-w-full overflow-hidden">
        <header className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Notifications</h1>
              <p className="text-gray-500 dark:text-gray-400">
                Gérez vos alertes et restez informé des mises à jour importantes
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredNotifications.some((n) => !n.is_read) && (
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-primary border-primary/30 hover:bg-primary/10 transition-all duration-300"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                >
                  {isMarkingAllAsRead ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="mr-2 h-4 w-4" />
                  )}
                  Tout marquer comme lu
                </Button>
              )}

              {filteredNotifications.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-white dark:bg-gray-800 text-red-500 border-red-500/30 hover:bg-red-500/10 transition-all duration-300"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Tout supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-gray-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera toutes les notifications filtrées actuellement affichées. Cette action
                        est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-all duration-300">
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRemoveAllNotifications}
                        className="bg-red-500 hover:bg-red-600 text-white transition-all duration-300"
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </header>

        <Card className="mb-4 border border-gray-200 dark:border-gray-700 shadow-sm transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Centre de notifications
            </CardTitle>
            <CardDescription>
              Vous avez {notifications.length} notifications, dont{" "}
              <span className="font-medium text-blue-500">{notifications.filter((n) => !n.is_read).length}</span> non
              lues.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-1 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher dans vos notifications..."
                className="pl-10 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 bg-gray-100 dark:bg-gray-800 p-1">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 transition-all duration-300"
                >
                  Toutes
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                  >
                    {notifications.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 transition-all duration-300"
                >
                  Non lues
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                  >
                    {notifications.filter((n) => !n.is_read).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger
                  value="high"
                  className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 transition-all duration-300"
                >
                  Prioritaires
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
                  >
                    {notifications.filter((n) => n.priority === "high").length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
          <CardFooter className="pt-1 flex justify-between">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtrer par priorité
                  {filter !== "all" && <Badge className="ml-2 bg-primary/10 text-primary">{filter}</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
                <DropdownMenuItem
                  className={`${filter === "all" ? "bg-primary/10 text-primary" : ""} cursor-pointer transition-colors duration-200`}
                  onClick={() => setFilter("all")}
                >
                  Toutes les priorités
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${filter === "unread" ? "bg-primary/10 text-primary" : ""} cursor-pointer transition-colors duration-200`}
                  onClick={() => setFilter("unread")}
                >
                  Non lues
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={`${filter === "high" ? "bg-primary/10 text-primary" : ""} cursor-pointer transition-colors duration-200`}
                  onClick={() => setFilter("high")}
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Priorité haute
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${filter === "medium" ? "bg-primary/10 text-primary" : ""} cursor-pointer transition-colors duration-200`}
                  onClick={() => setFilter("medium")}
                >
                  <Info className="mr-2 h-4 w-4 text-yellow-500" />
                  Priorité moyenne
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`${filter === "low" ? "bg-primary/10 text-primary" : ""} cursor-pointer transition-colors duration-200`}
                  onClick={() => setFilter("low")}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Priorité basse
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Badge variant="secondary" className="bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""}
            </Badge>
          </CardFooter>
        </Card>

        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
          >
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <Bell className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">Aucune notification</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              {searchQuery
                ? "Aucun résultat ne correspond à votre recherche. Essayez avec d'autres termes."
                : "Vous n'avez aucune notification correspondant à vos critères de filtrage."}
            </p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.ul
                className="space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key={`${selectedTab}-${filter}-${currentPage}-${searchQuery}`}
              >
                {paginatedNotifications.map((notification) => (
                  <motion.li
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md overflow-hidden transition-all duration-300 ${
                      !notification.is_read
                        ? priorityBorder(notification.priority)
                        : "border border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`p-3 rounded-full ${priorityColor(notification.priority)}`}>
                          {priorityIcon(notification.priority)}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                            {getNotificationTypeInFrench(notification.notification_type)}
                          </h3>
                          {!notification.is_read && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                              Nouveau
                            </Badge>
                          )}
                          <Badge className={`${priorityColor(notification.priority)}`}>
                            {notification.priority === "high" && "Haute priorité"}
                            {notification.priority === "medium" && "Priorité moyenne"}
                            {notification.priority === "low" && "Priorité basse"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{notification.message}</p>
                        <div className="flex items-center text-xs text-gray-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {getTimeAgo(notification.notification_date)}
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 mt-3 md:mt-0">
                        {!notification.is_read && (
                          <Button
                            onClick={() => handleNotificationAction(notification.id)}
                            size="sm"
                            variant="outline"
                            className="text-blue-500 border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-800 dark:hover:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-300"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Marquer comme lu</span>
                            <span className="inline sm:hidden">Lu</span>
                          </Button>
                        )}
                        {notification.action_url && (
                          <Button
                            onClick={() => handleNotificationAction(notification.id, notification.action_url)}
                            size="sm"
                            variant="default"
                            className="bg-primary hover:bg-primary/90 text-white transition-all duration-300"
                          >
                            Voir
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRemoveNotification(notification.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            </AnimatePresence>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <nav className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-md transition-all duration-200 ${
                      currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      const shouldShow =
                        page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)

                      const showLeftEllipsis = page === currentPage - 1 && currentPage > 3
                      const showRightEllipsis = page === currentPage + 1 && currentPage < totalPages - 2

                      if (!shouldShow && !showLeftEllipsis && !showRightEllipsis) return null

                      if (showLeftEllipsis) {
                        return (
                          <div
                            key={`ellipsis-left-${page}`}
                            className="flex flex-col justify-center h-9 px-1 text-gray-400"
                          >
                            ...
                          </div>
                        )
                      }

                      if (showRightEllipsis) {
                        return (
                          <div
                            key={`ellipsis-right-${page}`}
                            className="flex flex-col justify-center h-9 px-1 text-gray-400"
                          >
                            ...
                          </div>
                        )
                      }

                      return (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? "default" : "ghost"}
                          size="icon"
                          className={`relative h-9 w-9 rounded-md transition-all duration-200 ${
                            currentPage === page ? "bg-primary text-white" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                          aria-label={`Page ${page}`}
                          aria-current={currentPage === page ? "page" : undefined}
                        >
                          {page}
                          {currentPage === page && (
                            <span
                              className="absolute inset-0 rounded-md animate-pulse bg-primary/20 dark:bg-primary/30"
                              style={{ animationDuration: "3s" }}
                            ></span>
                          )}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-md transition-all duration-200 ${
                      currentPage === totalPages
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  return <div>{renderContent()}</div>
}

