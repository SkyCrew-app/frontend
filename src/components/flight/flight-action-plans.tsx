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
        title: "Exportation réussie",
        description: `Le plan de vol a été exporté en ${format.toUpperCase()} avec succès.`,
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
        title: "Plan de vol validé",
        description: "Le plan de vol a été validé avec succès.",
        variant: "default",
      })
    }
    setIsValidateDialogOpen(false)
    window.location.href = "/reservations/flight-plans"
  }

  const handlePrint = () => {
    // Utiliser la fonction native d'impression du navigateur
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
          title: "Partage réussi",
          description: "Le plan de vol a été partagé avec succès.",
        })
      } catch (error) {
        console.error("Erreur lors du partage:", error)
        setIsShareDialogOpen(true)
      }
    } else {
      // Si l'API Web Share n'est pas disponible, ouvrir la boîte de dialogue
      setIsShareDialogOpen(true)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copié !",
          description: "Le lien a été copié dans le presse-papiers.",
        })
        setIsShareDialogOpen(false)
      })
      .catch((err) => {
        console.error("Erreur lors de la copie:", err)
        toast({
          title: "Erreur",
          description: "Impossible de copier le lien.",
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
            Exporter
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Exporter le Plan de Vol</DialogTitle>
            <DialogDescription>Choisissez le format d'exportation pour votre plan de vol.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button
              onClick={() => handleExport("pdf")}
              className="w-full flex items-center justify-start"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exporter en PDF
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              className="w-full flex items-center justify-start"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exporter en CSV
            </Button>
            <Button
              onClick={() => handleExport("json")}
              className="w-full flex items-center justify-start"
              variant="outline"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exporter en JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button variant="outline" className="px-6 bg-background hover:bg-muted" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" />
        Imprimer
      </Button>

      <Button variant="outline" className="px-6 bg-background hover:bg-muted" onClick={handleShare}>
        <Share2 className="mr-2 h-4 w-4" />
        Partager
      </Button>

      {/* Dialogue de partage alternatif si l'API Web Share n'est pas disponible */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Partager le Plan de Vol</DialogTitle>
            <DialogDescription>Copiez le lien ci-dessous pour partager ce plan de vol.</DialogDescription>
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
            Valider le Plan de Vol
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Valider le Plan de Vol</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir valider ce plan de vol ? Cette action confirmera que vous avez vérifié toutes les
              informations et que le plan est prêt à être utilisé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidate}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
