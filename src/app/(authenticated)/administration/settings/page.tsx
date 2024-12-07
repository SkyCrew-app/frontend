'use client';

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from '@/components/ui/separator';
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/components/hooks/use-toast"
import { TaxonomyManager } from '@/components/ui/taxonomyManager';
import { useMutation, useQuery } from '@apollo/client';
import { Skeleton } from "@/components/ui/skeleton";
import { GET_ADMINISTRATION, UPDATE_ADMINISTRATION } from '@/graphql/settings';
import { GET_AIRCRAFTS } from '@/graphql/planes';

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
  aircraftTypes: z.array(z.object({
    type: z.string(),
    hourlyRate: z.number().min(0),
    isAvailable: z.boolean(),
  })),
  pilotLicenses: z.array(z.string()),
  membershipFee: z.number().min(0),
  flightHourRate: z.number().min(0),
  clubRules: z.string(),
  allowGuestPilots: z.boolean(),
  guestPilotFee: z.number().min(0),
  fuelManagement: z.enum(['self-service', 'staff-only', 'external']),
  taxonomies: z.record(z.array(z.string())).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateAdministration] = useMutation(UPDATE_ADMINISTRATION);
  const { data: aircraftData, loading: aircraftLoading, error: aircraftError } = useQuery(GET_AIRCRAFTS);
  const { data: administrationData, loading: administrationLoading, error: administrationError } = useQuery(GET_ADMINISTRATION);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (administrationData?.getAllAdministrations?.length && aircraftData?.getAircrafts?.length) {
      form.reset({
        clubName: administrationData.getAllAdministrations[0].clubName,
        contactEmail: administrationData.getAllAdministrations[0].contactEmail,
        contactPhone: administrationData.getAllAdministrations[0].contactPhone,
        address: administrationData.getAllAdministrations[0].address,
        closureDays: administrationData.getAllAdministrations[0].closureDays,
        timeSlotDuration: administrationData.getAllAdministrations[0].timeSlotDuration,
        reservationStartTime: administrationData.getAllAdministrations[0].reservationStartTime,
        reservationEndTime: administrationData.getAllAdministrations[0].reservationEndTime,
        maintenanceDay: administrationData.getAllAdministrations[0].maintenanceDay,
        maintenanceDuration: administrationData.getAllAdministrations[0].maintenanceDuration,
        aircraftTypes: aircraftData.getAircrafts.map((aircraft: { registration_number: any; hourly_cost: any; }) => ({
          type: aircraft.registration_number,
          hourlyRate: aircraft.hourly_cost,
          isAvailable: true,
        })),
        membershipFee: administrationData.getAllAdministrations[0].membershipFee,
        flightHourRate: administrationData.getAllAdministrations[0].flightHourRate,
        clubRules: administrationData.getAllAdministrations[0].clubRules,
        allowGuestPilots: administrationData.getAllAdministrations[0].allowGuestPilots,
        guestPilotFee: administrationData.getAllAdministrations[0].guestPilotFee,
        fuelManagement: administrationData.getAllAdministrations[0].fuelManagement,
        taxonomies: {
          maintenanceTypes: [],
          licenseTypes: [],
          aircraftCategories: [],
          flightTypes: [],
        },
        pilotLicenses: administrationData.getAllAdministrations[0].pilotLicenses || [],
      });
    }
  }, [administrationData, aircraftData, form]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

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
          },
        },
      });
      toast({
        title: "Paramètres enregistrés",
        description: "Les modifications ont été sauvegardées avec succès.",
      });
    } catch (error) {
      console.error('Error creating administration:', error);

      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (aircraftError || administrationError) {
    return (
      <div className="text-center text-red-500">
        <p>Erreur lors du chargement des données :</p>
        {aircraftError && <p>Impossible de charger les avions.</p>}
        {administrationError && <p>Impossible de charger les paramètres.</p>}
      </div>
    );
  }

  if (aircraftLoading || administrationLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Paramètres de l'Aéroclub</h1>

      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-5">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="operations">Opérations</TabsTrigger>
              <TabsTrigger value="aircraft">Avions</TabsTrigger>
              <TabsTrigger value="members">Membres</TabsTrigger>
              <TabsTrigger value="taxonomy">Taxonomie</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres généraux</CardTitle>
                  <CardDescription>Configurez les informations générales de l'aéroclub.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="club-name">Nom de l'aéroclub</Label>
                    <Input id="club-name" {...form.register('clubName')} />
                    {form.formState.errors.clubName && (
                      <p className="text-sm text-red-500">{form.formState.errors.clubName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email de contact</Label>
                    <Input id="contact-email" type="email" {...form.register('contactEmail')} />
                    {form.formState.errors.contactEmail && (
                      <p className="text-sm text-red-500">{form.formState.errors.contactEmail.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">Numéro de contact</Label>
                    <Input id="contact-phone" type="tel" {...form.register('contactPhone')} />
                    {form.formState.errors.contactPhone && (
                      <p className="text-sm text-red-500">{form.formState.errors.contactPhone.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Textarea id="address" {...form.register('address')} />
                    {form.formState.errors.address && (
                      <p className="text-sm text-red-500">{form.formState.errors.address.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operations">
              <Card>
                <CardHeader>
                  <CardTitle>Opérations</CardTitle>
                  <CardDescription>Configurez les paramètres opérationnels de l'aéroclub.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Jours de fermeture</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => (
                        <div key={day} className="flex items-center space-x-2">
                          <Checkbox
                            id={`closure-${day}`}
                            {...form.register('closureDays')}
                            value={day}
                            defaultChecked={form.watch('closureDays')?.includes(day)}
                            onCheckedChange={(checked) => {
                              const currentDays = form.getValues('closureDays') || [];
                              const updatedDays = checked
                                ? [...currentDays, day]
                                : currentDays.filter((d) => d !== day);
                              form.setValue('closureDays', updatedDays);
                            }}
                          />
                          <Label htmlFor={`closure-${day}`}>{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="timeslot-duration">Durée du créneau (en minutes)</Label>
                    <Select
                      onValueChange={(value) => form.setValue('timeSlotDuration', parseInt(value))}
                      defaultValue={form.getValues('timeSlotDuration')?.toString() || '30'}
                    >
                      <SelectTrigger id="timeslot-duration">
                        <SelectValue placeholder="Sélectionnez la durée" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                        <SelectItem value="90">1 heure 30</SelectItem>
                        <SelectItem value="120">2 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation-start-time">Heure de début des réservations</Label>
                    <Input
                      id="reservation-start-time"
                      type="time"
                      {...form.register('reservationStartTime')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation-end-time">Heure de fin des réservations</Label>
                    <Input
                      id="reservation-end-time"
                      type="time"
                      {...form.register('reservationEndTime')}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-day">Jour de maintenance hebdomadaire</Label>
                    <Select
                      onValueChange={(value) => form.setValue('maintenanceDay', value)}
                      defaultValue={form.getValues('maintenanceDay')}
                    >
                      <SelectTrigger id="maintenance-day">
                        <SelectValue placeholder="Sélectionnez le jour" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-duration">Durée de la maintenance (en heures)</Label>
                    <Input
                      id="maintenance-duration"
                      type="number"
                      {...form.register('maintenanceDuration', { valueAsNumber: true })}
                      min="1"
                      max="24"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="aircraft">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des avions</CardTitle>
                  <CardDescription>Configurez les types d'avions et les tarifs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <Label>Types d'avions et tarifs horaires</Label>
                    {(form.watch('aircraftTypes') || []).map((aircraft, index) => (
                      <div key={aircraft.type} className="flex items-center space-x-4">
                        <Checkbox
                          id={`aircraft-${aircraft.type}`}
                          checked={aircraft.isAvailable}
                          onCheckedChange={(checked) => {
                            const updatedAircraftTypes = form.getValues('aircraftTypes').map((aircraft, idx) => 
                              idx === index ? { ...aircraft, isAvailable: !!checked } : aircraft
                            );
                            form.setValue('aircraftTypes', updatedAircraftTypes);
                          }}
                        />
                        <Label
                          htmlFor={`aircraft-${aircraft.type}`}
                          className={`flex-grow ${aircraft.isAvailable ? '' : 'text-gray-400'}`}
                        >
                          {aircraft.type}
                        </Label>
                        <Input
                          type="number"
                          {...form.register(`aircraftTypes.${index}.hourlyRate`, { valueAsNumber: true })}
                          className={`w-24 ${aircraft.isAvailable ? '' : 'bg-gray-100 text-gray-400'}`}
                          placeholder="Tarif/h"
                          disabled={!aircraft.isAvailable}
                        />
                        <span className={aircraft.isAvailable ? '' : 'text-gray-400'}>€/h</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="fuel-management">Gestion du carburant</Label>
                    <RadioGroup
                      onValueChange={(value) => form.setValue('fuelManagement', value as 'self-service' | 'staff-only' | 'external')}
                      defaultValue={form.getValues('fuelManagement')}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-service" id="fuel-self-service" />
                        <Label htmlFor="fuel-self-service">Libre-service</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="staff-only" id="fuel-staff-only" />
                        <Label htmlFor="fuel-staff-only">Personnel uniquement</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="external" id="fuel-external" />
                        <Label htmlFor="fuel-external">Fournisseur externe</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des membres</CardTitle>
                  <CardDescription>Configurez les paramètres liés aux membres de l'aéroclub.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Licences de pilote acceptées</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {['PPL', 'LAPL', 'CPL', 'ATPL'].map((license) => (
                        <div key={license} className="flex items-center space-x-2">
                        <Controller
                          name="pilotLicenses"
                          control={form.control}
                          render={({ field }) => (
                            <Checkbox
                              id={`license-${license}`}
                              value={license}
                              checked={field.value?.includes(license) || false}
                              onCheckedChange={(checked) => {
                                const updatedLicenses = checked
                                  ? [...(field.value || []), license]
                                  : (field.value || []).filter((item) => item !== license);
                                field.onChange(updatedLicenses);
                              }}
                            />
                          )}
                        />
                          <Label htmlFor={`license-${license}`}>{license}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="membership-fee">Cotisation annuelle (€)</Label>
                    <Input
                      id="membership-fee"
                      type="number"
                      {...form.register('membershipFee', { valueAsNumber: true })}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow-guest-pilots"
                      {...form.register('allowGuestPilots')}
                    />
                    <Label htmlFor="allow-guest-pilots">Autoriser les pilotes invités</Label>
                  </div>
                  {form.watch('allowGuestPilots') && (
                    <div className="space-y-2">
                      <Label htmlFor="guest-pilot-fee">Frais pour pilotes invités (€)</Label>
                      <Input
                        id="guest-pilot-fee"
                        type="number"
                        {...form.register('guestPilotFee', { valueAsNumber: true })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="club-rules">Règlement intérieur</Label>
                    <Textarea
                      id="club-rules"
                      {...form.register('clubRules')}
                      placeholder="Entrez le règlement intérieur de l'aéroclub..."
                      className="h-32"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="taxonomy">
              <TaxonomyManager />
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Réinitialiser
            </Button>
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous sûr de vouloir enregistrer ces modifications ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action mettra à jour les paramètres de l'aéroclub. Assurez-vous que toutes les informations sont correctes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => form.handleSubmit(onSubmit)()}>Confirmer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
