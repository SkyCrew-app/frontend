"use client"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { SidePanel } from "@/components/layout/SidePanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BadgeCheck, FileText, Pencil, Plane, Shield } from "lucide-react"
import { EmptyState } from "@/components/layout/EmptyState"
import { PaginationControls } from "@/components/admin-user/pagination-controls"
import { formatDate, formatDateTime, formatFlightDuration, formatMoney, formatTime } from "@/lib/format"
import type { UserDetails } from "@/interfaces/user"
import { getBackendBaseUrl } from "@/lib/runtime-config"

interface UserDetailsProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Null while the member is being loaded. */
  userDetails: UserDetails | null
  itemsPerPage?: number
  onEdit?: (userId: string) => void
  onAddLicense?: (userId: string) => void
}

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
  </div>
)

const isExpired = (expiration: string | null | undefined) =>
  Boolean(expiration) && new Date(expiration as string) < new Date()

// Same day: "12 oct. 2026, 14:30 – 16:00".
const formatSlot = (start: string, end: string) =>
  new Date(start).toDateString() === new Date(end).toDateString()
    ? `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`
    : `${formatDateTime(start)} – ${formatDateTime(end)}`

export function UserDetailsDialog({
  isOpen,
  onOpenChange,
  userDetails,
  itemsPerPage = 5,
  onEdit,
  onAddLicense,
}: UserDetailsProps) {
  const [reservationPage, setReservationPage] = useState(1)
  const [licensePage, setLicensePage] = useState(1)

  // Another member: back to the first pages.
  const memberId = userDetails?.id
  useEffect(() => {
    setReservationPage(1)
    setLicensePage(1)
  }, [memberId])

  if (!isOpen) return null

  const reservations = userDetails?.reservations ?? []
  const licenses = userDetails?.licenses ?? []

  // Most recent first: the latest bookings are what an administrator looks for.
  const sortedReservations = [...reservations].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  )
  const pagedReservations = sortedReservations.slice((reservationPage - 1) * itemsPerPage, reservationPage * itemsPerPage)
  const pagedLicenses = licenses.slice((licensePage - 1) * itemsPerPage, licensePage * itemsPerPage)

  return (
    <SidePanel
      open={isOpen}
      onOpenChange={onOpenChange}
      size="xl"
      title={
        userDetails ? (
          <span className="flex flex-wrap items-center gap-2">
            {userDetails.first_name} {userDetails.last_name}
            <Badge variant="outline">{userDetails.role?.role_name ?? "Aucun rôle"}</Badge>
          </span>
        ) : (
          "Fiche du membre"
        )
      }
      description={userDetails ? userDetails.email : "Informations, réservations et licences."}
      footer={
        userDetails && (onEdit || onAddLicense) ? (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            {onAddLicense && (
              <Button type="button" variant="outline" onClick={() => onAddLicense(userDetails.id)}>
                <BadgeCheck className="h-4 w-4" />
                Ajouter une licence
              </Button>
            )}
            {onEdit && (
              <Button type="button" onClick={() => onEdit(userDetails.id)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {userDetails ? (
        <Tabs defaultValue="personal-info">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal-info">Informations</TabsTrigger>
            <TabsTrigger value="reservations">Réservations ({reservations.length})</TabsTrigger>
            <TabsTrigger value="licenses">Licences ({licenses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="personal-info" className="space-y-6 pt-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Coordonnées</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact label="Adresse e-mail">
                  <a href={`mailto:${userDetails.email}`} className="hover:underline">
                    {userDetails.email}
                  </a>
                </Fact>
                <Fact label="Téléphone">
                  {userDetails.phone_number ? (
                    <a href={`tel:${userDetails.phone_number}`} className="hover:underline">
                      {userDetails.phone_number}
                    </a>
                  ) : (
                    "—"
                  )}
                </Fact>
                <Fact label="Adresse postale">
                  {userDetails.address ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(userDetails.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {userDetails.address}
                    </a>
                  ) : (
                    "—"
                  )}
                </Fact>
                <Fact label="Date de naissance">{formatDate(userDetails.date_of_birth)}</Fact>
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Activité</h3>
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Heures de vol">
                  <span className="tabular-nums">{formatFlightDuration(userDetails.total_flight_hours ?? 0)}</span>
                </Fact>
                <Fact label="Solde du compte">
                  <span className="tabular-nums">{formatMoney(userDetails.user_account_balance ?? 0)}</span>
                </Fact>
              </dl>
            </section>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4 pt-4">
            {reservations.length > 0 ? (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Créneau</TableHead>
                        <TableHead>Avion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedReservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatSlot(reservation.start_time, reservation.end_time)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className="font-medium">{reservation.aircraft.registration_number}</span>
                            <span className="ml-2 text-muted-foreground">{reservation.aircraft.model}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={reservationPage}
                  totalItems={reservations.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setReservationPage}
                  itemLabel={reservations.length > 1 ? "réservations" : "réservation"}
                />
              </>
            ) : (
              <EmptyState icon={Plane} title="Aucune réservation" description="Ce membre n'a encore réservé aucun avion." />
            )}
          </TabsContent>

          <TabsContent value="licenses" className="space-y-4 pt-4">
            {licenses.length > 0 ? (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Licence</TableHead>
                        <TableHead>Autorité</TableHead>
                        <TableHead>Délivrance</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Justificatifs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedLicenses.map((license) => (
                        <TableRow key={license.id}>
                          <TableCell className="whitespace-nowrap">
                            <span className="font-medium">{license.license_type}</span>
                            <span className="block text-xs text-muted-foreground">
                              {license.license_number || "—"}
                            </span>
                          </TableCell>
                          <TableCell>{license.certification_authority || "—"}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(license.issue_date)}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(license.expiration_date)}</TableCell>
                          <TableCell>
                            {isExpired(license.expiration_date) ? (
                              <Badge variant="danger">Expirée</Badge>
                            ) : (
                              <Badge variant="success">Valide</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {license.documents_url && license.documents_url.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {license.documents_url.map((doc, index) => (
                                  <a
                                    key={index}
                                    href={doc.startsWith("http") ? doc : `${getBackendBaseUrl()}${doc}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 whitespace-nowrap text-primary hover:underline"
                                  >
                                    <FileText className="h-4 w-4" />
                                    Document {index + 1}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <PaginationControls
                  currentPage={licensePage}
                  totalItems={licenses.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setLicensePage}
                  itemLabel={licenses.length > 1 ? "licences" : "licence"}
                />
              </>
            ) : (
              <EmptyState
                icon={Shield}
                title="Aucune licence enregistrée"
                action={
                  onAddLicense && (
                    <Button variant="outline" onClick={() => onAddLicense(userDetails.id)}>
                      <BadgeCheck className="h-4 w-4" />
                      Ajouter une licence
                    </Button>
                  )
                }
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </SidePanel>
  )
}
