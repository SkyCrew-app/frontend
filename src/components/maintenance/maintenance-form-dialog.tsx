"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon, Loader2, Upload, FileTextIcon } from "lucide-react"
import type { Maintenance } from "@/interfaces/maintenance"
import { useToast } from "@/components/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Aircraft {
  id: string
  registration_number: string
  model: string
}

interface Technician {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role?: {
    id: string
    role_name: string
  }
}

interface MaintenanceFormDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  maintenance?: Maintenance | null
  maintenanceTypes: Record<string, string>
  maintenanceStatuses: Record<string, string>
  aircrafts: Aircraft[]
  technicians: Technician[]
  onSubmit: (formData: MaintenanceFormData) => Promise<void>
}

interface MaintenanceFormData {
  id?: string
  aircraft_id: string
  maintenance_type: string
  status: string
  start_date: Date
  end_date: Date
  description: string
  maintenance_cost: string
  technician_id: string
  images?: File[]
  documents?: File[]
}

export function MaintenanceFormDialog({
  isOpen,
  onOpenChange,
  maintenance,
  maintenanceTypes,
  maintenanceStatuses,
  aircrafts,
  technicians,
  onSubmit,
}: MaintenanceFormDialogProps) {
  const isEditing = !!maintenance
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<MaintenanceFormData>({
    aircraft_id: "",
    maintenance_type: "INSPECTION",
    status: "PLANNED",
    start_date: new Date(),
    end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
    description: "",
    maintenance_cost: "",
    technician_id: "",
    images: [],
    documents: [],
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (maintenance) {
      setFormData({
        id: maintenance.id.toString(),
        aircraft_id: maintenance.aircraft.id.toString(),
        maintenance_type: maintenance.maintenance_type,
        status: maintenance.status,
        start_date: new Date(maintenance.start_date),
        end_date: new Date(maintenance.end_date),
        description: maintenance.description || "",
        maintenance_cost: maintenance.maintenance_cost?.toString() || "",
        technician_id: maintenance.technician?.id?.toString() || "",
        images: [],
        documents: [],
      })
    } else {
      setFormData({
        aircraft_id: "",
        maintenance_type: "INSPECTION",
        status: "PLANNED",
        start_date: new Date(),
        end_date: new Date(new Date().setDate(new Date().getDate() + 7)),
        description: "",
        maintenance_cost: "",
        technician_id: "",
        images: [],
        documents: [],
      })
      setImageFiles([])
      setDocumentFiles([])
    }
    setErrors({})
  }, [maintenance, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.aircraft_id) {
      newErrors.aircraft_id = "Veuillez sélectionner un aéronef"
    }
    if (!formData.maintenance_type) {
      newErrors.maintenance_type = "Veuillez sélectionner un type de maintenance"
    }
    if (!formData.status) {
      newErrors.status = "Veuillez sélectionner un statut"
    }
    if (!formData.start_date) {
      newErrors.start_date = "Veuillez sélectionner une date de début"
    }
    if (!formData.end_date) {
      newErrors.end_date = "Veuillez sélectionner une date de fin"
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = "La date de fin doit être postérieure à la date de début"
    }
    if (formData.maintenance_cost && isNaN(Number(formData.maintenance_cost))) {
      newErrors.maintenance_cost = "Le coût doit être un nombre valide"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof MaintenanceFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setImageFiles((prev) => [...prev, ...files])
    }
  }

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      setDocumentFiles((prev) => [...prev, ...files])
    }
  }

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const removeDocument = (index: number) => {
    setDocumentFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const submitData = {
        ...formData,
        images: imageFiles,
        documents: documentFiles,
      }
      await onSubmit(submitData)
      onOpenChange(false)
      toast({
        title: isEditing ? "Maintenance mise à jour" : "Maintenance créée",
        description: isEditing
          ? "La maintenance a été mise à jour avec succès."
          : "La nouvelle maintenance a été créée avec succès.",
      })
    } catch (error) {
      console.error("Erreur lors de la soumission:", error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement de la maintenance.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>{isEditing ? "Modifier la maintenance" : "Nouvelle maintenance"}</DialogTitle>
        <DialogDescription>
          {isEditing
            ? "Modifiez les informations de maintenance pour cet aéronef."
            : "Remplissez le formulaire pour créer une nouvelle maintenance."}
        </DialogDescription>

        <div className="grid gap-6 py-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="attachments">Pièces jointes</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aircraft_id" className={errors.aircraft_id ? "text-destructive" : ""}>
                    Aéronef <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.aircraft_id} onValueChange={(value) => handleChange("aircraft_id", value)}>
                    <SelectTrigger id="aircraft_id" className={errors.aircraft_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Sélectionner un aéronef" />
                    </SelectTrigger>
                    <SelectContent>
                      {aircrafts.map((aircraft) => (
                        <SelectItem key={aircraft.id} value={aircraft.id}>
                          {aircraft.registration_number} ({aircraft.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.aircraft_id && <p className="text-sm text-destructive">{errors.aircraft_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_type" className={errors.maintenance_type ? "text-destructive" : ""}>
                    Type de maintenance <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.maintenance_type}
                    onValueChange={(value) => handleChange("maintenance_type", value)}
                  >
                    <SelectTrigger
                      id="maintenance_type"
                      className={errors.maintenance_type ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(maintenanceTypes).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.maintenance_type && <p className="text-sm text-destructive">{errors.maintenance_type}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className={errors.status ? "text-destructive" : ""}>
                    Statut <span className="text-destructive">*</span>
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                    <SelectTrigger id="status" className={errors.status ? "border-destructive" : ""}>
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(maintenanceStatuses).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="technician_id">Technicien</Label>
                  <Select
                    value={formData.technician_id}
                    onValueChange={(value) => handleChange("technician_id", value)}
                  >
                    <SelectTrigger id="technician_id">
                      <SelectValue placeholder="Sélectionner un technicien" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Non assigné</SelectItem>
                      {technicians.map((technician) => (
                        <SelectItem key={technician.id} value={technician.id}>
                          {technician.first_name && technician.last_name
                            ? `${technician.first_name} ${technician.last_name} (${technician.email})`
                            : technician.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date" className={errors.start_date ? "text-destructive" : ""}>
                    Date de début <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.start_date ? "border-destructive" : ""}`}
                        id="start_date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.start_date ? (
                          format(formData.start_date, "dd MMMM yyyy", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.start_date}
                        onSelect={(date) => handleChange("start_date", date)}
                        initialFocus
                        locale={fr}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.start_date && <p className="text-sm text-destructive">{errors.start_date}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date" className={errors.end_date ? "text-destructive" : ""}>
                    Date de fin <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${errors.end_date ? "border-destructive" : ""}`}
                        id="end_date"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.end_date ? (
                          format(formData.end_date, "dd MMMM yyyy", { locale: fr })
                        ) : (
                          <span>Sélectionner une date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.end_date}
                        onSelect={(date) => handleChange("end_date", date)}
                        initialFocus
                        locale={fr}
                        disabled={(date) => date < formData.start_date}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.end_date && <p className="text-sm text-destructive">{errors.end_date}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez la maintenance à effectuer..."
                  rows={5}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance_cost" className={errors.maintenance_cost ? "text-destructive" : ""}>
                  Coût (€)
                </Label>
                <Input
                  id="maintenance_cost"
                  type="text"
                  placeholder="0.00"
                  value={formData.maintenance_cost}
                  onChange={(e) => handleChange("maintenance_cost", e.target.value)}
                  className={errors.maintenance_cost ? "border-destructive" : ""}
                />
                {errors.maintenance_cost && <p className="text-sm text-destructive">{errors.maintenance_cost}</p>}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="space-y-6 mt-4">
              <div className="space-y-4">
                <Label>Images</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {imageFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        <img
                          src={URL.createObjectURL(file) || "/placeholder.svg"}
                          alt={`Aperçu ${index}`}
                          className="w-12 h-12 object-cover rounded mr-2"
                        />
                        <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImage(index)}
                        aria-label={`Supprimer l'image ${file.name}`}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Cliquez pour ajouter</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (max. 10 Mo)</p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/png, image/jpeg, image/jpg"
                      multiple
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Documents</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documentFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        <FileTextIcon className="w-8 h-8 mr-2 text-blue-500" />
                        <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(index)}
                        aria-label={`Supprimer le document ${file.name}`}
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="document-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Cliquez pour ajouter</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS, XLSX (max. 10 Mo)</p>
                    </div>
                    <input
                      id="document-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      multiple
                      onChange={handleDocumentChange}
                    />
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Mettre à jour" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
