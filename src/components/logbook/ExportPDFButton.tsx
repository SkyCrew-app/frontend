"use client"

import { useMutation } from "@apollo/client"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import { EXPORT_LOGBOOK_PDF } from "@/graphql/logbook"
import type { LogbookFilter } from "@/interfaces/logbook"
import { useToast } from "@/components/hooks/use-toast"
import { downloadBase64Pdf } from "@/lib/download"

interface ExportPDFButtonProps {
  filter: LogbookFilter
  disabled?: boolean
}

/** Downloads the logbook as a PDF, with the filters currently applied. */
export default function ExportPDFButton({ filter, disabled = false }: ExportPDFButtonProps) {
  const { toast } = useToast()
  const [exportPDF, { loading }] = useMutation(EXPORT_LOGBOOK_PDF)

  const handleExport = async () => {
    try {
      const { data } = await exportPDF({
        variables: { filter },
      })

      if (data?.exportLogbookPDF) {
        downloadBase64Pdf(data.exportLogbookPDF, "carnet-de-vol.pdf")
        toast({
          title: "Carnet de vol exporté",
          description: "Le fichier carnet-de-vol.pdf a été téléchargé.",
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Export impossible",
        description: "Le PDF du carnet de vol n'a pas pu être généré. Réessayez dans un instant.",
      })
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading || disabled} variant="outline">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {loading ? "Export en cours…" : "Exporter en PDF"}
    </Button>
  )
}
