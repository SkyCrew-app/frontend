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
import { CalendarIcon } from "lucide-react"

interface ExportDialogProps {
  onExport: (format: "pdf" | "excel", startDate: Date, endDate: Date) => void
  isLoading: boolean
}

export function ExportDialog({ onExport, isLoading }: ExportDialogProps) {
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf")

  const handleExport = () => {
    if (startDate && endDate) {
      onExport(exportFormat, startDate, endDate)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Exporter Rapport</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exporter le rapport financier</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select value={exportFormat} onValueChange={(value: "pdf" | "excel") => setExportFormat(value)}>
              <SelectTrigger className="w-[180px]" id="format">
                <SelectValue placeholder="Sélectionner le format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Date de début
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="startDate"
                  variant={"outline"}
                  className={cn("w-[180px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? dateFormat(startDate, "P", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endDate" className="text-right">
              Date de fin
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="endDate"
                  variant={"outline"}
                  className={cn("w-[180px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? dateFormat(endDate, "P", { locale: fr }) : <span>Choisir une date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleExport} disabled={isLoading || !startDate || !endDate}>
            {isLoading ? "Exportation en cours..." : "Exporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
