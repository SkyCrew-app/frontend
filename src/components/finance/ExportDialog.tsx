"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CalendarIcon, Download } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDate } from "@/lib/format"
import { dateFnsLocale } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type ExportFormat = "pdf" | "excel"

interface ExportDialogProps {
  /** Resolves to true when the report was generated; the panel then closes. */
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
  const { t } = useTranslation("administration")
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
            {value ? formatDate(value) : t("finance.export.chooseDate")}
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
            locale={dateFnsLocale()}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function ExportDialog({ onExport, isLoading }: ExportDialogProps) {
  const { t } = useTranslation("administration")
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
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Download className="h-4 w-4" />
        {t("common:actions.export")}
      </Button>
      <SidePanel
        open={open}
        onOpenChange={(next) => (next || !isLoading) && setOpen(next)}
        title={t("finance.export.title")}
        description={t("finance.export.description")}
        onSubmit={handleExport}
        submitLabel={isLoading ? t("finance.export.exporting") : t("common:actions.export")}
        submitting={isLoading}
        submitDisabled={!startDate || !endDate || invalidRange}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">{t("finance.export.format")}</Label>
            <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">{t("finance.export.spreadsheet")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateField
              id="export-start-date"
              label={t("finance.export.from")}
              value={startDate}
              onChange={setStartDate}
              disabledDays={(date) => (endDate ? date > endDate : false)}
            />
            <DateField
              id="export-end-date"
              label={t("finance.export.to")}
              value={endDate}
              onChange={setEndDate}
              disabledDays={(date) => (startDate ? date < startDate : false)}
            />
          </div>
          {invalidRange && (
            <p className="text-sm text-destructive">{t("finance.export.invalidRange")}</p>
          )}
        </div>
      </SidePanel>
    </>
  )
}
