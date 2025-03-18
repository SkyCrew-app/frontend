import { z } from "zod"

const elevationSchema = z.object({
  value: z.number(),
  unit: z.union([z.string(), z.number()]),
  referenceDatum: z.number().optional(),
})

const frequencySchema = z.object({
  value: z.union([z.string(), z.number()]),
  unit: z.union([z.string(), z.number()]),
})

const openAipAirportSchema = z.object({
  _id: z.string(),
  name: z.string(),
  icaoCode: z.string().optional().nullable(),
  iataCode: z.string().optional().nullable(),
  cityName: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  elevation: elevationSchema.optional().nullable(),
  geometry: z.object({
    coordinates: z.tuple([z.number(), z.number()]),
    type: z.string(),
  }),
  type: z.number().optional().nullable(),
})

const openAipNavaidSchema = z.object({
  _id: z.string(),
  name: z.string().optional().nullable(),
  identifier: z.string(),
  type: z.number(),
  geometry: z.object({
    coordinates: z.tuple([z.number(), z.number()]),
    type: z.string(),
  }),
  elevation: elevationSchema.optional().nullable(),
  frequency: frequencySchema.optional().nullable(),
  country: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
})

export interface Airport {
  id: string
  icao: string
  name: string
  city?: string | null
  country?: string | null
  countryCode?: string | null
  lat: number
  lon: number
  elevation?: number | null
}

export interface Waypoint {
  id: string
  ident: string
  name?: string | null
  type: string
  lat: number
  lon: number
  elevation?: number | null
  frequency_khz?: number | null
  country?: string | null
  countryCode?: string | null
}

export class AviationAPI {
  private baseUrl: string
  private cache: Map<string, { data: any; timestamp: number }>
  private cacheDuration: number

  constructor() {
    this.baseUrl = "https://api.core.openaip.net/api"
    this.cache = new Map()
    this.cacheDuration = 30 * 60 * 1000
  }

  private async fetchWithCache<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const apiKey = process.env.NEXT_PUBLIC_OPENAIP_API_KEY
    if (!apiKey) {
      throw new Error("OpenAIP API key is missing. Please set NEXT_PUBLIC_OPENAIP_API_KEY environment variable.")
    }

    const queryParams = { ...params, apiKey }
    const queryString = new URLSearchParams(queryParams).toString()
    const cacheKey = `${endpoint}?${queryString}`

    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      console.log("Using cached data for", endpoint)
      return cached.data as T
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}?${queryString}`, {
        headers: {
          "x-openaip-api-key": apiKey,
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })

      return data as T
    } catch (error) {
      console.error("API error:", error)

      if (cached) {
        console.log("Using expired cached data due to error")
        return cached.data as T
      }

      throw error
    }
  }

  private convertOpenAipAirport(data: z.infer<typeof openAipAirportSchema>): Airport {
    const [lon, lat] = data.geometry.coordinates

    const elevation = data.elevation?.value || null

    return {
      id: data._id,
      icao: data.icaoCode || `UNKNOWN-${data._id.substring(0, 6)}`,
      name: data.name,
      city: data.cityName,
      country: data.countryCode,
      lat,
      lon,
      elevation,
    }
  }

  private convertOpenAipNavaid(data: z.infer<typeof openAipNavaidSchema>): Waypoint {
    const [lon, lat] = data.geometry.coordinates

    const elevation = data.elevation?.value || null

    let frequency_khz = null
    if (data.frequency?.value) {
      frequency_khz =
        typeof data.frequency.value === "string" ? Number.parseFloat(data.frequency.value) : data.frequency.value
    }

    const typeMap: Record<number, string> = {
      0: "VOR",
      1: "VORDME",
      2: "DME",
      3: "NDB",
      4: "TACAN",
      5: "VORTAC",
      6: "LOCATOR",
      7: "ILS",
      8: "OTHER",
    }

    return {
      id: data._id,
      ident: data.identifier,
      name: data.name || data.identifier,
      type: typeMap[data.type] || `TYPE-${data.type}`,
      lat,
      lon,
      elevation,
      frequency_khz,
      country: data.country || data.countryCode,
    }
  }

  async searchAirports(query: string): Promise<Airport[]> {
    if (query.length < 2) return []

    try {
      const data = await this.fetchWithCache<any>("/airports", {
        search: query,
        limit: "10",
        page: "1",
      })

      if (!data || !data.items || !Array.isArray(data.items)) {
        return []
      }

      return data.items
        .map((item: any) => {
          try {
            const parsed = openAipAirportSchema.parse(item)
            return this.convertOpenAipAirport(parsed)
          } catch (error) {
            console.error("Error parsing airport data:", error)
            return null
          }
        })
        .filter((item: any): item is Airport => item !== null)
    } catch (error) {
      console.error("Error searching airports:", error)
      return []
    }
  }

  async getAirportByICAO(icao: string): Promise<Airport | null> {
    try {
      const data = await this.fetchWithCache<any>("/airports", {
        search: icao,
        searchOptLwc: "false",
      })

      if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return null
      }

      const exactMatch = data.items.find((item: any) => item.icaoCode === icao)
      if (exactMatch) {
        try {
          const parsed = openAipAirportSchema.parse(exactMatch)
          return this.convertOpenAipAirport(parsed)
        } catch (error) {
          console.error("Error parsing airport data:", error)
          return null
        }
      }

      try {
        const parsed = openAipAirportSchema.parse(data.items[0])
        return this.convertOpenAipAirport(parsed)
      } catch (error) {
        console.error("Error parsing airport data:", error)
        return null
      }
    } catch (error) {
      console.error(`Error fetching airport ${icao}:`, error)
      return null
    }
  }

  async getAirportById(id: string): Promise<Airport | null> {
    try {
      const data = await this.fetchWithCache<any>(`/airports`, { id })

      if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return null
      }

      try {
        const parsed = openAipAirportSchema.parse(data.items[0])
        return this.convertOpenAipAirport(parsed)
      } catch (error) {
        console.error("Error parsing airport data:", error)
        return null
      }
    } catch (error) {
      console.error(`Error fetching airport by ID ${id}:`, error)
      return null
    }
  }

  async searchWaypoints(query: string): Promise<Waypoint[]> {
    if (query.length < 2) return []

    try {
      const data = await this.fetchWithCache<any>("/navaids", {
        search: query,
        searchFields: "identifier,name",
        limit: "10",
        page: "1",
      })

      if (!data || !data.items || !Array.isArray(data.items)) {
        return []
      }

      return data.items
        .map((item: any) => {
          try {
            const parsed = openAipNavaidSchema.parse(item)
            return this.convertOpenAipNavaid(parsed)
          } catch (error) {
            console.error("Error parsing navaid data:", error)
            return null
          }
        })
        .filter((item: any): item is Waypoint => item !== null)
    } catch (error) {
      console.error("Error searching waypoints:", error)
      return []
    }
  }

  async getWaypointById(id: string): Promise<Waypoint | null> {
    try {
      const data = await this.fetchWithCache<any>(`/navaids`, { id })

      if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return null
      }

      try {
        const parsed = openAipNavaidSchema.parse(data.items[0])
        return this.convertOpenAipNavaid(parsed)
      } catch (error) {
        console.error("Error parsing navaid data:", error)
        return null
      }
    } catch (error) {
      console.error(`Error fetching waypoint by ID ${id}:`, error)
      return null
    }
  }

  async getWaypointByIdent(ident: string): Promise<Waypoint | null> {
    try {
      const data = await this.fetchWithCache<any>("/navaids", {
        search: ident,
        searchFields: "identifier",
        searchOptLwc: "false",
      })

      if (!data || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
        return null
      }

      const exactMatch = data.items.find((item: any) => item.identifier === ident)
      if (exactMatch) {
        try {
          const parsed = openAipNavaidSchema.parse(exactMatch)
          return this.convertOpenAipNavaid(parsed)
        } catch (error) {
          console.error("Error parsing navaid data:", error)
          return null
        }
      }

      try {
        const parsed = openAipNavaidSchema.parse(data.items[0])
        return this.convertOpenAipNavaid(parsed)
      } catch (error) {
        console.error("Error parsing navaid data:", error)
        return null
      }
    } catch (error) {
      console.error(`Error fetching waypoint ${ident}:`, error)
      return null
    }
  }
}

export const aviationAPI = new AviationAPI()

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(value: number): number {
  return (value * Math.PI) / 180
}

export function calculateEstimatedTime(distance: number, speed = 120): number {
  return (distance / (speed * 1.852)) * 60
}

export function formatWaypoint(waypoint: Waypoint): string {
  if (waypoint.name && waypoint.name !== waypoint.ident) {
    return `${waypoint.ident} - ${waypoint.name} (${waypoint.type})`
  } else {
    return `${waypoint.ident} (${waypoint.type})`
  }
}
