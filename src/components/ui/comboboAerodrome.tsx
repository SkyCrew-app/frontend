"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface AerodromeComboboxProps {
  onAerodromeChange: (aerodromeId: string) => void
  defaultValue?: string
}

export function AerodromeCombobox({ onAerodromeChange, defaultValue }: AerodromeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue || "")
  const [aerodromes, setAerodromes] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [displayValue, setDisplayValue] = React.useState("")

  // Fetch the aerodrome name for the default value on component mount
  React.useEffect(() => {
    if (defaultValue && defaultValue.length > 0 && !displayValue) {
      console.log("Fetching aerodrome name for default value:", defaultValue);
      fetchAerodromeName(defaultValue);
    }
  }, [defaultValue]);

  // Update value when defaultValue changes
  React.useEffect(() => {
    if (defaultValue !== value) {
      setValue(defaultValue || "");
    }
  }, [defaultValue]);

  const fetchAerodromeName = async (aerodromeId: string) => {
    if (!aerodromeId) return;
    
    try {
      // Try to fetch the specific aerodrome by ID or code
      const response = await fetch(`https://api.api-ninjas.com/v1/airports?icao=${aerodromeId}`, {
        headers: {
          "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU",
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération de l'aérodrome");
      }

      const data = await response.json();
      if (data && data.length > 0) {
        setDisplayValue(`${data[0].name} (${data[0].iata || data[0].icao})`);
      } else {
        // If not found by ICAO, try by IATA
        const iataResponse = await fetch(`https://api.api-ninjas.com/v1/airports?iata=${aerodromeId}`, {
          headers: {
            "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU",
          },
        });
        
        if (iataResponse.ok) {
          const iataData = await iataResponse.json();
          if (iataData && iataData.length > 0) {
            setDisplayValue(`${iataData[0].name} (${iataData[0].iata || iataData[0].icao})`);
          } else {
            setDisplayValue(aerodromeId); // Fallback to ID if not found
          }
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du nom de l'aérodrome:", error);
      setDisplayValue(aerodromeId); // Fallback to ID if error
    }
  };

  const fetchAerodromes = React.useCallback(async (query: string) => {
    if (query.length < 2) return

    setLoading(true)
    try {
      const response = await fetch(`https://api.api-ninjas.com/v1/airports?icao=${query}`, {
        headers: {
          "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU",
        },
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des aérodromes")
      }

      const data = await response.json()
      const formattedData = data.map((aerodrome: any) => ({
        id: aerodrome.icao || aerodrome.iata || aerodrome.id,
        name: `${aerodrome.name} (${aerodrome.iata || aerodrome.icao})`,
      }))

      setAerodromes(formattedData)
    } catch (error) {
      console.error("Erreur:", error)
      setAerodromes([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (query: string) => {
    if (query.length < 2) {
      setAerodromes([])
      return
    }
    fetchAerodromes(query)
  }

  const handleSelect = (currentValue: string) => {
    const selected = aerodromes.find((aerodrome) => aerodrome.id === currentValue)
    setValue(currentValue)
    setDisplayValue(selected ? selected.name : currentValue)
    onAerodromeChange(currentValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {displayValue || value || "Rechercher un aérodrome..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un aérodrome..." onValueChange={handleInputChange} />
          <CommandList className="max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Chargement...</span>
              </div>
            ) : aerodromes.length === 0 ? (
              <CommandEmpty>Aucun aérodrome trouvé.</CommandEmpty>
            ) : (
              <CommandGroup>
                {aerodromes.map((aerodrome) => (
                  <CommandItem
                    key={aerodrome.id}
                    value={aerodrome.id}
                    onSelect={() => handleSelect(aerodrome.id)}
                    className="flex items-center justify-between"
                  >
                    <span>{aerodrome.name}</span>
                    <Check className={cn("ml-auto h-4 w-4", value === aerodrome.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
