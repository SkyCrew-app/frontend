"use client"

import { useState, useEffect } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, Plane, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { aviationAPI, type Airport } from "@/lib/aviation-api"

interface AirportSearchProps {
  /** Id of the trigger button, so a <Label htmlFor> can point at it. */
  id?: string
  invalid?: boolean
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
}

export function AirportSearch({ id, invalid = false, value, onChange, label, placeholder }: AirportSearchProps) {
  const [open, setOpen] = useState(false)
  const [airports, setAirports] = useState<Airport[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null)

  useEffect(() => {
    const loadSelectedAirport = async () => {
      if (value) {
        try {
          setLoading(true)
          const airport = await aviationAPI.getAirportByICAO(value)
          setSelectedAirport(airport)
          setError(null)
        } catch (err) {
          console.error("Erreur lors du chargement de l'aéroport:", err)
          setError("Les détails de l'aérodrome n'ont pas pu être chargés.")
        } finally {
          setLoading(false)
        }
      } else {
        setSelectedAirport(null)
      }
    }
    loadSelectedAirport()
  }, [value])

  useEffect(() => {
    const fetchAirports = async () => {
      if (searchQuery.length >= 2) {
        setLoading(true)
        setError(null)
        try {
          const results = await aviationAPI.searchAirports(searchQuery)
          setAirports(results)
          if (results.length === 0) {
            setError("Aucun aérodrome trouvé pour cette recherche.")
          }
        } catch (err) {
          setError("La recherche d'aérodromes est indisponible pour le moment.")
          console.error(err)
        } finally {
          setLoading(false)
        }
      } else {
        setAirports([])
      }
    }

    const debounceTimer = setTimeout(fetchAirports, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn("w-full justify-between font-normal", invalid && "border-destructive")}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedAirport ? (
              <span className="truncate">
                {selectedAirport.icao} — {selectedAirport.name}
              </span>
            ) : value ? (
              value
            ) : (
              <span className="truncate text-muted-foreground">{label}</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
        {/* Results are already filtered by the search API (by code, name or city). */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder || "Code OACI, nom ou ville"} onValueChange={setSearchQuery} />
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
              {airports.map((airport) => (
                <CommandItem
                  key={airport.id}
                  value={airport.icao}
                  onSelect={() => {
                    // Not the value handed by the list, which is lower-cased.
                    onChange(airport.icao)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === airport.icao ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="truncate">{airport.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {airport.icao} {airport.city && `- ${airport.city}`}
                      {airport.country && `, ${airport.country}`}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
