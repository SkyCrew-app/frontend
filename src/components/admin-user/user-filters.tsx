"use client"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { roleLabel } from "@/lib/settings"
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
  resetFilters: () => void
  roles: Role[]
}

const ALL = "all"

const toBoolean = (value: string) => (value === ALL ? null : value === "true")
const fromBoolean = (value: boolean | null) => (value === null ? ALL : String(value))

export function UserFilters({
  searchTerm,
  setSearchTerm,
  filterRole,
  setFilterRole,
  filterConfirmed,
  setFilterConfirmed,
  filter2FA,
  setFilter2FA,
  resetFilters,
  roles,
}: UserFiltersProps) {
  const { t } = useTranslation("administration")
  const hasFilters = searchTerm !== "" || filterRole !== null || filterConfirmed !== null || filter2FA !== null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          aria-label={t("users.searchMember")}
          placeholder={t("users.filters.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filterRole ?? ALL} onValueChange={(value) => setFilterRole(value === ALL ? null : value)}>
        <SelectTrigger className="w-full sm:w-44" aria-label={t("users.filters.byRole")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("users.filters.allRoles")}</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id.toString()}>
              {roleLabel(role.role_name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={fromBoolean(filterConfirmed)} onValueChange={(value) => setFilterConfirmed(toBoolean(value))}>
        <SelectTrigger className="w-full sm:w-48" aria-label={t("users.filters.byAccount")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("users.filters.allAccounts")}</SelectItem>
          <SelectItem value="true">{t("users.filters.accountActive")}</SelectItem>
          <SelectItem value="false">{t("users.account.pending")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={fromBoolean(filter2FA)} onValueChange={(value) => setFilter2FA(toBoolean(value))}>
        <SelectTrigger className="w-full sm:w-44" aria-label={t("users.filters.byTwoFactor")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("users.filters.twoFactorAll")}</SelectItem>
          <SelectItem value="true">{t("users.filters.twoFactorEnabled")}</SelectItem>
          <SelectItem value="false">{t("users.filters.twoFactorDisabled")}</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="h-4 w-4" />
          {t("common:actions.reset")}
        </Button>
      )}
    </div>
  )
}
