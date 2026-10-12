"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { DatePicker } from "@/components/ui/date-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { BadgeCheck, Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
  /** Member preselected when the dialog is opened from a row of the table. */
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
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(defaultUserId)
  const [licenseType, setLicenseType] = useState("")
  const [status, setStatus] = useState("active")
  const [issueDate, setIssueDate] = useState<Date | undefined>()
  const [expirationDate, setExpirationDate] = useState<Date | undefined>()
  const [errors, setErrors] = useState<Errors>({})

  // Start from a clean form each time the dialog opens.
  useEffect(() => {
    if (!isOpen) return
    setUserId(defaultUserId)
    setLicenseType("")
    setStatus("active")
    setIssueDate(undefined)
    setExpirationDate(undefined)
    setErrors({})
  }, [isOpen, defaultUserId])

  const selectedUser = users.find((user) => user.id === userId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const licenseNumber = ((formData.get("license_number") as string) ?? "").trim()

    const nextErrors: Errors = {}
    if (!userId) nextErrors.user = "Choisissez le membre concerné."
    if (!licenseType) nextErrors.license_type = "Choisissez le type de licence."
    if (!licenseNumber) nextErrors.license_number = "Indiquez le numéro de la licence."
    if (!issueDate) nextErrors.issueDate = "Indiquez la date de délivrance."
    if (issueDate && expirationDate && expirationDate < issueDate) {
      nextErrors.expirationDate = "La date d'expiration ne peut pas précéder la date de délivrance."
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !userId || !issueDate) return

    const files = (formData.getAll("documents") as File[]).filter((file) => file.size > 0)

    onSubmit({
      userId,
      license_type: licenseType,
      license_number: licenseNumber,
      issueDate,
      expirationDate: expirationDate ?? null,
      certification_authority: ((formData.get("certification_authority") as string) ?? "").trim(),
      status,
      documents: files,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BadgeCheck className="h-4 w-4" />
          Ajouter une licence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une licence</DialogTitle>
          <DialogDescription>Enregistrez la licence ou la qualification d'un membre.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="license_user">
              Membre
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
                    {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : "Choisir un membre"}
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
                    <CommandInput placeholder="Rechercher un membre" />
                    <CommandList>
                      <CommandEmpty>Aucun membre trouvé.</CommandEmpty>
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
                            <Check className={cn("mr-2 h-4 w-4", userId === user.id ? "opacity-100" : "opacity-0")} />
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
                Type de licence
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
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPL">PPL – pilote privé</SelectItem>
                  <SelectItem value="CPL">CPL – pilote professionnel</SelectItem>
                  <SelectItem value="ATPL">ATPL – pilote de ligne</SelectItem>
                  <SelectItem value="FI">FI – instructeur</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={errors.license_type} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">
                Numéro de licence
                <Required />
              </Label>
              <Input id="license_number" name="license_number" placeholder="FRA.FCL.PA00123456" />
              <FieldError message={errors.license_number} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                Date de délivrance
                <Required />
              </Label>
              <DatePicker
                date={issueDate}
                onSelect={(date) => {
                  setIssueDate(date)
                  setErrors((current) => ({ ...current, issueDate: undefined }))
                }}
                placeholder="Choisir une date"
                toDate={new Date()}
              />
              <FieldError message={errors.issueDate} />
            </div>
            <div className="space-y-2">
              <Label>Date d'expiration</Label>
              <DatePicker
                date={expirationDate}
                onSelect={(date) => {
                  setExpirationDate(date)
                  setErrors((current) => ({ ...current, expirationDate: undefined }))
                }}
                placeholder="Sans expiration"
                fromDate={issueDate}
                clearable
              />
              <FieldError message={errors.expirationDate} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="certification_authority">Autorité de délivrance</Label>
              <Input id="certification_authority" name="certification_authority" placeholder="DGAC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_status">Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="license_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expirée</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="documents">Justificatifs</Label>
            <Input id="documents" name="documents" type="file" multiple />
            <p className="text-xs text-muted-foreground">Facultatif. Scan ou photo de la licence, plusieurs fichiers possibles.</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter la licence
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
