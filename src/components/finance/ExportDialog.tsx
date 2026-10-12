"use client"

import { useState } from "react"
import { fr } from "date-fns/locale"
import { CalendarIcon, Download, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type ExportFormat = "pdf" | "excel"

interface ExportDialogProps {
  /** Resolves to true when the report was generated; the dialog then closes. */
  onExport: (format: ExportFormat, startDate: Date, endDate: Date) => Promise<boolean> | boolean | void
  isLoading: boolean
}

interface DateFieldProps {
  id: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  disabledDays?: (date: Date) => boolean
}

function DateField({ id, label, value, onChange, disabledDays }: DateFieldProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        <span className="text-destructive" aria-hidden="true">
          {" "}
          *
        </span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon className="h-4 w-4" />
            {value ? formatDate(value) : "Choisir une date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date)
              if (date) setOpen(false)
            }}
            disabled={disabledDays}
            initialFocus
            locale={fr}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ExportDialog({ onExport, isLoading }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [exportFormat, setExportFormat] = useState<ExportFormat>("pdf")

  const invalidRange = Boolean(startDate && endDate && startDate > endDate)

  const handleExport = async () => {
    if (!startDate || !endDate || invalidRange) return
    const done = await onExport(exportFormat, startDate, endDate)
    // Stay open after a failure so the dates are not lost.
    if (done !== false) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isLoading && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter le rapport financier</DialogTitle>
          <DialogDescription>Choisissez le format et la période à inclure dans le rapport.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Tableur (Excel)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField
              id="export-start-date"
              label="Du"
              value={startDate}
              onChange={setStartDate}
              disabledDays={(date) => (endDate ? date > endDate : false)}
            />
            <DateField
              id="export-end-date"
              label="Au"
              value={endDate}
              onChange={setEndDate}
              disabledDays={(date) => (startDate ? date < startDate : false)}
            />
          </div>
          {invalidRange && (
            <p className="text-sm text-destructive">La date de fin doit être postérieure à la date de début.</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="button" onClick={handleExport} disabled={isLoading || !startDate || !endDate || invalidRange}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isLoading ? "Export en cours…" : "Exporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
