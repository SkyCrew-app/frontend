"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { BadgeCheck, CalendarIcon, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { User } from "@/interfaces/user"

interface AddLicenseFormProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
  loading: boolean
  selectedUserId: string | null
  setSelectedUserId: (id: string | null) => void
  issueDate: Date | null
  setIssueDate: (date: Date | null) => void
  expirationDate: Date | null
  setExpirationDate: (date: Date | null) => void
  onSubmit: (e: React.FormEvent) => void
  onExpirationDateChange: (date: Date | undefined) => void
}

export function AddLicenseForm({
  isOpen,
  onOpenChange,
  users,
  loading,
  selectedUserId,
  setSelectedUserId,
  issueDate,
  setIssueDate,
  expirationDate,
  setExpirationDate,
  onSubmit,
  onExpirationDateChange,
}: AddLicenseFormProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
          <BadgeCheck className="mr-2 h-4 w-4" />
          Ajouter une licence
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Ajouter une nouvelle licence</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right font-semibold">
                Utilisateur
              </Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={open} className="col-span-3 justify-between">
                    {selectedUserId && users.length > 0
                      ? (users.find((user) => user.id === selectedUserId)?.email ?? "Sélectionnez un utilisateur...")
                      : "Sélectionnez un utilisateur..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  {loading ? (
                    <Skeleton className="w-full h-16" />
                  ) : users.length > 0 ? (
                    <Command>
                      <CommandInput placeholder="Rechercher un utilisateur..." />
                      <CommandList>
                        <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => (
                            <CommandItem
                              key={String(user.id)}
                              onSelect={() => {
                                setSelectedUserId(user.id === selectedUserId ? null : user.id)
                                setOpen(false)
                              }}
                            >
                              <Check
                                className={cn("mr-2 h-4 w-4", selectedUserId === user.id ? "opacity-100" : "opacity-0")}
                              />
                              {user.first_name} {user.last_name} ({user.email})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  ) : (
                    <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license_type" className="text-right font-semibold">
                Type de licence
              </Label>
              <Select name="license_type" required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPL">PPL</SelectItem>
                  <SelectItem value="CPL">CPL</SelectItem>
                  <SelectItem value="ATPL">ATPL</SelectItem>
                  <SelectItem value="FI">FI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license_number" className="text-right font-semibold">
                Numéro de licence
              </Label>
              <Input
                id="license_number"
                name="license_number"
                className="col-span-3"
                placeholder="Numéro de licence"
                required
              />
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="issue_date" className="text-right font-semibold">
                  Date d'émission
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="col-span-3 w-full text-left">
                      {issueDate ? format(issueDate, "PPP", { locale: fr }) : "Choisissez une date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={issueDate ?? undefined}
                      onSelect={(date) => setIssueDate(date ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expiration_date" className="text-right font-semibold">
                  Date d'expiration
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="col-span-3 w-full text-left">
                      {expirationDate ? format(expirationDate, "PPP", { locale: fr }) : "Choisissez une date"}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expirationDate ?? undefined}
                      onSelect={onExpirationDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="certification_authority" className="text-right font-semibold">
                Autorité de certification
              </Label>
              <Input
                id="certification_authority"
                name="certification_authority"
                className="col-span-3"
                placeholder="Autorité de certification"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="documents" className="text-right font-semibold">
                Documents
              </Label>
              <Input id="documents" name="documents" type="file" multiple className="col-span-3" />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right font-semibold">
                Statut
              </Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionnez le statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expirée</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="bg-primary text-white hover:bg-primary/90">
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
