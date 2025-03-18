export interface Weather {
  temperature: number
  conditions: string
  icon?: string
  wind?: {
    speed: number
    direction: number
  }
  humidity?: number
  pressure?: number
  visibility?: number
}
