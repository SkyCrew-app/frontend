"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";

type Option = Record<"value" | "label", string>;

interface MultiSelectProps {
  options: Option[];
  selectedOptions?: Option[];
  onChange?: (selected: Option[]) => void;
  placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selectedOptions = [],
  onChange,
  placeholder = "Select options...",
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Option[]>(
    selectedOptions.filter((option) => option.value !== "")
  );
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = React.useCallback((option: Option) => {
    setSelected((prev) => {
      const updated = prev.filter((s) => s.value !== option.value);
      onChange?.(updated);
      return updated;
    });
  }, [onChange]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if ((e.key === "Delete" || e.key === "Backspace") && input.value === "") {
          setSelected((prev) => {
            const newSelected = [...prev];
            newSelected.pop();
            onChange?.(newSelected);
            return newSelected;
          });
        }
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [onChange]
  );

  const selectables = options.filter(
    (option) => !selected.some((s) => s.value === option.value)
  );

  const handleSelect = React.useCallback(
    (option: Option) => {
      setSelected((prev) => {
        const updated = [...prev, option];
        onChange?.(updated);
        return updated;
      });
      setInputValue("");
    },
    [onChange]
  );

  return (
    <Command
      onKeyDown={handleKeyDown}
      className="overflow-visible bg-transparent relative"
    >
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <Badge key={option.value} variant="secondary">
              {option.label}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleUnselect(option)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {open && selectables.length > 0 ? (
        <div
          className="absolute z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in"
          style={{ bottom: "calc(100% + 4px)" }} // Position au-dessus de l'input
        >
          <CommandList>
            <CommandGroup>
              {selectables.map((option) => (
                <CommandItem
                  key={option.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onSelect={() => handleSelect(option)}
                  className="cursor-pointer"
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      ) : null}
    </Command>
  );
};
