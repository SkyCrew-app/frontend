import React, { useState } from 'react'
import { Command, CommandInput, CommandGroup, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'

export function TimezoneCombobox({
  onTimezoneChange,
  selectedTimezone,
}: {
  onTimezoneChange: (value: string) => void
  selectedTimezone: string
}) {
  const [open, setOpen] = useState(false)

  const allTimezones = Intl.supportedValuesOf('timeZone')

  const timezonesByRegion = allTimezones.reduce((acc: Record<string, string[]>, timezone) => {
    const [region, city] = timezone.split('/')
    if (!city) return acc
    if (!acc[region]) acc[region] = []
    acc[region].push(timezone)
    return acc
  }, {})

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {selectedTimezone || 'Sélectionner un fuseau horaire...'}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un fuseau horaire..." />
          <CommandList>
            <CommandEmpty>Aucun fuseau horaire trouvé.</CommandEmpty>
            {Object.entries(timezonesByRegion).map(([region, timezones]) => (
              <CommandGroup key={region} heading={region}>
                {timezones.map((timezone) => (
                  <CommandItem
                    key={timezone}
                    onSelect={() => {
                      onTimezoneChange(timezone)
                      setOpen(false)
                    }}
                  >
                    {timezone.replace('_', ' ')}
                    <Check
                      className={`ml-auto ${
                        selectedTimezone === timezone ? 'opacity-100' : 'opacity-0'
                      }`}
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
