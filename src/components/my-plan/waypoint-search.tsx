"use client"

import { useState, useEffect } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ChevronsUpDown, Navigation2, X, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { aviationAPI, formatWaypoint, type Waypoint } from "@/lib/aviation-api"
import { useTranslations } from "next-intl"

interface WaypointSearchProps {
  waypoints: string[]
  onChange: (waypoints: string[]) => void
}

export function WaypointSearch({ waypoints, onChange }: WaypointSearchProps) {
  const t = useTranslations("reservation")
  const [open, setOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<Waypoint[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedWaypoints, setSelectedWaypoints] = useState<Waypoint[]>([])

  useEffect(() => {
    const fetchWaypoints = async () => {
      if (searchQuery.length >= 2) {
        setLoading(true)
        setError(null)
        try {
          const results = await aviationAPI.searchWaypoints(searchQuery)
          setSearchResults(results)
          if (results.length === 0) {
            setError(t('noWaypoints'))
          }
        } catch (err) {
          setError(t('waypointError'))
          console.error(err)
        } finally {
          setLoading(false)
        }
      } else {
        setSearchResults([])
      }
    }

    const debounceTimer = setTimeout(fetchWaypoints, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  useEffect(() => {
    const loadSelectedWaypoints = async () => {
      if (waypoints.length === 0) {
        setSelectedWaypoints([])
        return
      }

      setLoading(true)
      try {
        const loaded = await Promise.all(
          waypoints.map(async (id) => {
            let waypoint = await aviationAPI.getWaypointById(id)

            if (!waypoint) {
              waypoint = await aviationAPI.getWaypointByIdent(id)
            }

            return waypoint
          }),
        )

        setSelectedWaypoints(loaded.filter((w): w is Waypoint => w !== null))
        setError(null)
      } catch (err) {
        console.error("Erreur lors du chargement des waypoints:", err)
        setError(t('waypointError'))
      } finally {
        setLoading(false)
      }
    }

    loadSelectedWaypoints()
  }, [waypoints])

  const addWaypoint = (waypoint: Waypoint) => {
    if (!waypoints.includes(waypoint.id) && !waypoints.includes(waypoint.ident)) {
      onChange([...waypoints, waypoint.id || waypoint.ident])
    }
    setOpen(false)
  }

  const removeWaypoint = (waypointId: string) => {
    onChange(waypoints.filter((w) => w !== waypointId))
  }

  const getWaypointTypeColor = (type: string) => {
    if (type.includes("VOR")) return "bg-blue-100 text-blue-800"
    if (type.includes("NDB")) return "bg-purple-100 text-purple-800"
    if (type.includes("DME")) return "bg-yellow-100 text-yellow-800"
    if (type.includes("ILS")) return "bg-green-100 text-green-800"
    if (type.includes("TACAN")) return "bg-red-100 text-red-800"
    return "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            <div className="flex items-center">
              <Navigation2 className="mr-2 h-4 w-4" />
              {t('addWaypoint')}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un waypoint..." onValueChange={setSearchQuery} />
            <CommandList>
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('searchWaypoint')}
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center p-4 text-amber-500">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {error}
                  </div>
                ) : (
                  t('noWaypoint')
                )}
              </CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {searchResults.map((waypoint) => (
                  <CommandItem key={waypoint.id} value={waypoint.ident} onSelect={() => addWaypoint(waypoint)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        waypoints.includes(waypoint.id) || waypoints.includes(waypoint.ident)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{waypoint.ident}</span>
                        {waypoint.name && waypoint.name !== waypoint.ident && (
                          <span className="text-sm text-muted-foreground">- {waypoint.name}</span>
                        )}
                        <Badge variant="secondary" className={getWaypointTypeColor(waypoint.type)}>
                          {waypoint.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {waypoint.frequency_khz && `${(waypoint.frequency_khz / 1000).toFixed(1)} MHz`}
                        {waypoint.country && ` - ${waypoint.country}`}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedWaypoints.length > 0 && (
        <ScrollArea className="h-[200px] rounded-md border p-4">
          <div className="space-y-2">
            {selectedWaypoints.map((waypoint, index) => (
              <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium w-6 text-center">{index + 1}</span>
                  <div className="flex flex-col">
                    <span>{waypoint.name || waypoint.ident}</span>
                    <span className="text-sm text-muted-foreground">{formatWaypoint(waypoint)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeWaypoint(waypoint.id || waypoint.ident)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
