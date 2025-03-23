"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import type { Role } from "@/interfaces/user"

interface UserFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  filterRole: string | null
  setFilterRole: (role: string | null) => void
  filterConfirmed: boolean | null
  setFilterConfirmed: (confirmed: boolean | null) => void
  filter2FA: boolean | null
  setFilter2FA: (enabled: boolean | null) => void
  isFilterOpen: boolean
  setIsFilterOpen: (open: boolean) => void
  resetFilters: () => void
  roles: Role[]
}

export function UserFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  filterConfirmed,
  setFilterConfirmed,
  filter2FA,
  setFilter2FA,
  isFilterOpen,
  setIsFilterOpen,
  resetFilters,
  roles,
}: UserFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      <div className="relative w-full md:w-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un utilisateur..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:w-[300px]"
        />
      </div>

      <div className="flex gap-2 w-full md:w-auto">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
              {(filterRole !== null || filterConfirmed !== null || filter2FA !== null) && (
                <Badge className="ml-1 bg-primary text-white">
                  {[filterRole, filterConfirmed, filter2FA].filter((f) => f !== null).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <h4 className="font-medium">Filtrer par</h4>

              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select value={filterRole || ""} onValueChange={(value) => setFilterRole(value || null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les rôles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.role_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email confirmé</Label>
                <Select
                  value={filterConfirmed === null ? "all" : filterConfirmed ? "true" : "false"}
                  onValueChange={(value) => {
                    if (value === "all") setFilterConfirmed(null)
                    else setFilterConfirmed(value === "true")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="true">Oui</SelectItem>
                    <SelectItem value="false">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>2FA activé</Label>
                <Select
                  value={filter2FA === null ? "all" : filter2FA ? "true" : "false"}
                  onValueChange={(value) => {
                    if (value === "all") setFilter2FA(null)
                    else setFilter2FA(value === "true")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="true">Oui</SelectItem>
                    <SelectItem value="false">Non</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Réinitialiser
                </Button>
                <Button size="sm" onClick={() => setIsFilterOpen(false)}>
                  Appliquer
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
