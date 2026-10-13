"use client"

import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("flights")
  const [exportPDF, { loading }] = useMutation(EXPORT_LOGBOOK_PDF)

  const handleExport = async () => {
    try {
      const { data } = await exportPDF({
        variables: { filter },
      })

      if (data?.exportLogbookPDF) {
        const fileName = t("logbook.export.fileName")
        downloadBase64Pdf(data.exportLogbookPDF, fileName)
        toast({
          title: t("logbook.export.successTitle"),
          description: t("logbook.export.successDescription", { fileName }),
        })
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("logbook.export.errorTitle"),
        description: t("logbook.export.errorDescription"),
      })
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading || disabled} variant="outline">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      {loading ? t("logbook.export.inProgress") : t("logbook.export.button")}
    </Button>
  )
}
