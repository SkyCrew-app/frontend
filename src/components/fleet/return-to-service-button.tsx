"use client"

import { useState } from "react"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Loader2, Wrench } from "lucide-react"
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
import { useToast } from "@/components/hooks/use-toast"
import { GET_AIRCRAFTS, SET_AIRCRAFT_AVAILABILITY } from "@/graphql/planes"
import { apiRefusal } from "@/lib/api-refusal"

interface ReturnToServiceButtonProps {
  aircraft: { id: number | string; registration_number: string }
  className?: string
}

/**
 * Puts a grounded aircraft back in service (an incident or a non-conforming
 * audit grounds it), after a confirmation. For administrators and technicians:
 * the screen shows it only to them.
 */
export function ReturnToServiceButton({ aircraft, className }: ReturnToServiceButtonProps) {
  const { t } = useTranslation("fleet")
  const { toast } = useToast()
  const [confirming, setConfirming] = useState(false)
  const [setAvailability, { loading }] = useMutation(SET_AIRCRAFT_AVAILABILITY)
  const registration = aircraft.registration_number

  const returnToService = async () => {
    try {
      await setAvailability({
        variables: { aircraftId: Number(aircraft.id), availability_status: "AVAILABLE" },
        refetchQueries: [{ query: GET_AIRCRAFTS }],
        awaitRefetchQueries: true,
      })
      toast({
        title: t("incidents.toast.returned.title"),
        description: t("incidents.toast.returned.description", { registration }),
      })
      setConfirming(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("incidents.toast.returnFailed.title"),
        description: apiRefusal(error, t("incidents.toast.returnFailed.description")),
      })
    }
  }

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setConfirming(true)}>
        <Wrench className="h-4 w-4" aria-hidden="true" />
        {t("incidents.returnToService")}
      </Button>
      <AlertDialog open={confirming} onOpenChange={(open) => !open && !loading && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("incidents.confirmReturn.title", { registration })}</AlertDialogTitle>
            <AlertDialogDescription>{t("incidents.confirmReturn.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              // Stays open until the change is saved.
              onClick={(event) => {
                event.preventDefault()
                void returnToService()
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("incidents.returnToService")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
