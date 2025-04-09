"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useMutation } from "@apollo/client"
import {
  Calendar,
  Plane,
  User,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  XCircle,
  Edit,
  CheckSquare,
  Loader2,
  Camera,
  FileWarning,
  X,
} from "lucide-react"
import { CLOSE_AUDIT } from "@/graphql/audit"
import { AuditResultType, type AuditCategoryType, AuditFrequencyType, CriticalityLevel } from "@/interfaces/audit"
import { getAuditCategoryLabel, getCriticalityLabel } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/components/hooks/use-toast"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"

interface AuditDetailsProps {
  isOpen: boolean
  onClose: () => void
  audit: any
  onEdit: () => void
}

export function AuditDetails({ isOpen, onClose, audit, onEdit }: AuditDetailsProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("details")
  const [isClosing, setIsClosing] = useState(false)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const [closeAudit, { loading: closeLoading }] = useMutation(CLOSE_AUDIT, {
    onCompleted: () => {
      toast({ variant: "default", description: "Audit clôturé avec succès" })
      setIsClosing(false)
      onClose()
    },
    onError: (error) => {
      toast({ variant: "destructive", description: `Erreur lors de la clôture: ${error.message}` })
      setIsClosing(false)
    },
  })

  const handleCloseAudit = () => {
    setIsClosing(true)
    closeAudit({
      variables: {
        id: audit.id,
        closedById: userId,
      },
    })
  }

  const getAuditResultIcon = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case AuditResultType.NON_CONFORME:
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case AuditResultType.NON_APPLICABLE:
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getAuditResultLabel = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return "Conforme"
      case AuditResultType.NON_CONFORME:
        return "Non conforme"
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return "Conforme avec remarques"
      case AuditResultType.NON_APPLICABLE:
        return "Non applicable"
      default:
        return "Inconnu"
    }
  }

  const getAuditResultBadgeVariant = (result: AuditResultType) => {
    switch (result) {
      case AuditResultType.CONFORME:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case AuditResultType.NON_CONFORME:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case AuditResultType.CONFORME_AVEC_REMARQUES:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case AuditResultType.NON_APPLICABLE:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      default:
        return ""
    }
  }

  const getCriticalityBadgeVariant = (criticality: CriticalityLevel) => {
    switch (criticality) {
      case CriticalityLevel.CRITIQUE:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case CriticalityLevel.MAJEUR:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
      case CriticalityLevel.MINEUR:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case CriticalityLevel.INFO:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
      default:
        return ""
    }
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "Non définie"

    try {
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) {
        return "Date invalide"
      }
      return format(dateObj, isMobile ? "dd/MM/yy" : "dd MMMM yyyy", { locale: fr })
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error)
      return "Date invalide"
    }
  }

  const isOverdue = () => {
    return audit.next_audit_date && new Date(audit.next_audit_date) < new Date() && !audit.is_closed
  }

  const getAuditFrequencyLabel = (frequency: AuditFrequencyType) => {
    switch (frequency) {
      case AuditFrequencyType.QUOTIDIEN:
        return "Quotidien"
      case AuditFrequencyType.HEBDOMADAIRE:
        return "Hebdomadaire"
      case AuditFrequencyType.MENSUEL:
        return "Mensuel"
      case AuditFrequencyType.TRIMESTRIEL:
        return "Trimestriel"
      case AuditFrequencyType.SEMESTRIEL:
        return "Semestriel"
      case AuditFrequencyType.ANNUEL:
        return "Annuel"
      case AuditFrequencyType.BIANNUEL:
        return "Biannuel"
      case AuditFrequencyType.HEURES_DE_VOL:
        return "Basé sur les heures de vol"
      case AuditFrequencyType.APRES_INCIDENT:
        return "Après incident"
      case AuditFrequencyType.AUTRE:
        return "Autre fréquence"
      default:
        return "Inconnu"
    }
  }

  const groupedItems = audit?.audit_items?.reduce((acc: any, item: any) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-hidden p-0 sm:p-0"
      >
        <DialogHeader className="px-3 py-2 sm:px-5 sm:py-4 md:px-6 md:py-5 sticky top-0 bg-background z-10 border-b">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm sm:text-base">
            <div className="flex items-center gap-1.5">
              <Plane className="h-4 w-4 text-primary" />
              <span>Audit - {audit?.aircraft?.registration_number}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={`flex items-center gap-0.5 h-5 sm:h-6 text-2xs sm:text-xs ${getAuditResultBadgeVariant(audit?.audit_result)}`}
              >
                {getAuditResultIcon(audit?.audit_result)}
                {getAuditResultLabel(audit?.audit_result)}
              </Badge>
              {audit?.is_closed ? (
                <Badge
                  variant="outline"
                  className="h-5 sm:h-6 text-2xs sm:text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                >
                  <CheckSquare className="mr-0.5 h-3 w-3" />
                  Clôturé
                </Badge>
              ) : isOverdue() ? (
                <Badge
                  variant="outline"
                  className="h-5 sm:h-6 text-2xs sm:text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                >
                  <Clock className="mr-0.5 h-3 w-3" />
                  En retard
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="h-5 sm:h-6 text-2xs sm:text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                >
                  <Clock className="mr-0.5 h-3 w-3" />
                  En cours
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="sticky top-[53px] sm:top-[57px] md:top-[65px] z-10 px-3 sm:px-5 md:px-6 pt-2 bg-background w-full h-auto border-b justify-start">
            <TabsTrigger
              value="details"
              className="h-7 sm:h-8 text-2xs sm:text-xs data-[state=active]:bg-muted rounded-t-md rounded-b-none border-b-2 border-b-transparent data-[state=active]:border-b-primary"
              aria-label="Afficher les détails de l'audit"
            >
              Détails
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="h-7 sm:h-8 text-2xs sm:text-xs data-[state=active]:bg-muted rounded-t-md rounded-b-none border-b-2 border-b-transparent data-[state=active]:border-b-primary"
              aria-label="Afficher les éléments vérifiés"
            >
              Éléments ({audit?.audit_items?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-0 px-3 sm:px-5 md:px-6 py-3 sm:py-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader className="pb-1.5 px-3 sm:px-4">
                  <CardTitle className="text-xs sm:text-sm">Informations générales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 sm:space-y-2 px-3 sm:px-4 text-2xs sm:text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                      <span className="font-medium">Date d'audit</span>
                    </div>
                    <span>{formatDate(audit?.audit_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Plane className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                      <span className="font-medium">Aéronef</span>
                    </div>
                    <span className="truncate max-w-[180px]">
                      {audit?.aircraft?.registration_number} ({audit?.aircraft?.model})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                      <span className="font-medium">Auditeur</span>
                    </div>
                    <span className="truncate max-w-[180px]">
                      {audit?.auditor?.first_name} {audit?.auditor?.last_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                      <span className="font-medium">Fréquence</span>
                    </div>
                    <span>{getAuditFrequencyLabel(audit?.audit_frequency)}</span>
                  </div>
                  {audit?.next_audit_date && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                        <span className="font-medium">Prochain audit</span>
                      </div>
                      <span className={isOverdue() ? "text-red-600 dark:text-red-400" : ""}>
                        {formatDate(audit.next_audit_date)}
                      </span>
                    </div>
                  )}
                  {audit?.is_closed && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                          <span className="font-medium">Date de clôture</span>
                        </div>
                        <span>{formatDate(audit.closed_date)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                          <span className="font-medium">Clôturé par</span>
                        </div>
                        <span className="truncate max-w-[180px]">
                          {audit?.closed_by?.first_name} {audit?.closed_by?.last_name}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-1.5 px-3 sm:px-4">
                  <CardTitle className="text-xs sm:text-sm">Notes et actions correctives</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-4 text-2xs sm:text-xs">
                  <div>
                    <h4 className="font-medium mb-0.5 text-2xs sm:text-xs">Notes d'audit</h4>
                    <p className="text-muted-foreground whitespace-pre-line">{audit?.audit_notes || "Aucune note"}</p>
                  </div>
                  <Separator className="my-1.5" />
                  <div>
                    <h4 className="font-medium mb-0.5 text-2xs sm:text-xs">Actions correctives</h4>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {audit?.corrective_actions || "Aucune action corrective définie"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={onEdit}
                className="h-8 sm:h-9 px-2.5 sm:px-3 text-2xs sm:text-xs flex items-center gap-1"
                aria-label="Modifier l'audit"
              >
                <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Modifier
              </Button>
              {!audit?.is_closed && (
                <Button
                  onClick={handleCloseAudit}
                  disabled={closeLoading || isClosing}
                  className="h-8 sm:h-9 px-2.5 sm:px-3 text-2xs sm:text-xs flex items-center gap-1"
                  aria-label="Clôturer l'audit"
                >
                  {closeLoading && <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin mr-1" />}
                  <CheckSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Clôturer l'audit
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="items" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
            {audit?.audit_items?.length > 0 ? (
              <ScrollArea className="h-[calc(90vh-120px)] sm:h-[calc(90vh-130px)]">
                <div className="px-3 sm:px-5 md:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
                  {isMobile ? (
                    <Accordion type="single" collapsible className="w-full">
                      {Object.entries(groupedItems).map(([category, items]: [string, any], index) => (
                        <AccordionItem key={category} value={category} className="border-b border-border/70 mb-0">
                          <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              {getAuditCategoryLabel(category as AuditCategoryType)}
                              <Badge className="ml-1 text-[10px] h-4 px-1">{items.length}</Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-1 pb-3">
                            <div className="space-y-2.5">
                              {items.map((item: any) => (
                                <div key={item.id} className="border rounded-md p-2.5">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div className="space-y-1">
                                      <h4 className="font-medium text-2xs">{item.description}</h4>
                                      {item.criticality && (
                                        <Badge
                                          variant="outline"
                                          className={`${getCriticalityBadgeVariant(item.criticality)} text-[10px] h-4 px-1`}
                                        >
                                          {getCriticalityLabel(item.criticality)}
                                        </Badge>
                                      )}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`ml-1.5 ${getAuditResultBadgeVariant(item.result)} text-[10px] h-4 px-1`}
                                    >
                                      {getAuditResultLabel(item.result)}
                                    </Badge>
                                  </div>
                                  {item.notes && (
                                    <p className="text-[10px] text-muted-foreground whitespace-pre-line mt-1.5">
                                      {item.notes}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {item.requires_action && (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-[10px] h-4 px-1 flex items-center gap-0.5"
                                      >
                                        <FileWarning className="h-2.5 w-2.5" />
                                        Action requise
                                      </Badge>
                                    )}
                                    {item.requires_photo_evidence && (
                                      <Badge
                                        variant="outline"
                                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-[10px] h-4 px-1 flex items-center gap-0.5"
                                      >
                                        <Camera className="h-2.5 w-2.5" />
                                        Photo requise
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedItems).map(([category, items]: [string, any]) => (
                        <Card key={category} className="shadow-sm overflow-hidden">
                          <CardHeader className="py-2.5 px-4">
                            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-primary" />
                              {getAuditCategoryLabel(category as AuditCategoryType)}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 pt-0.5">
                            <div className="space-y-3">
                              {items.map((item: any) => (
                                <div key={item.id} className="border rounded-md p-3">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-1">
                                      <h4 className="font-medium text-xs">{item.description}</h4>
                                      {item.criticality && (
                                        <Badge
                                          variant="outline"
                                          className={`${getCriticalityBadgeVariant(item.criticality)} text-2xs h-5 px-1.5`}
                                        >
                                          {getCriticalityLabel(item.criticality)}
                                        </Badge>
                                      )}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className={`ml-2 ${getAuditResultBadgeVariant(item.result)} text-2xs h-5 px-1.5`}
                                    >
                                      {getAuditResultIcon(item.result)}
                                      <span className="ml-0.5">{getAuditResultLabel(item.result)}</span>
                                    </Badge>
                                  </div>
                                  {item.notes && (
                                    <p className="text-2xs text-muted-foreground whitespace-pre-line mt-2">
                                      {item.notes}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {item.requires_action && (
                                      <Badge
                                        variant="outline"
                                        className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 text-2xs flex items-center gap-0.5"
                                      >
                                        <FileWarning className="mr-0.5 h-3 w-3" />
                                        Action requise
                                      </Badge>
                                    )}
                                    {item.requires_photo_evidence && (
                                      <Badge
                                        variant="outline"
                                        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-2xs flex items-center gap-0.5"
                                      >
                                        <Camera className="mr-0.5 h-3 w-3" />
                                        Preuve photo requise
                                      </Badge>
                                    )}
                                  </div>
                                  {item.inspection_method && (
                                    <div className="mt-2 text-2xs">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="link" className="h-auto p-0 text-2xs">
                                              Voir les détails d'inspection
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-sm">
                                            <div className="space-y-1.5 p-1 text-2xs">
                                              <div>
                                                <span className="font-medium">Méthode d'inspection:</span>{" "}
                                                {item.inspection_method}
                                              </div>
                                              {item.expected_result && (
                                                <div>
                                                  <span className="font-medium">Résultat attendu:</span>{" "}
                                                  {item.expected_result}
                                                </div>
                                              )}
                                              {item.reference_documentation && (
                                                <div>
                                                  <span className="font-medium">Documentation de référence:</span>{" "}
                                                  {item.reference_documentation}
                                                </div>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-48 w-full items-center justify-center p-4 sm:p-6 text-center">
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-xs sm:text-sm font-medium">Aucun élément d'audit</p>
                  <p className="text-2xs sm:text-xs text-muted-foreground">
                    Cet audit ne contient aucun élément vérifié.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="sticky bottom-0 w-full bg-background border-t p-3 sm:p-4 flex flex-row justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-8 sm:h-9 px-3 sm:px-4 text-2xs sm:text-xs"
            aria-label="Fermer la fenêtre de détails"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
