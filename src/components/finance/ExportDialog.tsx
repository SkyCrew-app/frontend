"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format as dateFormat } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, FileText, Download, Loader2 } from "lucide-react"

interface ExportDialogProps {
  onExport: (format: "pdf" | "excel", startDate: Date, endDate: Date) => void
  isLoading: boolean
}

export function ExportDialog({ onExport, isLoading }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")

  const handleExport = () => {
    if (startDate && endDate) {
      onExport(exportFormat, startDate, endDate)
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="mr-2 h-4 w-4" />
          Exporter Rapport
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center">
            <FileText className="mr-2 h-5 w-5 text-blue-500" />
            Exporter le rapport financier
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="format" className="text-sm font-medium">
              Format d'exportation
            </Label>
            <Select value={exportFormat} onValueChange={(value: "pdf" | "excel") => setExportFormat(value)}>
              <SelectTrigger className="w-full" id="format">
                <SelectValue placeholder="Sélectionner le format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf" className="flex items-center">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 rounded-full bg-red-500"></div>
                    PDF
                  </div>
                </SelectItem>
                <SelectItem value="excel" className="flex items-center">
                  <div className="flex items-center">
                    <div className="w-4 h-4 mr-2 rounded-full bg-green-500"></div>
                    Excel
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm font-medium">
              Date de début
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? dateFormat(startDate, "P", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={fr}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm font-medium">
              Date de fin
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? dateFormat(endDate, "P", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  locale={fr}
                  className="rounded-md border"
                  disabled={(date) => (startDate ? date < startDate : false)}
                />
              </PopoverContent>
            </Popover>
            {startDate && endDate && startDate > endDate && (
              <p className="text-sm text-red-500 mt-1">La date de fin doit être postérieure à la date de début</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading || !startDate || !endDate || startDate > endDate}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportation...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
