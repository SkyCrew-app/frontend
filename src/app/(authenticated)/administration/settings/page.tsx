"use client"

import { useEffect, useRef, useState } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/hooks/use-toast"
import { useMutation, useQuery } from "@apollo/client"
import { Skeleton } from "@/components/ui/skeleton"
import { GET_ADMINISTRATION, UPDATE_ADMINISTRATION } from "@/graphql/settings"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { format, parseISO } from "date-fns"
import { motion } from "framer-motion"
import { Settings, Save, RotateCcw } from "lucide-react"
import { GeneralTab } from "@/components/settings/tabs/general-tab"
import { OperationsTab } from "@/components/settings/tabs/operations-tab"
import { AircraftTab } from "@/components/settings/tabs/aircraft-tab"
import { MembersTab } from "@/components/settings/tabs/members-tab"
import { TaxonomyManager } from "@/components/settings/taxonomy/taxonomy-manager"
import { RoleManager } from "@/components/settings/roles/roles-manager"

const formSchema = z.object({
  clubName: z.string().min(2, { message: "Le nom de l'aéroclub doit contenir au moins 2 caractères" }),
  contactEmail: z.string().email({ message: "Veuillez entrer une adresse email valide" }),
  contactPhone: z.string().regex(/^\+?[0-9]{10,14}$/, { message: "Veuillez entrer un numéro de téléphone valide" }),
  address: z.string().min(5, { message: "L'adresse doit contenir au moins 5 caractères" }),
  closureDays: z.array(z.string()),
  timeSlotDuration: z.number().min(30).max(120),
  reservationStartTime: z.string(),
  reservationEndTime: z.string(),
  maintenanceDay: z.string(),
  maintenanceDuration: z.number().min(1).max(24),
  aircraftTypes: z.array(
    z.object({
      type: z.string(),
      hourlyRate: z.number().min(0),
      isAvailable: z.boolean(),
    }),
  ),
  pilotLicenses: z.array(z.string()),
  membershipFee: z.number().min(0),
  flightHourRate: z.number().min(0),
  clubRules: z.string(),
  allowGuestPilots: z.boolean(),
  guestPilotFee: z.number().min(0),
  fuelManagement: z.enum(["self-service", "staff-only", "external"]),
  fuelPrice: z.number().min(0, { message: "Le prix du carburant doit être positif" }),
  taxonomies: z.record(z.array(z.string())).optional(),
  isMaintenanceActive: z.boolean(),
  maintenanceMessage: z.string().optional(),
  maintenanceTime: z
    .string()
    .nullable()
    .transform((val) => (val ? new Date(val).toISOString() : null)),
})

type FormValues = z.infer<typeof formSchema>

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function SettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [updateAdministration] = useMutation(UPDATE_ADMINISTRATION)
  const { data: aircraftData, loading: aircraftLoading, error: aircraftError } = useQuery(GET_AIRCRAFTS)
  const {
    data: administrationData,
    loading: administrationLoading,
    error: administrationError,
  } = useQuery(GET_ADMINISTRATION)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  })

  const isResetRef = useRef(false)

  useEffect(() => {
    if (
      !isResetRef.current &&
      administrationData?.getAllAdministrations?.length &&
      aircraftData?.getAircrafts?.length
    ) {
      const adminData = administrationData.getAllAdministrations[0]

      form.reset({
        clubName: adminData.clubName,
        contactEmail: adminData.contactEmail,
        contactPhone: adminData.contactPhone,
        address: adminData.address,
        closureDays: adminData.closureDays || [],
        timeSlotDuration: adminData.timeSlotDuration,
        reservationStartTime: adminData.reservationStartTime,
        reservationEndTime: adminData.reservationEndTime,
        maintenanceDay: adminData.maintenanceDay,
        maintenanceDuration: adminData.maintenanceDuration,
        aircraftTypes: aircraftData.getAircrafts.map((aircraft: { registration_number: any; hourly_cost: any }) => ({
          type: aircraft.registration_number,
          hourlyRate: aircraft.hourly_cost,
          isAvailable: true,
        })),
        membershipFee: adminData.membershipFee,
        flightHourRate: adminData.flightHourRate,
        clubRules: adminData.clubRules || "",
        allowGuestPilots: adminData.allowGuestPilots || false,
        guestPilotFee: adminData.guestPilotFee || 0,
        fuelManagement: adminData.fuelManagement || "self-service",
        fuelPrice: adminData.fuelPrice || 0,
        taxonomies: {
          maintenanceTypes: adminData.taxonomies?.maintenanceTypes || [],
          licenseTypes: adminData.taxonomies?.licenseTypes || [],
          aircraftCategories: adminData.taxonomies?.aircraftCategories || [],
          flightTypes: adminData.taxonomies?.flightTypes || [],
        },
        pilotLicenses: adminData.pilotLicenses || [],
        isMaintenanceActive: adminData.isMaintenanceActive || false,
        maintenanceMessage: adminData.maintenanceMessage || "",
        maintenanceTime: adminData.maintenanceTime
          ? format(parseISO(adminData.maintenanceTime), "yyyy-MM-dd'T'HH:mm")
          : null,
      })
      isResetRef.current = true
    }
  }, [administrationData, aircraftData, form])

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      await updateAdministration({
        variables: {
          input: {
            id: 1,
            clubName: data.clubName,
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            address: data.address,
            closureDays: data.closureDays,
            timeSlotDuration: data.timeSlotDuration,
            reservationStartTime: data.reservationStartTime,
            reservationEndTime: data.reservationEndTime,
            maintenanceDay: data.maintenanceDay,
            maintenanceDuration: data.maintenanceDuration,
            pilotLicenses: data.pilotLicenses,
            membershipFee: data.membershipFee,
            flightHourRate: data.flightHourRate,
            clubRules: data.clubRules,
            allowGuestPilots: data.allowGuestPilots,
            guestPilotFee: data.guestPilotFee,
            fuelManagement: data.fuelManagement,
            fuelPrice: data.fuelPrice,
            taxonomies: data.taxonomies,
            isMaintenanceActive: data.isMaintenanceActive,
            maintenanceMessage: data.maintenanceMessage,
            maintenanceTime: data.maintenanceTime,
          },
        },
      })
      toast({
        title: "Paramètres enregistrés",
        description: "Les modifications ont été sauvegardées avec succès.",
      })
    } catch (error) {
      console.error("Error updating administration:", error)

      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des paramètres.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (aircraftError || administrationError) {
    return (
      <div className="text-center text-red-500 p-6 border border-red-200 rounded-md">
        <p className="font-semibold mb-2">Erreur lors du chargement des données :</p>
        {aircraftError && <p>Impossible de charger les avions.</p>}
        {administrationError && <p>Impossible de charger les paramètres.</p>}
        <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    )
  }

  if (aircraftLoading || administrationLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeIn} className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <Settings className="h-8 w-8 text-blue-500" />
                Paramètres de l'Aéroclub
              </h1>
              <p className="text-muted-foreground mt-1">
                Configurez les paramètres généraux, les opérations, les avions et les membres de l'aéroclub
              </p>
            </div>
          </div>

          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="w-full md:w-auto flex md:inline-flex space-x-1">
                      <TabsTrigger
                        value="general"
                        className="flex items-center whitespace-nowrap"
                        data-active={activeTab === "general"}
                      >
                        Général
                      </TabsTrigger>
                      <TabsTrigger
                        value="operations"
                        className="flex items-center whitespace-nowrap"
                        data-active={activeTab === "operations"}
                      >
                        Opérations
                      </TabsTrigger>
                      <TabsTrigger
                        value="aircraft"
                        className="flex items-center whitespace-nowrap"
                        data-active={activeTab === "aircraft"}
                      >
                        Avions
                      </TabsTrigger>
                      <TabsTrigger
                        value="members"
                        className="flex items-center whitespace-nowrap"
                        data-active={activeTab === "members"}
                      >
                        Membres
                      </TabsTrigger>
                      <TabsTrigger
                        value="roles"
                        className="flex items-center whitespace-nowrap"
                        data-active={activeTab === "roles"}
                      >
                        Rôles
                      </TabsTrigger>
                      <TabsTrigger
                        value="taxonomy"
                        className="flex items-center whitespace-nowrap"
                        data-active={activeTab === "taxonomy"}
                      >
                        Taxonomie
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="general" className="focus-visible:outline-none focus-visible:ring-0">
                    <GeneralTab />
                  </TabsContent>

                  <TabsContent value="operations" className="focus-visible:outline-none focus-visible:ring-0">
                    <OperationsTab />
                  </TabsContent>

                  <TabsContent value="aircraft" className="focus-visible:outline-none focus-visible:ring-0">
                    <AircraftTab />
                  </TabsContent>

                  <TabsContent value="members" className="focus-visible:outline-none focus-visible:ring-0">
                    <MembersTab />
                  </TabsContent>

                  <TabsContent value="roles" className="focus-visible:outline-none focus-visible:ring-0">
                    <RoleManager />
                  </TabsContent>

                  <TabsContent value="taxonomy" className="focus-visible:outline-none focus-visible:ring-0">
                    <TaxonomyManager />
                  </TabsContent>
                </Tabs>

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      isResetRef.current = false
                      form.reset()
                    }}
                    className="order-2 sm:order-1"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Réinitialiser
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        disabled={isSubmitting}
                        className="order-1 sm:order-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSubmitting ? "Enregistrement..." : "Enregistrer les modifications"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr de vouloir enregistrer ces modifications ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action mettra à jour les paramètres de l'aéroclub. Assurez-vous que toutes les
                          informations sont correctes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => form.handleSubmit(onSubmit)()}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Confirmer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            </form>
          </FormProvider>
        </motion.div>
      </div>
    </div>
  )
}
