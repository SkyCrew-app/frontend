"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, FileText, PlaneTakeoff } from "lucide-react"
import type { Aircraft } from "@/interfaces/aircraft"
import { StatusBadge } from "./status-badge"

interface AircraftDetailDialogProps {
  aircraft: Aircraft | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AircraftDetailDialog({ aircraft, isOpen, onOpenChange }: AircraftDetailDialogProps) {
  if (!aircraft) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <PlaneTakeoff className="h-6 w-6 mr-2" />
            {aircraft.registration_number} - {aircraft.model}
          </DialogTitle>
          <DialogDescription>Détails complets de l'aéronef et historique de maintenance</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Immatriculation</p>
                    <p className="font-medium">{aircraft.registration_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modèle</p>
                    <p className="font-medium">{aircraft.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Année de fabrication</p>
                    <p className="font-medium">{aircraft.year_of_manufacture}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Heures de vol totales</p>
                    <p className="font-medium">{aircraft.total_flight_hours} heures</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Coût horaire</p>
                    <p className="font-medium">{aircraft.hourly_cost.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Consommation</p>
                    <p className="font-medium">{aircraft.consumption} L/h</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Disponibilité</p>
                    <div className="mt-1">
                      <StatusBadge status={aircraft.availability_status} type="availability" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">État de maintenance</p>
                    <div className="mt-1">
                      <StatusBadge status={aircraft.maintenance_status} type="maintenance" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aircraft.documents_url?.length ? (
                  <div className="grid grid-cols-1 gap-2">
                    {aircraft.documents_url.map((url, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-blue-500" />
                          <span className="truncate max-w-[200px] sm:max-w-[300px]">
                            Document {index + 1} - {url.split("/").pop()}
                          </span>
                        </div>
                        <a
                          href={`http://localhost:3000${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 flex items-center ml-2 flex-shrink-0"
                          aria-label={`Ouvrir le document ${index + 1}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Aucun document disponible pour cet aéronef</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Image de l'aéronef</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-4">
                {aircraft.image_url ? (
                  <img
                    src={`http://localhost:3000${aircraft.image_url}`}
                    alt={`${aircraft.model} - ${aircraft.registration_number}`}
                    className="max-w-full h-auto object-cover rounded-md shadow"
                  />
                ) : (
                  <div className="w-full aspect-video bg-muted flex items-center justify-center rounded-md">
                    <PlaneTakeoff className="h-12 w-12 text-muted-foreground opacity-20" />
                    <span className="text-muted-foreground ml-2">Aucune image disponible</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
