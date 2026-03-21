import { gql } from '@apollo/client';

export const UPDATE_DASHBOARD_WIDGETS = gql`
  mutation UpdateDashboardWidgets($userId: Int!, $widgets: [DashboardWidgetConfigInput!]!) {
    updateDashboardWidgets(userId: $userId, widgets: $widgets) {
      id
      dashboard_widgets {
        widgetId
        visible
        order
        size
      }
    }
  }
`;
