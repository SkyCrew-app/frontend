"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { ChevronsUpDown, Loader2, MapPin, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NAV_SEARCH } from "@/graphql/navdata"
import { parseCoordinates } from "@/lib/navplan/route"
import type { NavPoint, NavPointType } from "@/lib/navplan/types"
import { cn } from "@/lib/utils"

interface NavPointSearchProps {
  id: string
  /** Shown in the button when nothing is chosen. */
  placeholder: string
  /** The chosen point; absent for an "add a point" search that empties itself. */
  value?: { ident: string; name?: string | null } | null
  types?: NavPointType[]
  near?: { lat: number; lon: number } | null
  onSelect: (point: NavPoint) => void
  /** Offers a free point when coordinates are typed. */
  allowCoordinates?: boolean
  invalid?: boolean
  describedBy?: string
  addMode?: boolean
  /** Written before the value, muted ("Départ"), for a compact chip of the route strip. */
  prefix?: string
  /** Only the ident of the chosen point in the button (its name as a tooltip). */
  compact?: boolean
  className?: string
}

const MIN_QUERY = 2

export function NavPointSearch({
  id,
  placeholder,
  value,
  types,
  near,
  onSelect,
  allowCoordinates = false,
  invalid = false,
  describedBy,
  addMode = false,
  prefix,
  compact = false,
  className,
}: NavPointSearchProps) {
  const { t } = useTranslation("navplan")
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [query, setQuery] = useState("")

  // Ask the API once the pilot pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 250)
    return () => clearTimeout(timer)
  }, [text])

  const { data, loading, error } = useQuery<{ navSearch: NavPoint[] }>(NAV_SEARCH, {
    variables: { query, types, near: near ? { lat: near.lat, lon: near.lon } : null, limit: 20 },
    skip: query.length < MIN_QUERY,
  })
  const results = query.length >= MIN_QUERY ? (data?.navSearch ?? []) : []
  const coordinates = allowCoordinates ? parseCoordinates(text) : null

  const choose = (point: NavPoint) => {
    onSelect(point)
    setOpen(false)
    setText("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          title={compact && value?.name && value.name !== value.ident ? value.name : undefined}
          className={cn("w-full justify-between font-normal", invalid && "border-destructive", !value && "text-muted-foreground", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {addMode ? <Plus className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            {prefix && <span className="shrink-0 text-xs text-muted-foreground">{prefix}</span>}
            <span className="truncate">
              {value ? (
                <>
                  <span className="font-semibold text-foreground">{value.ident}</span>
                  {!compact && value.name && value.name !== value.ident ? ` · ${value.name}` : ""}
                </>
              ) : (
                placeholder
              )}
            </span>
          </span>
          {!compact && <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0" align="start" aria-label={t("search.placeholder")}>
        <Command shouldFilter={false}>
          <CommandInput value={text} onValueChange={setText} placeholder={t("search.placeholder")} />
          <CommandList>
            {text.trim().length < MIN_QUERY && !coordinates ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">{t("search.hint")}</p>
            ) : loading ? (
              <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("search.loading")}
              </p>
            ) : error ? (
              <p className="px-3 py-4 text-sm text-destructive" role="alert">
                {t("search.error")}
              </p>
            ) : (
              <CommandEmpty>{t("search.empty")}</CommandEmpty>
            )}
            {coordinates && (
              <CommandGroup heading={t("search.freePoint")}>
                <CommandItem
                  value="coordinates"
                  onSelect={() =>
                    choose({
                      id: `USER:${coordinates.lat},${coordinates.lon}`,
                      type: "USER",
                      ident: "",
                      lat: coordinates.lat,
                      lon: coordinates.lon,
                    })
                  }
                >
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {t("search.freePointAt", { lat: coordinates.lat.toFixed(4), lon: coordinates.lon.toFixed(4) })}
                </CommandItem>
              </CommandGroup>
            )}
            {results.length > 0 && (
              <CommandGroup>
                {results.map((point) => (
                  <CommandItem key={point.id} value={point.id} onSelect={() => choose(point)} className="items-start">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{point.ident}</span>
                        <span className="text-xs text-muted-foreground">{t(`pointType.${point.type}`)}</span>
                        {point.type === "VRP" && point.mandatory !== null && point.mandatory !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {point.mandatory ? t("search.mandatory") : t("search.optional")}
                          </span>
                        )}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[point.name, point.aerodromeIcao, point.frequency].filter(Boolean).join(" · ")}
                      </span>
                    </span>
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
