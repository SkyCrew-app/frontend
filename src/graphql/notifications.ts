import { gql } from '@apollo/client'

export const GET_NOTIFICATIONS = gql`
  query NotificationsByUser($userId: Int!) {
    notificationsByUser(userId: $userId) {
      id
      notification_type
      message
      notification_date
      is_read
      action_url
      priority
    }
  }
`

export const SEEN_NOTIFICATION = gql`
  mutation SeenNotification($id: Int!) {
    seenNotification(id: $id)
  }
`

export const REMOVE_NOTIFICATION = gql`
  mutation RemoveNotification($id: Int!) {
    removeNotification(id: $id)
  }
`

// Bulk actions on the signed-in user's own notifications, in one request.
export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`

export const DELETE_ALL_NOTIFICATIONS = gql`
  mutation DeleteAllNotifications {
    deleteAllNotifications
  }
`
