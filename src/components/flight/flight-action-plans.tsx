"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/components/hooks/use-toast"
import { Download, Check, Printer, Share2, FileText, Copy } from "lucide-react"
import { useTranslations } from "next-intl"

interface FlightPlanActionsProps {
  flightPlanId: string | number
  flightDetails?: {
    departure: string
    arrival: string
    date: string
  }
  onExport?: (format: string) => void
  onValidate?: () => void
}

export function FlightPlanActions({ flightPlanId, flightDetails, onExport, onValidate }: FlightPlanActionsProps) {
  const t = useTranslations("reservation")
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const { toast } = useToast()

  const handleExport = (format: string) => {
    if (onExport) {
      onExport(format)
    } else {
      console.log(`Exporting flight plan ${flightPlanId} as ${format}`)
      toast({
        title: t('exportationSuccess'),
        description: t('exportationPlanFormatSuccess', { format: format.toUpperCase() }),
      })
    }
    setIsExportDialogOpen(false)
  }

  const handleValidate = () => {
    if (onValidate) {
      onValidate()
    } else {
      console.log(`Validating flight plan ${flightPlanId}`)
      toast({
        title: t('flightPlanValidation'),
        description: t('flightPlanValidationSuccess'),
        variant: "default",
      })
    }
    setIsValidateDialogOpen(false)
    window.location.href = "/reservations/flight-plans"
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    const shareText = flightDetails
      ? `Plan de vol: ${flightDetails.departure} → ${flightDetails.arrival} (${flightDetails.date})`
      : `Plan de vol #${flightPlanId}`

    const shareUrl = window.location.href

    // Vérifier si l'API Web Share est disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Plan de vol SkyCrew",
          text: shareText,
          url: shareUrl,
        })
        toast({
          title: t('shareSuccess'),
          description: t('shareSuccessMessage'),
        })
      } catch (error) {
        console.error("Erreur lors du partage:", error)
        setIsShareDialogOpen(true)
      }
    } else {
      setIsShareDialogOpen(true)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: t('copyLinkCopied'),
          description: t('copyLinkSuccess'),
        })
        setIsShareDialogOpen(false)
      })
      .catch((err) => {
        console.error("Erreur lors de la copie:", err)
        toast({
          title: t('error'),
          description: t('copyLinkError'),
          variant: "destructive",
        })
      })
  }

  return (
    <div className="flex flex-wrap justify-center gap-4">
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="px-6 bg-background hover:bg-muted">
            <Download className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('exportFlightPlan')}</DialogTitle>
            <DialogDescription>{t('chooseFormat')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              onClick={() => handleExport("pdf")}
              className="w-full flex items-center justify-start"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('exportPDF')}
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center justify-start"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('exportCSV')}
            </Button>
            <Button
              onClick={() => handleExport("json")}
              className="w-full flex items-center justify-start"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              {t('exportJSON')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" className="px-6 bg-background hover:bg-muted" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" />
        {t('print')}
      </Button>

      <Button variant="outline" className="px-6 bg-background hover:bg-muted" onClick={handleShare}>
        <Share2 className="mr-2 h-4 w-4" />
        {t('share')}
      </Button>

      {/* Dialogue de partage alternatif si l'API Web Share n'est pas disponible */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('shareFlightPlan')}</DialogTitle>
            <DialogDescription>{t('shareFlightPlanDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <div className="bg-muted p-2 rounded-md flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {window.location.href}
            </div>
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(window.location.href)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="px-6">
            <Check className="mr-2 h-4 w-4" />
            {t('flightPlanValid')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('flightPlanValid')}</DialogTitle>
            <DialogDescription>
              {t('flightPlanVildationQuestion')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleValidate}>{t('valid')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
