"use client"

import { useMutation, useQuery } from "@apollo/client"
import { useState, useEffect } from "react"
import { format, eachHourOfInterval, isBefore, isAfter } from "date-fns"
import { fr } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/hooks/use-toast"
import {
  CREATE_RESERVATION,
  DELETE_RESERVATION,
  GET_FILTERED_RESERVATIONS,
  UPDATE_RESERVATION,
} from "@/graphql/reservation"
import { GET_AIRCRAFTS } from "@/graphql/planes"
import { type Reservation, ReservationStatus } from "@/interfaces/reservation"
import { GET_SETTINGS } from "@/graphql/settings"
import { useCurrentUser, useUserData } from "@/components/hooks/userHooks"
import { ReservationHeader } from "@/components/reservation/reservation-header"
import { ReservationCell } from "@/components/reservation/reservation-cell"
import { FreeCell } from "@/components/reservation/free-cell"
import { ReservationForm } from "@/components/reservation/reservation-form"
import { ReservationDetail } from "@/components/reservation/reservation-detail"
import { MobileReservationView } from "@/components/reservation/mobile-reservation-view"
import { MobileReservationForm } from "@/components/reservation/mobile-reservation-form"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useTranslations } from "next-intl"

interface Aircraft {
  id: number
  registration_number: string
}

export default function ReservationCalendar() {
  const t = useTranslations("reservation")
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ start: string | null; end: string | null }>({
    start: null,
    end: null,
  })
  const [selectedAircraft, setSelectedAircraft] = useState<number | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredTime, setHoveredTime] = useState<string | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false)
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [flightCategory, setFlightCategory] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editPurpose, setEditPurpose] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editFlightCategory, setEditFlightCategory] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [disabledDays, setDisabledDays] = useState<string[]>([])
  const [hours, setHours] = useState<Date[]>([])
  const userEmail = useCurrentUser()
  const userData = useUserData(userEmail)
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()

  const formattedDate = format(currentDate, "yyyy-MM-dd")
  const nextDate = format(new Date(currentDate.getTime() + 86400000), "yyyy-MM-dd")

  const isMobile = useMediaQuery("(max-width: 768px)")

  const [createReservation] = useMutation(CREATE_RESERVATION)
  const [updateReservation] = useMutation(UPDATE_RESERVATION)
  const [deleteReservation] = useMutation(DELETE_RESERVATION)

  const { data: settingsData, loading: loadingSettings } = useQuery(GET_SETTINGS, {
    fetchPolicy: "network-only",
  })

  useEffect(() => {
    if (userData) {
      setUserId(userData.id)
    }
  }, [userData])

  const { data: aircraftData, loading: loadingAircrafts } = useQuery(GET_AIRCRAFTS)

  const {
    data: reservationData,
    loading: loadingReservations,
    error: errorReservations,
    refetch: refetchReservations,
  } = useQuery(GET_FILTERED_RESERVATIONS, {
    variables: { startDate: formattedDate, endDate: nextDate },
  })

  useEffect(() => {
    if (settingsData?.getAllAdministrations?.length > 0) {
      const { closureDays, reservationStartTime, reservationEndTime } = settingsData.getAllAdministrations[0]

      const newHours = eachHourOfInterval({
        start: new Date(`${formattedDate}T${reservationStartTime}`),
        end: new Date(`${formattedDate}T${reservationEndTime}`),
      })

      setHours(newHours)
      setDisabledDays(closureDays)
    }
  }, [settingsData, formattedDate])

  const normalizeDayName = (day: string) =>
    day
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()

  const isDayClosed = () => {
    const dayName = normalizeDayName(format(currentDate, "EEEE", { locale: fr }))
    const normalizedDisabledDays = disabledDays.map(normalizeDayName)
    return normalizedDisabledDays.includes(dayName)
  }

  const handleMouseDown = (aircraftId: number, time: string) => {
    setSelectedTimeRange({ start: time, end: null })
    setSelectedAircraft(aircraftId)
    setIsDragging(true)
  }

  const handleMouseEnter = (hour: Date) => {
    if (isDragging) {
      const timeString = format(hour, "HH:mm")
      setHoveredTime(timeString)
      setSelectedTimeRange((prev) => ({ ...prev, end: timeString }))
    }
  }

  const handleMouseUp = () => {
    if (selectedTimeRange.start && selectedTimeRange.end && selectedAircraft) {
      const start = selectedTimeRange.start
      const end = selectedTimeRange.end

      if (start > end) {
        setSelectedTimeRange({ start: end, end: start })
      }

      setIsCreateDialogOpen(true)
    }
    setIsDragging(false)
  }

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsReservationDialogOpen(true)
  }

  const handleUpdate = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setEditPurpose(reservation.purpose || "")
    setEditNotes(reservation.notes || "")
    setEditFlightCategory(reservation.flight_category || "")
    setIsReservationDialogOpen(false)
    setIsEditDialogOpen(true)
  }

  const handleCreateReservation = async () => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('userNotFound'),
      })
      return
    }

    setIsCreating(true)
    try {
      const startTime = new Date(`${formattedDate}T${selectedTimeRange.start}`)
      const endTime = new Date(`${formattedDate}T${selectedTimeRange.end}`)
      const estimatedFlightHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

      await createReservation({
        variables: {
          input: {
            aircraft_id: selectedAircraft,
            start_time: startTime,
            end_time: endTime,
            purpose,
            user_id: userId,
            estimated_flight_hours: estimatedFlightHours,
            status: ReservationStatus.PENDING,
            notes,
            flight_category: flightCategory,
          },
        },
        refetchQueries: [
          { query: GET_FILTERED_RESERVATIONS, variables: { startDate: formattedDate, endDate: nextDate } },
        ],
      })

      toast({
        title: t('reservationCreated'),
        description: t('reservationSuccess'),
      })

      setPurpose("")
      setNotes("")
      setFlightCategory("")
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error("Erreur Apollo Client:", error)
      toast({
        variant: "destructive",
        title: t('errorCreatingReservation'),
        description: (error as any).message || t('unknownError'),
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateMobileReservation = async (aircraftId: number, startTime: Date, endTime: Date) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('userNotFound'),
      })
      return
    }

    setIsCreating(true)
    try {
      const estimatedFlightHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

      await createReservation({
        variables: {
          input: {
            aircraft_id: aircraftId,
            start_time: startTime,
            end_time: endTime,
            purpose,
            user_id: userId,
            estimated_flight_hours: estimatedFlightHours,
            status: ReservationStatus.PENDING,
            notes,
            flight_category: flightCategory,
          },
        },
        refetchQueries: [
          { query: GET_FILTERED_RESERVATIONS, variables: { startDate: formattedDate, endDate: nextDate } },
        ],
      })

      toast({
        title: t('reservationCreated'),
        description: t('reservationSuccess'),
      })

      setPurpose("")
      setNotes("")
      setFlightCategory("")
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error("Erreur Apollo Client:", error)
      toast({
        variant: "destructive",
        title: t('errorCreatingReservation'),
        description: (error as any).message || t('unknownError'),
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateReservation = async () => {
    if (selectedReservation) {
      try {
        await updateReservation({
          variables: {
            input: {
              id: selectedReservation.id,
              purpose: editPurpose || selectedReservation.purpose,
              notes: editNotes || selectedReservation.notes,
              flight_category: editFlightCategory || selectedReservation.flight_category,
            },
          },
          refetchQueries: [
            { query: GET_FILTERED_RESERVATIONS, variables: { startDate: formattedDate, endDate: nextDate } },
          ],
        })

        setIsEditDialogOpen(false)
        toast({
          title: t('reservationUpdated'),
          description: t('reservationUpdateSuccess', { aircraft: selectedReservation.aircraft.registration_number }),
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('errorUpdatingReservation'),
          description: t('errorUpdatingReservationUnknown'),
        })
      }
    }
  }

  const handleDeleteReservation = async () => {
    if (selectedReservation) {
      try {
        await deleteReservation({
          variables: {
            id: selectedReservation.id,
          },
          refetchQueries: [
            { query: GET_FILTERED_RESERVATIONS, variables: { startDate: formattedDate, endDate: nextDate } },
          ],
        })

        setIsReservationDialogOpen(false)
        toast({
          title: t('reservationDeleted'),
          description: t('reservationDeleteSuccess', { aircraft: selectedReservation.aircraft.registration_number }),
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('errorDeletingReservation'),
          description: t('errorDeletingReservationUnknown'),
        })
      }
    }
  }

  const renderCalendarGrid = () => {
    if (!aircraftData || !reservationData || !hours.length) return null

    return aircraftData.getAircrafts.map((aircraft: Aircraft) => {
      let skipHours = 0

      return (
        <TableRow key={aircraft.id}>
          <TableCell className="font-medium whitespace-nowrap sticky left-0 bg-background z-10 border-r">
            {aircraft.registration_number}
          </TableCell>

          {hours.map((hour, index) => {
            if (skipHours > 0) {
              skipHours--
              return null
            }

            const timeString = format(hour, "HH:mm")

            if (
              settingsData?.getAllAdministrations?.length > 0 &&
              (isBefore(
                hour,
                new Date(`${formattedDate}T${settingsData.getAllAdministrations[0].reservationStartTime}`),
              ) ||
                isAfter(hour, new Date(`${formattedDate}T${settingsData.getAllAdministrations[0].reservationEndTime}`)))
            ) {
              return <TableCell key={index} className="bg-gray-200 dark:bg-gray-800 cursor-not-allowed p-0 h-12" />
            }

            const reservationForAircraft = reservationData.filteredReservations.find(
              (reservation: Reservation) =>
                reservation.aircraft.id === aircraft.id &&
                new Date(reservation.start_time) <= hour &&
                new Date(reservation.end_time) > hour,
            )

            if (reservationForAircraft) {
              const durationHours =
                (new Date(reservationForAircraft.end_time).getTime() -
                  new Date(reservationForAircraft.start_time).getTime()) /
                3600000
              const colSpan = Math.floor(durationHours)
              skipHours = colSpan - 1

              return (
                <ReservationCell
                  key={index}
                  reservation={reservationForAircraft}
                  colSpan={colSpan}
                  onClick={() => handleReservationClick(reservationForAircraft)}
                />
              )
            } else {
              const isSelectedRange =
                selectedTimeRange.start &&
                selectedTimeRange.end &&
                selectedAircraft === aircraft.id &&
                timeString >= selectedTimeRange.start &&
                timeString <= selectedTimeRange.end

              return (
                <FreeCell
                  key={index}
                  isSelected={!!isSelectedRange}
                  onMouseDown={() => handleMouseDown(aircraft.id, timeString)}
                  onMouseEnter={() => handleMouseEnter(hour)}
                  onMouseUp={handleMouseUp}
                />
              )
            }
          })}
        </TableRow>
      )
    })
  }

  const canEditReservation = (reservation: Reservation) => {
    return userId === reservation.user?.id
  }

  if (loadingReservations || loadingAircrafts || loadingSettings) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (errorReservations) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardContent className="p-6 text-red-800 dark:text-red-300 flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold">{t('errorFetching')}</h3>
            <p>{t('tryAgain')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <ReservationHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        disabledDays={disabledDays}
        isDayClosed={isDayClosed()}
      />

      {!isDayClosed() && (
        <>
          {/* Vue mobile */}
          {isMobile ? (
            <MobileReservationView
              currentDate={currentDate}
              aircrafts={aircraftData.getAircrafts}
              reservations={reservationData.filteredReservations}
              selectedAircraft={selectedAircraft}
              setSelectedAircraft={setSelectedAircraft}
              onCreateReservation={() => setIsCreateDialogOpen(true)}
              onViewReservation={handleReservationClick}
            />
          ) : (
            /* Vue desktop */
            <div className="overflow-x-auto rounded-lg border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-muted">{t('aircraft')}</TableHead>
                    {hours.map((hour, index) => (
                      <TableHead key={index} className="text-center min-w-[80px] p-2">
                        {format(hour, "HH:mm")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>{renderCalendarGrid()}</TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Dialogue de création de réservation */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{t('createReservation')}</DialogTitle>
          {isMobile ? (
            <MobileReservationForm
              aircrafts={aircraftData.getAircrafts}
              currentDate={currentDate}
              purpose={purpose}
              setPurpose={setPurpose}
              notes={notes}
              setNotes={setNotes}
              flightCategory={flightCategory}
              setFlightCategory={setFlightCategory}
              onSubmit={handleCreateMobileReservation}
              isSubmitting={isCreating}
              disabledDays={disabledDays}
            />
          ) : (
            <ReservationForm
              selectedAircraft={selectedAircraft}
              aircraftData={aircraftData}
              selectedTimeRange={selectedTimeRange}
              currentDate={currentDate}
              purpose={purpose}
              setPurpose={setPurpose}
              notes={notes}
              setNotes={setNotes}
              flightCategory={flightCategory}
              setFlightCategory={setFlightCategory}
              onSubmit={handleCreateReservation}
              isSubmitting={isCreating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de détails de réservation */}
      {selectedReservation && (
        <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>{t('describeReservation')}</DialogTitle>
            <ReservationDetail
              reservation={selectedReservation}
              onEdit={() => handleUpdate(selectedReservation)}
              onDelete={handleDeleteReservation}
              canEdit={canEditReservation(selectedReservation)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Dialogue de modification de réservation */}
      {selectedReservation && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>{t('updateReservation')}</DialogTitle>
            <ReservationForm
              isEdit={true}
              purpose={editPurpose}
              setPurpose={setEditPurpose}
              notes={editNotes}
              setNotes={setEditNotes}
              flightCategory={editFlightCategory}
              setFlightCategory={setEditFlightCategory}
              onSubmit={handleUpdateReservation}
              isSubmitting={false}
              startTime={format(new Date(selectedReservation.start_time), "HH:mm")}
              endTime={format(new Date(selectedReservation.end_time), "HH:mm")}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
