"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Mail,
  Phone,
  MapPin,
  CalendarPlus2Icon as CalendarIcon2,
  Clock,
  CreditCard,
  Plane,
  FileText,
  Shield,
  User,
} from "lucide-react"
import type { UserDetails } from "@/interfaces/user"

interface UserDetailsProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userDetails: UserDetails | null
  currentReservationPage: number
  setCurrentReservationPage: (page: number) => void
  currentLicensePage: number
  setCurrentLicensePage: (page: number) => void
  itemsPerPage: number
}

export function UserDetailsDialog({
  isOpen,
  onOpenChange,
  userDetails,
  currentReservationPage,
  setCurrentReservationPage,
  currentLicensePage,
  setCurrentLicensePage,
  itemsPerPage,
}: UserDetailsProps) {
  if (!isOpen) return null

  const paginatedReservations = userDetails?.reservations.slice(
    (currentReservationPage - 1) * itemsPerPage,
    currentReservationPage * itemsPerPage,
  )

  const paginatedLicenses = userDetails?.licenses.slice(
    (currentLicensePage - 1) * itemsPerPage,
    currentLicensePage * itemsPerPage,
  )

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Détails de l'utilisateur</DialogTitle>
        </DialogHeader>

        {userDetails ? (
          <Tabs defaultValue="personal-info" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal-info" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Informations personnelles</span>
                <span className="sm:hidden">Infos</span>
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                <span className="hidden sm:inline">Réservations</span>
                <span className="sm:hidden">Résa.</span>
              </TabsTrigger>
              <TabsTrigger value="licenses" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Licences</span>
                <span className="sm:hidden">Lic.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal-info" className="space-y-4 min-h-[250px] pt-4">
              <div className="flex flex-col md:flex-row gap-6">
                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Informations de contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">
                          <a href={`mailto:${userDetails.email}`} className="hover:underline">
                            {userDetails.email}
                          </a>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{userDetails.phone_number || "Non renseigné"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Adresse</p>
                        <p className="font-medium">
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
                            "Non renseignée"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarIcon2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date de naissance</p>
                        <p className="font-medium">{new Date(userDetails.date_of_birth).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="flex-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Statistiques</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Heures de vol totales</p>
                        <p className="font-medium">{userDetails.total_flight_hours || 0} heures</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Solde du compte</p>
                        <p className="font-medium">{userDetails.user_account_balance || 0} €</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Réservations</p>
                        <p className="font-medium">{userDetails.reservations?.length || 0} réservation(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Licences</p>
                        <p className="font-medium">{userDetails.licenses?.length || 0} licence(s)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reservations" className="space-y-4 min-h-[250px] pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Réservations</CardTitle>
                  <CardDescription>Historique des réservations d'avions</CardDescription>
                </CardHeader>
                <CardContent>
                  {userDetails.reservations && userDetails.reservations.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date de début</TableHead>
                          <TableHead>Date de fin</TableHead>
                          <TableHead>Avion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReservations?.map((reservation) => (
                          <TableRow key={reservation.id}>
                            <TableCell>{new Date(reservation.start_time).toLocaleString()}</TableCell>
                            <TableCell>{new Date(reservation.end_time).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {reservation.aircraft.registration_number}
                              </Badge>
                              <span className="ml-2">{reservation.aircraft.model}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Plane className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Aucune réservation trouvée</p>
                    </div>
                  )}
                </CardContent>
                {userDetails.reservations && userDetails.reservations.length > itemsPerPage && (
                  <CardFooter>
                    <Pagination className="mx-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentReservationPage(Math.max(1, currentReservationPage - 1))}
                            className={currentReservationPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from(
                          { length: Math.ceil((userDetails.reservations.length || 0) / itemsPerPage) },
                          (_, index) => (
                            <PaginationItem key={index}>
                              <PaginationLink
                                onClick={() => setCurrentReservationPage(index + 1)}
                                isActive={currentReservationPage === index + 1}
                              >
                                {index + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ),
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentReservationPage(
                                Math.min(
                                  currentReservationPage + 1,
                                  Math.ceil((userDetails.reservations.length || 0) / itemsPerPage),
                                ),
                              )
                            }
                            className={
                              currentReservationPage ===
                              Math.ceil((userDetails.reservations.length || 0) / itemsPerPage)
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="licenses" className="space-y-4 min-h-[250px] pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Licences</CardTitle>
                  <CardDescription>Licences et certifications de l'utilisateur</CardDescription>
                </CardHeader>
                <CardContent>
                  {userDetails.licenses && userDetails.licenses.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Numéro</TableHead>
                          <TableHead>Autorité</TableHead>
                          <TableHead>Émission</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Documents</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedLicenses?.map((license) => (
                          <TableRow key={license.id}>
                            <TableCell>
                              <Badge className="bg-primary/10 text-primary border-primary/20">
                                {license.license_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono">{license.license_number || "N/A"}</TableCell>
                            <TableCell>{license.certification_authority || "N/A"}</TableCell>
                            <TableCell>{new Date(license.issue_date).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(license.expiration_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {license.expiration_date && new Date(license.expiration_date) < new Date() ? (
                                <Badge
                                  variant="outline"
                                  className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/30"
                                >
                                  Expirée
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/30"
                                >
                                  Valide
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {license.documents_url && license.documents_url.length > 0 ? (
                                <div className="flex flex-col space-y-1">
                                  {license.documents_url.map((doc, index) => (
                                    <a
                                      key={index}
                                      href={doc.startsWith("http") ? doc : `http://localhost:3000${doc}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline flex items-center"
                                    >
                                      <FileText className="h-3 w-3 mr-1" />
                                      Document {index + 1}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Aucun document</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>Aucune licence trouvée</p>
                    </div>
                  )}
                </CardContent>
                {userDetails.licenses && userDetails.licenses.length > itemsPerPage && (
                  <CardFooter>
                    <Pagination className="mx-auto">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentLicensePage(Math.max(1, currentLicensePage - 1))}
                            className={currentLicensePage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {Array.from(
                          { length: Math.ceil((userDetails.licenses.length || 0) / itemsPerPage) },
                          (_, index) => (
                            <PaginationItem key={index}>
                              <PaginationLink
                                onClick={() => setCurrentLicensePage(index + 1)}
                                isActive={currentLicensePage === index + 1}
                              >
                                {index + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ),
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentLicensePage(
                                Math.min(
                                  currentLicensePage + 1,
                                  Math.ceil((userDetails.licenses.length || 0) / itemsPerPage),
                                ),
                              )
                            }
                            className={
                              currentLicensePage === Math.ceil((userDetails.licenses.length || 0) / itemsPerPage)
                                ? "pointer-events-none opacity-50"
                                : ""
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3 py-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
