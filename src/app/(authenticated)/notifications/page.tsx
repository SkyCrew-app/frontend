"use client"

import { useMemo, useState } from "react"
import { useQuery, useMutation } from "@apollo/client"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight, Loader2, Search, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/format"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { useToast } from "@/components/hooks/use-toast"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import {
  DELETE_ALL_NOTIFICATIONS,
  GET_NOTIFICATIONS,
  MARK_ALL_NOTIFICATIONS_READ,
  REMOVE_NOTIFICATION,
  SEEN_NOTIFICATION,
} from "@/graphql/notifications"
import {
  type AppNotification,
  getNotificationTypeInFrench,
  groupNotificationsByDay,
  isHighPriority,
} from "@/interfaces/notification"

const PAGE_SIZE = 20

type TabValue = "all" | "unread" | "high"
type DeleteTarget = { kind: "one"; notification: AppNotification } | { kind: "all" }

const plural = (count: number) => (count > 1 ? "s" : "")

export default function NotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const userId = userData ? Number.parseInt(userData.id) : null

  const [selectedTab, setSelectedTab] = useState<TabValue>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  // The target outlives the closing of the dialog so its text does not change while it fades out.
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>({ kind: "all" })
  const [deleteOpen, setDeleteOpen] = useState(false)

  const {
    data: notificationsData,
    loading,
    error,
    refetch: refetchNotifications,
  } = useQuery(GET_NOTIFICATIONS, {
    variables: { userId: userId || 0 },
    skip: !userId,
  })

  const [seenNotification] = useMutation(SEEN_NOTIFICATION)
  const [removeNotification] = useMutation(REMOVE_NOTIFICATION)
  const [markAllNotificationsRead] = useMutation(MARK_ALL_NOTIFICATIONS_READ)
  const [deleteAllNotifications] = useMutation(DELETE_ALL_NOTIFICATIONS)

  // Newest first, whatever the order of the API.
  const notifications = useMemo<AppNotification[]>(
    () =>
      [...(notificationsData?.notificationsByUser ?? [])].sort(
        (a, b) => new Date(b.notification_date).getTime() - new Date(a.notification_date).getTime(),
      ),
    [notificationsData],
  )

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const highCount = notifications.filter(isHighPriority).length

  const filteredNotifications = useMemo(() => {
    let filtered = notifications
    if (selectedTab === "unread") filtered = filtered.filter((n) => !n.is_read)
    if (selectedTab === "high") filtered = filtered.filter(isHighPriority)

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      filtered = filtered.filter(
        (n) =>
          (n.message ?? "").toLowerCase().includes(query) ||
          getNotificationTypeInFrench(n.notification_type).toLowerCase().includes(query),
      )
    }
    return filtered
  }, [notifications, selectedTab, searchQuery])

  const totalPages = Math.max(Math.ceil(filteredNotifications.length / PAGE_SIZE), 1)
  // The list shrinks when notifications are deleted: never stay on a page that no longer exists.
  const page = Math.min(currentPage, totalPages)
  const pageItems = filteredNotifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const groups = groupNotificationsByDay(pageItems)

  const isFiltered = selectedTab !== "all" || searchQuery.trim() !== ""
  const filteredUnread = filteredNotifications.filter((n) => !n.is_read)
  const bulkBusy = isMarkingAllAsRead || isDeletingAll

  const handleTabChange = (value: string) => {
    setSelectedTab(value as TabValue)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
  }

  const handleNotificationAction = async (notification: AppNotification, actionUrl?: string | null) => {
    setBusyId(notification.id)
    try {
      if (!notification.is_read) {
        await seenNotification({ variables: { id: notification.id } })
        refetchNotifications()
      }
      if (actionUrl) router.push(actionUrl)
    } catch (error) {
      console.error("Erreur lors du marquage de la notification comme vue:", error)
      toast({
        variant: "destructive",
        title: "Action impossible",
        description: "La notification n'a pas pu être marquée comme lue.",
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleRemoveNotification = async (notification: AppNotification) => {
    setBusyId(notification.id)
    try {
      await removeNotification({ variables: { id: notification.id } })
      await refetchNotifications()
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error)
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La notification n'a pas pu être supprimée.",
      })
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    const count = filteredUnread.length
    setIsMarkingAllAsRead(true)
    try {
      if (isFiltered) {
        // Only the notifications of the filtered list: one by one.
        for (const notification of filteredUnread) {
          await seenNotification({ variables: { id: notification.id } })
        }
      } else {
        await markAllNotificationsRead()
      }
      toast({ title: `${count} notification${plural(count)} marquée${plural(count)} comme lue${plural(count)}` })
    } catch (error) {
      console.error("Erreur lors du marquage des notifications comme lues:", error)
      toast({
        variant: "destructive",
        title: "Action interrompue",
        description: "Toutes les notifications n'ont pas pu être marquées comme lues.",
      })
    } finally {
      await refetchNotifications().catch(() => undefined)
      setIsMarkingAllAsRead(false)
    }
  }

  const handleRemoveAllNotifications = async () => {
    const targets = filteredNotifications
    setIsDeletingAll(true)
    try {
      if (isFiltered) {
        for (const notification of targets) {
          await removeNotification({ variables: { id: notification.id } })
        }
      } else {
        await deleteAllNotifications()
      }
      toast({ title: `${targets.length} notification${plural(targets.length)} supprimée${plural(targets.length)}` })
    } catch (error) {
      console.error("Erreur lors de la suppression des notifications:", error)
      toast({
        variant: "destructive",
        title: "Suppression interrompue",
        description: "Toutes les notifications n'ont pas pu être supprimées.",
      })
    } finally {
      await refetchNotifications().catch(() => undefined)
      setIsDeletingAll(false)
    }
  }

  const askDelete = (target: DeleteTarget) => {
    setDeleteTarget(target)
    setDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (deleteTarget.kind === "one") void handleRemoveNotification(deleteTarget.notification)
    else void handleRemoveAllNotifications()
  }

  const isLoading = !userId || loading
  const deleteCount = filteredNotifications.length

  const renderList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Card className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="mt-1.5 h-2 w-2 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-full max-w-md" />
                </div>
                <Skeleton className="h-9 w-9" />
              </div>
            ))}
          </Card>
        </div>
      )
    }

    if (error && notifications.length === 0) {
      return <ErrorState onRetry={() => refetchNotifications()} />
    }

    if (filteredNotifications.length === 0) {
      return (
        <EmptyState
          icon={Bell}
          title={isFiltered ? "Aucune notification ne correspond" : "Aucune notification"}
          description={
            isFiltered
              ? "Modifiez votre recherche ou changez d'onglet."
              : "Les alertes sur vos réservations, vos cours et votre compte s'afficheront ici."
          }
          action={
            isFiltered ? (
              <Button
                variant="outline"
                onClick={() => {
                  handleSearchChange("")
                  setSelectedTab("all")
                }}
              >
                Afficher toutes les notifications
              </Button>
            ) : undefined
          }
        />
      )
    }

    return (
      <>
        {groups.map((group) => (
          <section key={group.label} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {group.items.map((notification) => {
                  const unread = !notification.is_read
                  const busy = busyId === notification.id
                  const type = getNotificationTypeInFrench(notification.notification_type)

                  return (
                    <li
                      key={notification.id}
                      className={cn(
                        "flex flex-col gap-3 p-4 sm:flex-row sm:items-start",
                        unread && "bg-primary/5",
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <p className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>{type}</p>
                            {unread && <span className="sr-only">(non lue)</span>}
                            {isHighPriority(notification) && <Badge variant="danger">Prioritaire</Badge>}
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatTime(notification.notification_date)}
                            </span>
                          </div>
                          <p className="mt-0.5 break-words text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-2 pl-5 sm:pl-0">
                        {notification.action_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy || bulkBusy}
                            onClick={() => handleNotificationAction(notification, notification.action_url)}
                          >
                            Voir
                          </Button>
                        )}
                        {unread && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9"
                            disabled={busy || bulkBusy}
                            onClick={() => handleNotificationAction(notification)}
                            aria-label={`Marquer comme lue : ${type}`}
                            title="Marquer comme lue"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy || bulkBusy}
                          onClick={() => askDelete({ kind: "one", notification })}
                          aria-label={`Supprimer : ${type}`}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </section>
        ))}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(page - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              Page {page} sur {totalPages}
            </p>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(page + 1)} disabled={page === totalPages}>
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        )}
      </>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        className="mb-0"
        title="Notifications"
        description={
          isLoading || notifications.length === 0
            ? undefined
            : unreadCount > 0
              ? `${unreadCount} non lue${plural(unreadCount)} sur ${notifications.length}`
              : "Tout est lu."
        }
        actions={
          filteredNotifications.length > 0 ? (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => askDelete({ kind: "all" })}
                disabled={bulkBusy}
              >
                {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Tout supprimer
              </Button>
              <Button onClick={handleMarkAllAsRead} disabled={bulkBusy || filteredUnread.length === 0}>
                {isMarkingAllAsRead ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                Tout marquer comme lu
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Rechercher dans les notifications"
            placeholder="Rechercher, ex. : réservation"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Tabs value={selectedTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="all">
              Toutes
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{notifications.length}</span>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Non lues
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{unreadCount}</span>
            </TabsTrigger>
            <TabsTrigger value="high">
              Prioritaires
              <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{highCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {renderList()}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget.kind === "one"
                ? "Supprimer cette notification ?"
                : `Supprimer ${deleteCount} notification${plural(deleteCount)} ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget.kind === "one"
                ? `« ${getNotificationTypeInFrench(deleteTarget.notification.notification_type)} » sera supprimée définitivement.`
                : isFiltered
                  ? "Seules les notifications de la liste filtrée seront supprimées. Cette action est définitive."
                  : "Toutes vos notifications seront supprimées. Cette action est définitive."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
