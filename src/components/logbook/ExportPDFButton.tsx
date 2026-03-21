"use client"

import { useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { EXPORT_LOGBOOK_PDF } from "@/graphql/logbook"
import type { LogbookFilter } from "@/interfaces/logbook"
import { useToast } from "@/components/hooks/use-toast"

interface ExportPDFButtonProps {
  filter: LogbookFilter
}

export default function ExportPDFButton({ filter }: ExportPDFButtonProps) {
  const { toast } = useToast()
  const [exportPDF, { loading }] = useMutation(EXPORT_LOGBOOK_PDF)

  const handleExport = async () => {
    try {
      const { data } = await exportPDF({
        variables: { filter },
      })

      if (data?.exportLogbookPDF) {
        const byteCharacters = atob(data.exportLogbookPDF)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: "application/pdf" })

        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "carnet-de-vol.pdf"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast({
          title: "Export réussi",
          description: "Votre carnet de vol a été téléchargé.",
        })
      }
    } catch (error) {
      console.error("Erreur export PDF:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'exporter le carnet de vol.",
      })
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} variant="outline">
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Export en cours...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Exporter PDF
        </>
      )}
    </Button>
  )
}
