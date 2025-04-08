"use client"

import { useState } from "react"
import { Command, CommandInput, CommandGroup, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function TimezoneCombobox({
  onTimezoneChange,
  selectedTimezone,
}: {
  onTimezoneChange: (value: string) => void
  selectedTimezone: string
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const allTimezones = Intl.supportedValuesOf("timeZone")

  const timezonesByRegion = allTimezones.reduce((acc: Record<string, string[]>, timezone) => {
    const [region, city] = timezone.split("/")
    if (!city) return acc
    if (!acc[region]) acc[region] = []
    acc[region].push(timezone)
    return acc
  }, {})

  // Filter timezones based on search query
  const filteredTimezonesByRegion = Object.entries(timezonesByRegion).reduce(
    (acc: Record<string, string[]>, [region, timezones]) => {
      const filteredTimezones = timezones.filter((timezone) =>
        timezone.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      if (filteredTimezones.length > 0) {
        acc[region] = filteredTimezones
      }
      return acc
    },
    {},
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {selectedTimezone || "Sélectionner un fuseau horaire..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un fuseau horaire..." onValueChange={setSearchQuery} />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Aucun fuseau horaire trouvé.</CommandEmpty>
            {Object.entries(filteredTimezonesByRegion).map(([region, timezones]) => (
              <CommandGroup key={region} heading={region}>
                {timezones.map((timezone) => (
                  <CommandItem
                    key={timezone}
                    value={timezone}
                    onSelect={() => {
                      onTimezoneChange(timezone)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between"
                  >
                    <span>{timezone.replace("_", " ")}</span>
                    <Check
                      className={cn("ml-auto h-4 w-4", selectedTimezone === timezone ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
