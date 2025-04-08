"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMutation } from "@apollo/client"
import { CREATE_AIRCRAFT } from "@/graphql/planes"
import { AvailabilityStatus, type CreateAircraftInput, type CreateAircraftResponse } from "@/interfaces/aircraft"
import { toast } from "@/components/hooks/use-toast"
import { Loader2, Upload, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CreateAircraftFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateAircraftForm({ isOpen, onClose, onSuccess }: CreateAircraftFormProps) {
  const [formData, setFormData] = useState<CreateAircraftInput>({
    registration_number: "",
    model: "",
    year_of_manufacture: new Date().getFullYear(),
    availability_status: AvailabilityStatus.AVAILABLE,
    maintenance_status: "OK",
    hourly_cost: 0,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const [createAircraft, { loading }] = useMutation<CreateAircraftResponse>(CREATE_AIRCRAFT, {
    onCompleted: () => {
      toast({
        title: "Aéronef créé",
        description: "L'aéronef a été créé avec succès.",
      })
      resetForm()
      onSuccess()
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la création de l'aéronef: ${error.message}`,
        variant: "destructive",
      })
    },
  })

  const resetForm = () => {
    setFormData({
      registration_number: "",
      model: "",
      year_of_manufacture: new Date().getFullYear(),
      availability_status: AvailabilityStatus.AVAILABLE,
      maintenance_status: "OK",
      hourly_cost: 0,
    })
    setImageFile(null)
    setDocumentFile(null)
    setImagePreview(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "year_of_manufacture" ||
        name === "hourly_cost" ||
        name === "maxAltitude" ||
        name === "cruiseSpeed" ||
        name === "consumption"
          ? Number.parseFloat(value)
          : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocumentFile(e.target.files[0])
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  const clearDocument = () => {
    setDocumentFile(null)
    if (documentInputRef.current) {
      documentInputRef.current.value = ""
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createAircraft({
      variables: {
        createAircraftInput: formData,
        file: documentFile,
        image: imageFile,
      },
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel aéronef</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-14 lg:h-10">
              <TabsTrigger value="general" className="text-ellipsis overflow-hidden whitespace-pre-line">Informations générales</TabsTrigger>
              <TabsTrigger value="technical" className="text-ellipsis overflow-hidden whitespace-pre-line">Caractéristiques & Médias</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Immatriculation *</Label>
                  <Input
                    id="registration_number"
                    name="registration_number"
                    value={formData.registration_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Modèle *</Label>
                  <Input id="model" name="model" value={formData.model} onChange={handleInputChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year_of_manufacture">Année de fabrication *</Label>
                  <Input
                    id="year_of_manufacture"
                    name="year_of_manufacture"
                    type="number"
                    value={formData.year_of_manufacture}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hourly_cost">Coût horaire (€) *</Label>
                  <Input
                    id="hourly_cost"
                    name="hourly_cost"
                    type="number"
                    step="0.01"
                    value={formData.hourly_cost}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability_status">Statut de disponibilité *</Label>
                  <Select
                    value={formData.availability_status}
                    onValueChange={(value) => handleSelectChange("availability_status", value)}
                  >
                    <SelectTrigger id="availability_status">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={AvailabilityStatus.AVAILABLE}>Disponible</SelectItem>
                      <SelectItem value={AvailabilityStatus.UNAVAILABLE}>Indisponible</SelectItem>
                      <SelectItem value={AvailabilityStatus.RESERVED}>Réservé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_status">Statut de maintenance *</Label>
                  <Select
                    value={formData.maintenance_status}
                    onValueChange={(value) => handleSelectChange("maintenance_status", value)}
                  >
                    <SelectTrigger id="maintenance_status">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OK">OK</SelectItem>
                      <SelectItem value="Maintenance requise">Maintenance requise</SelectItem>
                      <SelectItem value="En maintenance">En maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_location">Localisation actuelle</Label>
                  <Input
                    id="current_location"
                    name="current_location"
                    value={formData.current_location || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_inspection_date">Date de dernière inspection</Label>
                  <Input
                    id="last_inspection_date"
                    name="last_inspection_date"
                    type="date"
                    value={formData.last_inspection_date || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="technical" className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxAltitude">Altitude maximale (ft)</Label>
                  <Input
                    id="maxAltitude"
                    name="maxAltitude"
                    type="number"
                    value={formData.maxAltitude || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cruiseSpeed">Vitesse de croisière (kt)</Label>
                  <Input
                    id="cruiseSpeed"
                    name="cruiseSpeed"
                    type="number"
                    value={formData.cruiseSpeed || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consumption">Consommation (L/h)</Label>
                  <Input
                    id="consumption"
                    name="consumption"
                    type="number"
                    step="0.1"
                    value={formData.consumption || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Label htmlFor="image">Image de l'aéronef</Label>
                      <div
                        className="relative flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        {imagePreview ? (
                          <>
                            <div className="relative h-full w-full">
                              <Image
                                src={imagePreview || "/placeholder.svg"}
                                alt="Aperçu de l'image"
                                fill
                                className="rounded-lg object-contain p-2"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute right-2 top-2 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation()
                                clearImage()
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center pb-6 pt-5">
                            <Upload className="mb-2 h-8 w-8 text-gray-400" />
                            <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                              <span className="font-semibold">Cliquez pour télécharger</span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG ou JPEG</p>
                          </div>
                        )}
                        <input
                          ref={imageInputRef}
                          id="image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <Label htmlFor="document">Document (manuel, certificat, etc.)</Label>
                      <div
                        className="relative flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                        onClick={() => documentInputRef.current?.click()}
                      >
                        <div className="flex flex-col items-center justify-center pb-6 pt-5">
                          <Upload className="mb-2 h-8 w-8 text-gray-400" />
                          <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Cliquez pour télécharger</span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">PDF, DOC ou DOCX</p>
                          {documentFile && (
                            <div className="mt-2 flex items-center gap-1 text-sm font-medium text-primary">
                              <span className="truncate max-w-[150px]">{documentFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  clearDocument()
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <input
                          ref={documentInputRef}
                          id="document"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={handleDocumentChange}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'aéronef
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
