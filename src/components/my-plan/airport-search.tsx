"use client"

import { useState, useEffect, use } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown, Plane, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { aviationAPI, type Airport } from "@/lib/aviation-api"
import { useTranslations } from "next-intl"

interface AirportSearchProps {
  value: string
  onChange: (value: string) =>  void
  label: string
  placeholder?: string
}

export function AirportSearch({ value, onChange, label, placeholder }: AirportSearchProps) {
  const t = useTranslations("reservation")
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
          setError(t('errorAirportDetails'))
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
            setError(t('noAirportsFound'))
          }
        } catch (err) {
          setError(t('errorFetchingAirports'))
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
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          <div className="flex items-center">
            <Plane className="mr-2 h-4 w-4" />
            {selectedAirport ? (
              <span className="truncate">
                {selectedAirport.name} ({selectedAirport.icao})
              </span>
            ) : value ? (
              value
            ) : (
              label
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder={placeholder || t('searchAirports')} onValueChange={setSearchQuery} />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('searchInProgress')}
                </div>
              ) : error ? (
                <div className="flex items-center justify-center p-4 text-amber-500">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {error}
                </div>
              ) : (
                t('noAirportFound')
              )}
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {airports.map((airport) => (
                <CommandItem
                  key={airport.id}
                  value={airport.icao}
                  onSelect={(currentValue) => {
                    onChange(currentValue)
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
