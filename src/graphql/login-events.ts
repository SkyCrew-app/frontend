import { gql } from "@apollo/client"

// The connection log: every sign-in of the club, for administrators.
export const GET_LOGIN_EVENTS = gql`
  query GetLoginEvents(
    $page: Int
    $pageSize: Int
    $memberId: Int
    $outcome: LoginOutcome
    $from: DateTime
    $to: DateTime
  ) {
    loginEvents(page: $page, pageSize: $pageSize, memberId: $memberId, outcome: $outcome, from: $from, to: $to) {
      total
      page
      pageSize
      items {
        id
        created_at
        user_id
        member_name
        attempted_email
        outcome
        method
        ip_address
        browser
        os
        device_type
      }
    }
  }
`

// The latest sign-ins on the account of the member signed in.
export const GET_MY_LOGIN_EVENTS = gql`
  query GetMyLoginEvents {
    myLoginEvents {
      id
      created_at
      outcome
      method
      ip_address
      browser
      os
      device_type
    }
  }
`
