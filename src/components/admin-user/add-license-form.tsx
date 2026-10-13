"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SidePanel } from "@/components/layout/SidePanel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DatePicker } from "@/components/ui/date-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { BadgeCheck, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/interfaces/user"

export interface LicenseFormValues {
  userId: string
  license_type: string
  license_number: string
  issueDate: Date
  expirationDate: Date | null
  certification_authority: string
  status: string
  documents: File[]
}

interface AddLicenseFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  loading: boolean
  /** Member preselected when the panel is opened from a row of the table. */
  defaultUserId?: string | null
  saving?: boolean
  onSubmit: (values: LicenseFormValues) => void
}

type Errors = Partial<Record<"user" | "license_type" | "license_number" | "issueDate" | "expirationDate", string>>

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null

export function AddLicenseForm({
  isOpen,
  onOpenChange,
  users,
  loading,
  defaultUserId = null,
  saving = false,
  onSubmit,
}: AddLicenseFormProps) {
  const { t } = useTranslation("administration")
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(defaultUserId)
  const [licenseType, setLicenseType] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")
  const [authority, setAuthority] = useState("")
  const [status, setStatus] = useState("active")
  const [issueDate, setIssueDate] = useState<Date | undefined>()
  const [expirationDate, setExpirationDate] = useState<Date | undefined>()
  const [errors, setErrors] = useState<Errors>({})
  const documentsRef = useRef<HTMLInputElement>(null)

  // Start from a clean form each time the panel opens.
  useEffect(() => {
    if (!isOpen) return
    setUserId(defaultUserId)
    setLicenseType("")
    setLicenseNumber("")
    setAuthority("")
    setStatus("active")
    setIssueDate(undefined)
    setExpirationDate(undefined)
    setErrors({})
  }, [isOpen, defaultUserId])

  const selectedUser = users.find((user) => user.id === userId)

  // Each step checks its own fields, so an error is always shown on the step in view.
  const licenseErrors = (): Errors => {
    const next: Errors = {}
    if (!userId) next.user = t("users.licence.errors.member")
    if (!licenseType) next.license_type = t("users.licence.errors.type")
    if (!licenseNumber.trim()) next.license_number = t("users.licence.errors.number")
    return next
  }

  const validityErrors = (): Errors => {
    const next: Errors = {}
    if (!issueDate) next.issueDate = t("users.licence.errors.issueDate")
    if (issueDate && expirationDate && expirationDate < issueDate) {
      next.expirationDate = t("users.licence.errors.expirationBeforeIssue")
    }
    return next
  }

  const validateStep = (stepErrors: Errors) => {
    setErrors((current) => ({ ...current, ...stepErrors }))
    return Object.keys(stepErrors).length === 0
  }

  const handleSubmit = () => {
    const nextErrors = { ...licenseErrors(), ...validityErrors() }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !userId || !issueDate) return

    const files = Array.from(documentsRef.current?.files ?? []).filter((file) => file.size > 0)

    onSubmit({
      userId,
      license_type: licenseType,
      license_number: licenseNumber.trim(),
      issueDate,
      expirationDate: expirationDate ?? null,
      certification_authority: authority.trim(),
      status,
      documents: files,
    })
  }

  const licenseFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="license_user">
          {t("users.licence.member")}
          <Required />
        </Label>
        <Popover open={userPickerOpen} onOpenChange={setUserPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              id="license_user"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={userPickerOpen}
              className={cn("w-full justify-between font-normal", !selectedUser && "text-muted-foreground")}
            >
              <span className="truncate">
                {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : t("users.licence.chooseMember")}
              </span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
            {loading && users.length === 0 ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <Command>
                <CommandInput placeholder={t("users.searchMember")} />
                <CommandList>
                  <CommandEmpty>{t("users.licence.noMemberFound")}</CommandEmpty>
                  <CommandGroup>
                    {users.map((user) => (
                      <CommandItem
                        key={String(user.id)}
                        value={`${user.first_name} ${user.last_name} ${user.email}`}
                        onSelect={() => {
                          setUserId(user.id)
                          setErrors((current) => ({ ...current, user: undefined }))
                          setUserPickerOpen(false)
                        }}
                      >
                        <Check className={cn("h-4 w-4", userId === user.id ? "opacity-100" : "opacity-0")} />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {user.first_name} {user.last_name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </PopoverContent>
        </Popover>
        <FieldError message={errors.user} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="license_type">
            {t("users.licence.type")}
            <Required />
          </Label>
          <Select
            value={licenseType}
            onValueChange={(value) => {
              setLicenseType(value)
              setErrors((current) => ({ ...current, license_type: undefined }))
            }}
          >
            <SelectTrigger id="license_type">
              <SelectValue placeholder={t("users.licence.chooseType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PPL">{t("users.licence.types.PPL")}</SelectItem>
              <SelectItem value="CPL">{t("users.licence.types.CPL")}</SelectItem>
              <SelectItem value="ATPL">{t("users.licence.types.ATPL")}</SelectItem>
              <SelectItem value="FI">{t("users.licence.types.FI")}</SelectItem>
            </SelectContent>
          </Select>
          <FieldError message={errors.license_type} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="license_number">
            {t("users.licence.number")}
            <Required />
          </Label>
          <Input
            id="license_number"
            name="license_number"
            value={licenseNumber}
            onChange={(e) => {
              setLicenseNumber(e.target.value)
              setErrors((current) => ({ ...current, license_number: undefined }))
            }}
            aria-required="true"
            aria-invalid={errors.license_number ? true : undefined}
            placeholder="FRA.FCL.PA00123456"
          />
          <FieldError message={errors.license_number} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="certification_authority">{t("users.licence.authority")}</Label>
        <Input
          id="certification_authority"
          name="certification_authority"
          value={authority}
          onChange={(e) => setAuthority(e.target.value)}
          placeholder="DGAC"
        />
      </div>
    </div>
  )

  const validityFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>
            {t("users.licence.issueDate")}
            <Required />
          </Label>
          <DatePicker
            date={issueDate}
            onSelect={(date) => {
              setIssueDate(date)
              setErrors((current) => ({ ...current, issueDate: undefined }))
            }}
            placeholder={t("users.licence.chooseDate")}
            toDate={new Date()}
          />
          <FieldError message={errors.issueDate} />
        </div>
        <div className="space-y-2">
          <Label>{t("users.licence.expirationDate")}</Label>
          <DatePicker
            date={expirationDate}
            onSelect={(date) => {
              setExpirationDate(date)
              setErrors((current) => ({ ...current, expirationDate: undefined }))
            }}
            placeholder={t("users.licence.noExpiration")}
            fromDate={issueDate}
            clearable
          />
          <FieldError message={errors.expirationDate} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="license_status">{t("common:labels.status")}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="license_status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("licenceStatus.active")}</SelectItem>
              <SelectItem value="expired">{t("licenceStatus.expired")}</SelectItem>
              <SelectItem value="pending">{t("licenceStatus.pending")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="documents">{t("users.licence.documents")}</Label>
        <Input ref={documentsRef} id="documents" name="documents" type="file" multiple />
        <p className="text-xs text-muted-foreground">{t("users.licence.documentsHint")}</p>
      </div>
    </div>
  )

  return (
    <>
      <Button variant="outline" onClick={() => onOpenChange(true)}>
        <BadgeCheck className="h-4 w-4" />
        {t("users.licence.add")}
      </Button>
      <SidePanel
        open={isOpen}
        onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
        title={t("users.licence.add")}
        description={t("users.licence.description")}
        onSubmit={handleSubmit}
        submitLabel={t("users.licence.submit")}
        submitting={saving}
        steps={[
          { title: t("users.licence.steps.licence"), content: licenseFields, validate: () => validateStep(licenseErrors()) },
          {
            title: t("users.licence.steps.validity"),
            content: validityFields,
            validate: () => validateStep(validityErrors()),
          },
        ]}
      />
    </>
  )
}
