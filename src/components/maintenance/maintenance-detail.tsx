"use client"

import { DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { FileTextIcon, ImageIcon } from "lucide-react"
import { useState, useEffect } from "react"
import type { CarouselApi } from "@/components/ui/carousel"
import { StatusBadge } from "./status-badge"
import { MaintenanceTypeIcon } from "./maintenance-type-icon"
import type { Maintenance } from "@/interfaces/maintenance"

interface MaintenanceDetailProps {
  maintenance: Maintenance | null
  maintenanceTypes: Record<string, string>
  maintenanceStatuses: Record<string, string>
}

export function MaintenanceDetail({ maintenance, maintenanceTypes, maintenanceStatuses }: MaintenanceDetailProps) {
  const [api, setApi] = useState<CarouselApi | undefined>(undefined)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageCount, setImageCount] = useState(0)

  useEffect(() => {
    if (!api) return
    setImageCount(api.scrollSnapList().length)
    setCurrentImageIndex(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrentImageIndex(api.selectedScrollSnap() + 1)
    })
  }, [api])

  if (!maintenance) return null

  return (
    <DialogContent className="max-w-3xl">
      <DialogTitle>Détails de la Maintenance</DialogTitle>
      <DialogDescription>
        Informations complètes sur la maintenance de l'aéronef {maintenance.aircraft.registration_number}
      </DialogDescription>

      <div className="mt-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aéronef:</span>
                <span className="font-medium">
                  {maintenance.aircraft.registration_number} ({maintenance.aircraft.model})
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Type:</span>
                <MaintenanceTypeIcon
                  type={maintenance.maintenance_type as any}
                  label={maintenanceTypes[maintenance.maintenance_type] || "N/A"}
                />
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Statut:</span>
                <StatusBadge status={maintenance.status as any} />
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Période:</span>
                <span className="font-medium">
                  {new Date(maintenance.start_date).toLocaleDateString("fr-FR")} -{" "}
                  {new Date(maintenance.end_date).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût:</span>
                <div className="flex items-center">
                  <span className="font-medium">
                    {maintenance.maintenance_cost ? `${maintenance.maintenance_cost} €` : "Non défini"}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Technicien:</span>
                <span className="font-medium">
                  {maintenance.technician ? maintenance.technician.email : "Non assigné"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{maintenance.description || "Aucune description disponible."}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="images" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="images">
              <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Images
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileTextIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Documents
            </TabsTrigger>
          </TabsList>
          <TabsContent value="images" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {maintenance.images_url?.length ? (
                  <div className="space-y-4">
                    <Carousel setApi={setApi} className="w-full max-w-xl mx-auto">
                      <CarouselContent>
                        {maintenance.images_url.map((url, index) => (
                          <CarouselItem key={index}>
                            <div className="p-1">
                              <div className="overflow-hidden rounded-lg">
                                <img
                                  src={`http://localhost:3000${url}`}
                                  alt={`Image de maintenance ${index + 1} pour ${maintenance.aircraft.registration_number}`}
                                  className="w-full h-auto object-cover aspect-video"
                                />
                              </div>
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious aria-label="Image précédente" />
                      <CarouselNext aria-label="Image suivante" />
                    </Carousel>
                    <div className="text-center text-sm text-muted-foreground" aria-live="polite">
                      Image {currentImageIndex} sur {imageCount}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-20" aria-hidden="true" />
                    <p>Aucune image disponible pour cette maintenance</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {maintenance.documents_url?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {maintenance.documents_url.map((url, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="p-0">
                          <a
                            href={`http://localhost:3000${url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-4 hover:bg-muted transition-colors"
                            aria-label={`Document ${index + 1} - ${url.split("/").pop()}`}
                          >
                            <FileTextIcon className="h-8 w-8 mr-4 text-blue-500" aria-hidden="true" />
                            <div>
                              <div className="font-medium">Document {index + 1}</div>
                              <div className="text-sm text-muted-foreground">{url.split("/").pop()}</div>
                            </div>
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileTextIcon className="h-12 w-12 mx-auto mb-2 opacity-20" aria-hidden="true" />
                    <p>Aucun document disponible pour cette maintenance</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter className="mt-6">
        <Button variant="outline">Modifier</Button>
        <DialogClose asChild>
          <Button>Fermer</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  )
}
