export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  date_of_birth: string
  is2FAEnabled: boolean
  isEmailConfirmed: boolean
  phone_number: string
  role: Role | null
}

export interface Role {
  id: number
  role_name: string
}

export interface UserDetails extends User {
  phone_number: string
  address: string
  total_flight_hours: number
  user_account_balance: number
  reservations: Reservation[]
  licenses: License[]
}

export interface Reservation {
  id: string
  start_time: string
  end_time: string
  aircraft: {
    registration_number: string
    model: string
  }
}

export interface License {
  certification_authority: string
  license_number: string
  id: string
  license_type: string
  issue_date: string
  expiration_date: string
  documents_url: string[]
}
