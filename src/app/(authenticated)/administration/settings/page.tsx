"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useForm, FormProvider, type FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@apollo/client"
import { Loader2, Settings } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/layout/EmptyState"
import { ErrorState } from "@/components/layout/ErrorState"
import { toast } from "@/components/hooks/use-toast"
import { GET_ADMINISTRATION, UPDATE_ADMINISTRATION } from "@/graphql/settings"
import { GeneralTab } from "@/components/settings/tabs/general-tab"
import { OperationsTab } from "@/components/settings/tabs/operations-tab"
import { AircraftTab } from "@/components/settings/tabs/aircraft-tab"
import { MembersTab } from "@/components/settings/tabs/members-tab"
import { TaxonomyManager } from "@/components/settings/taxonomy/taxonomy-manager"
import { RoleManager } from "@/components/settings/roles/roles-manager"
import { FlightPlanningSettingsForm } from "@/components/settings/flight-planning-settings"
import {
  administrationInputFromValues,
  buildSettingsFormSchema,
  settingsFormValuesFromRecord,
  tabsWithErrors,
  type AdministrationRecord,
  type SettingsFormTab,
  type SettingsFormValues,
} from "@/lib/settings"

const FORM_ID = "settings-form"

// The tabs saved by the "Enregistrer" button; roles are saved on their own.
const FORM_TABS: SettingsFormTab[] = ["general", "reservations", "aircraft", "members", "lists"]

export default function SettingsPage() {
  const { t } = useTranslation("administration")
  const [activeTab, setActiveTab] = useState<string>("general")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormReady, setIsFormReady] = useState(false)
  // Values waiting for the confirmation asked before switching maintenance mode on.
  const [pendingValues, setPendingValues] = useState<SettingsFormValues | null>(null)
  const [updateAdministration] = useMutation(UPDATE_ADMINISTRATION)
  const { data, loading, error, refetch } = useQuery<{ getAllAdministrations: AdministrationRecord[] }>(
    GET_ADMINISTRATION,
  )
  const record = data?.getAllAdministrations?.[0]

  const schema = useMemo(() => buildSettingsFormSchema(), [])
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(schema) })
  const { isDirty, dirtyFields, errors } = form.formState

  // Fill the form once: later cache updates must not overwrite what the user is typing.
  const isLoadedRef = useRef(false)
  useEffect(() => {
    if (!isLoadedRef.current && record) {
      form.reset(settingsFormValuesFromRecord(record))
      isLoadedRef.current = true
      setIsFormReady(true)
    }
  }, [record, form])

  // Warn before the browser leaves the page with unsaved changes.
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  const save = async (values: SettingsFormValues) => {
    const administrationId = record?.id
    if (administrationId === undefined || administrationId === null) {
      toast({
        title: t("settings.toast.saveFailed"),
        description: t("settings.toast.notLoaded"),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await updateAdministration({
        variables: { input: administrationInputFromValues(administrationId, values) },
      })
      // The saved values become the reference for "unsaved changes".
      form.reset(form.getValues())
      toast({ title: t("settings.toast.saved.title"), description: t("settings.toast.saved.description") })
    } catch {
      toast({
        title: t("settings.toast.saveFailed"),
        description: t("settings.toast.notSaved"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onValid = (values: SettingsFormValues) => {
    if (values.isMaintenanceActive && dirtyFields.isMaintenanceActive) {
      setPendingValues(values)
      return
    }
    return save(values)
  }

  const onInvalid = (invalid: FieldErrors<SettingsFormValues>) => {
    const tabs = tabsWithErrors(Object.keys(invalid))
    if (tabs.length > 0 && !tabs.includes(activeTab as SettingsFormTab)) setActiveTab(tabs[0])
    toast({
      title: t("settings.toast.saveFailed"),
      description: t("settings.toast.invalid"),
      variant: "destructive",
    })
  }

  const invalidTabs = tabsWithErrors(Object.keys(errors))

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        className="mb-0"
      />

      {error ? (
        <ErrorState onRetry={() => refetch()} />
      ) : loading || (record && !isFormReady) ? (
        <div className="space-y-6" aria-busy="true">
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !record ? (
        <EmptyState
          icon={Settings}
          title={t("settings.notFound.title")}
          description={t("settings.notFound.description")}
        />
      ) : (
        <FormProvider {...form}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto">
              {FORM_TABS.map((tab) => (
                <TabsTrigger key={tab} value={tab} className="gap-1.5">
                  {t(`settings.tabs.${tab}`)}
                  {invalidTabs.includes(tab) && (
                    <>
                      <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
                      <span className="sr-only">{t("settings.tabs.invalid")}</span>
                    </>
                  )}
                </TabsTrigger>
              ))}
              <TabsTrigger value="roles">{t("settings.tabs.roles")}</TabsTrigger>
              <TabsTrigger value="flightPlanning">{t("navplan:settings.tab")}</TabsTrigger>
            </TabsList>

            {/* Values live in the form state, so they survive a change of tab. */}
            <form id={FORM_ID} onSubmit={form.handleSubmit(onValid, onInvalid)} noValidate>
              <TabsContent value="general">
                <GeneralTab />
              </TabsContent>
              <TabsContent value="reservations">
                <OperationsTab />
              </TabsContent>
              <TabsContent value="aircraft">
                <AircraftTab />
              </TabsContent>
              <TabsContent value="members">
                <MembersTab />
              </TabsContent>
              <TabsContent value="lists">
                <TaxonomyManager />
              </TabsContent>
            </form>

            {/* Outside the form: creating a role must not submit the settings. */}
            <TabsContent value="roles">
              <RoleManager />
            </TabsContent>
            {/* Saved by its own button: it is not part of the club record. */}
            <TabsContent value="flightPlanning">
              <FlightPlanningSettingsForm />
            </TabsContent>
          </Tabs>

          {((activeTab !== "roles" && activeTab !== "flightPlanning") || isDirty) && (
            <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                {isDirty ? (
                  <>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                    <span className="text-foreground">{t("settings.unsaved")}</span>
                  </>
                ) : (
                  t("settings.nothingToSave")
                )}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!isDirty || isSubmitting}
                  onClick={() => form.reset()}
                >
                  {t("settings.discard")}
                </Button>
                <Button type="submit" form={FORM_ID} disabled={!isDirty || isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {t("common:actions.save")}
                </Button>
              </div>
            </div>
          )}

          <AlertDialog open={pendingValues !== null} onOpenChange={(open) => !open && setPendingValues(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.maintenanceConfirm.title")}</AlertDialogTitle>
                <AlertDialogDescription>{t("settings.maintenanceConfirm.description")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (pendingValues) void save(pendingValues)
                  }}
                >
                  {t("settings.maintenanceConfirm.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </FormProvider>
      )}
    </div>
  )
}
