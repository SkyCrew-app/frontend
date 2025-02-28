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