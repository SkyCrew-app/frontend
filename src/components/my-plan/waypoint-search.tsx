"use client"

import { useState, useEffect } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronsUpDown, Navigation2, X, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { aviationAPI, formatWaypoint, type Waypoint } from "@/lib/aviation-api"

interface WaypointSearchProps {
  /** Id of the trigger button, so a <Label htmlFor> can point at it. */
  id?: string
  waypoints: string[]
  onChange: (waypoints: string[]) => void
}

export function WaypointSearch({ id, waypoints, onChange }: WaypointSearchProps) {
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
            setError("Aucun point trouvé pour cette recherche.")
          }
        } catch (err) {
          setError("La recherche de points est indisponible pour le moment.")
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
        setError("Certains points de route n'ont pas pu être chargés.")
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

  // The route stores either the id or the identifier of a point: remove whichever is there.
  const removeWaypoint = (waypoint: Waypoint) => {
    onChange(waypoints.filter((w) => w !== waypoint.id && w !== waypoint.ident))
  }

  const getWaypointTypeColor = (type: string) => {
    if (type.includes("VOR")) return "success" as const
    if (type.includes("NDB")) return "warning" as const
    if (type.includes("DME") || type.includes("ILS") || type.includes("TACAN")) return "info" as const
    return "neutral" as const
  }

  return (
    <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2">
              <Navigation2 className="h-4 w-4 text-muted-foreground" />
              Ajouter un point de route
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
          {/* Results are already filtered by the search API. */}
          <Command shouldFilter={false}>
            <CommandInput placeholder="Identifiant ou nom (VOR, NDB, point…)" onValueChange={setSearchQuery} />
            <CommandList>
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche en cours…
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center p-4 text-warning">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {error}
                  </div>
                ) : (
                  "Saisissez au moins deux caractères."
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
                        <Badge variant={getWaypointTypeColor(waypoint.type)}>
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
        <ol className="max-h-56 space-y-2 overflow-y-auto">
          {selectedWaypoints.map((waypoint, index) => (
            <li key={index} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-center text-sm font-medium tabular-nums">{index + 1}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{waypoint.name || waypoint.ident}</p>
                  <p className="truncate text-xs text-muted-foreground">{formatWaypoint(waypoint)}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeWaypoint(waypoint)}
                className="h-9 w-9 shrink-0"
                aria-label={`Retirer ${waypoint.ident} de la route`}
                title="Retirer"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
