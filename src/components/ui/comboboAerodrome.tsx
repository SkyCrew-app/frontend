"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface AerodromeComboboxProps {
  onAerodromeChange: (aerodromeId: string) => void;
}

export function AerodromeCombobox({ onAerodromeChange }: AerodromeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [aerodromes, setAerodromes] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchAerodromes = (query: string) => {
    setLoading(true);
    fetch(`https://api.api-ninjas.com/v1/airports?country=FR&name=${query}`, {
      headers: {
        "X-Api-Key": "KX6n/kOCJpKDEl+/mF+5/g==p9iHRQBed2N8KbiU",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data.map((aerodrome: any) => ({
          id: aerodrome.icao || aerodrome.iata || aerodrome.id,
          name: `${aerodrome.name} (${aerodrome.iata || aerodrome.icao})`,
        }));
        setAerodromes(formattedData);
        setLoading(false);
      })
      .catch(() => {
        setAerodromes([]);
        setLoading(false);
      });
  };

  const handleInputChange = (query: string) => {
    if (query.length < 2) {
      setAerodromes([]);
      return;
    }
    fetchAerodromes(query);
  };

  const handleSelect = (currentValue: string) => {
    setValue(currentValue === value ? "" : currentValue);
    onAerodromeChange(currentValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[300px] justify-between"
        >
          {value
            ? aerodromes.find((aerodrome) => aerodrome.id === value)?.name
            : "Rechercher un aérodrome..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Rechercher un aérodrome..."
            onValueChange={(value) => handleInputChange(value)}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Chargement..." : ""}
            </CommandEmpty>
            <CommandGroup>
              {aerodromes.length > 0 ? (
                aerodromes.map((aerodrome) => (
                  <CommandItem
                    key={aerodrome.id}
                    value={aerodrome.name}
                    onSelect={() => handleSelect(aerodrome.id)}
                  >
                    {aerodrome.name}
                    <Check
                      className={`ml-auto ${
                        value === aerodrome.name ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </CommandItem>
                ))
              ) : (
                <CommandEmpty>Aucun aérodrome trouvé.</CommandEmpty>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
