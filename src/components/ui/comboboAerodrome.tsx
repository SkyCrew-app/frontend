"use client"

import i18n from "@/lib/i18n"
import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useApolloClient } from "@apollo/client"
import { cn } from "@/lib/utils"
import { SEARCH_AERODROMES } from "@/graphql/aviation"
import { aerodromeLabel, findAerodromeByCode, isAerodromeQuery, type AerodromeSummary } from "@/lib/aerodromes"

const SEARCH_DELAY_MS = 300

interface AerodromeComboboxProps {
  onAerodromeChange: (aerodromeId: string) => void
  defaultValue?: string
  /** Id of the visible label: a combobox is not named by its text, it is named by the label and its value. */
  "aria-labelledby"?: string
}

export function AerodromeCombobox({ onAerodromeChange, defaultValue, "aria-labelledby": labelledBy }: AerodromeComboboxProps) {
  const valueId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(defaultValue || "")
  const [aerodromes, setAerodromes] = React.useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = React.useState(false)
  const [displayValue, setDisplayValue] = React.useState("")
  const client = useApolloClient()

  // Only the answer to the last search is shown.
  const lastSearch = React.useRef(0)
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show the name of the aerodrome already chosen.
  React.useEffect(() => {
    if (!defaultValue) return
    let cancelled = false

    findAerodromeByCode(client, defaultValue)
      .then((aerodrome) => {
        if (!cancelled) setDisplayValue(aerodrome ? aerodromeLabel(aerodrome) : defaultValue)
      })
      .catch(() => {
        if (!cancelled) setDisplayValue(defaultValue)
      })

    return () => {
      cancelled = true
    }
  }, [client, defaultValue])

  // Update value when defaultValue changes
  React.useEffect(() => {
    setValue(defaultValue || "")
  }, [defaultValue])

  React.useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    },
    [],
  )

  const fetchAerodromes = React.useCallback(
    async (query: string) => {
      const search = ++lastSearch.current
      try {
        const { data } = await client.query<{ searchAerodromes: AerodromeSummary[] }>({
          query: SEARCH_AERODROMES,
          variables: { query },
        })
        if (search !== lastSearch.current) return

        setAerodromes(
          (data?.searchAerodromes ?? [])
            .map((aerodrome) => ({
              id: aerodrome.icao || aerodrome.iata || "",
              name: aerodromeLabel(aerodrome),
            }))
            .filter((aerodrome) => aerodrome.id !== ""),
        )
      } catch {
        if (search === lastSearch.current) setAerodromes([])
      } finally {
        if (search === lastSearch.current) setLoading(false)
      }
    },
    [client],
  )

  const handleInputChange = (input: string) => {
    const query = input.trim()
    if (searchTimer.current) clearTimeout(searchTimer.current)

    if (!isAerodromeQuery(query)) {
      lastSearch.current++
      setAerodromes([])
      setLoading(false)
      return
    }

    // Wait for a pause in the typing before asking the API.
    setLoading(true)
    searchTimer.current = setTimeout(() => fetchAerodromes(query), SEARCH_DELAY_MS)
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
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
          className="w-full min-w-0 justify-between"
        >
          <span id={valueId} className="truncate">{displayValue || value || i18n.t("common:combobox.searchAerodrome")}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        {/* The API has already filtered the list: a name does not contain its code. */}
        <Command shouldFilter={false}>
          <CommandInput placeholder={i18n.t("common:combobox.searchAerodrome")} onValueChange={handleInputChange} />
          <CommandList className="max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>{i18n.t("common:combobox.loading")}</span>
              </div>
            ) : aerodromes.length === 0 ? (
              <CommandEmpty>{i18n.t("common:combobox.noAerodrome")}</CommandEmpty>
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
