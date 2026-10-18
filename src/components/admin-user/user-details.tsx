"use client"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { SidePanel } from "@/components/layout/SidePanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BadgeCheck, CheckCircle2, FileText, MoreHorizontal, Pencil, Plane, RefreshCw, Shield, Trash2, Wallet } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/layout/EmptyState"
import { PaginationControls } from "@/components/admin-user/pagination-controls"
import { AdjustBalancePanel } from "@/components/admin-user/adjust-balance-panel"
import { formatDate, formatDateTime, formatFlightDuration, formatMoney, formatTime } from "@/lib/format"
import type { License, UserDetails } from "@/interfaces/user"
import { getBackendBaseUrl } from "@/lib/runtime-config"
import { roleLabel } from "@/lib/settings"
import { licenseStatus } from "@/components/profile/license-status"

interface UserDetailsProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** Null while the member is being loaded. */
  userDetails: UserDetails | null
  itemsPerPage?: number
  onEdit?: (userId: string) => void
  onAddLicense?: (userId: string) => void
  /** The account was credited or debited by hand: reload the member. Enables the action. */
  onBalanceAdjusted?: (userId: string) => void
  /** Correct, renew or delete one of the member's licences. Enables the actions. */
  onLicenseAction?: (action: "edit" | "renew" | "delete", license: License, userId: string) => void
  /** Validate a licence the member entered (pending). Enables the action. */
  onValidateLicense?: (license: License, userId: string) => void
  /** The licence being validated, to show its button busy. */
  validatingLicenseId?: string | null
  /** The tab shown first ("licenses" when opened to validate a licence). */
  initialTab?: "personal-info" | "reservations" | "licenses"
}

const Fact = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <div className={className ? `min-w-0 ${className}` : "min-w-0"}>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 break-words text-sm font-medium">{children}</dd>
  </div>
)

const isPending = (license: License) => (license.status ?? "").toLowerCase() === "pending"

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
  onBalanceAdjusted,
  onLicenseAction,
  onValidateLicense,
  validatingLicenseId = null,
  initialTab = "personal-info",
}: UserDetailsProps) {
  const { t } = useTranslation("administration")
  const [reservationPage, setReservationPage] = useState(1)
  const [licensePage, setLicensePage] = useState(1)
  const [isBalancePanelOpen, setIsBalancePanelOpen] = useState(false)

  // Another member: back to the first pages.
  const memberId = userDetails?.id
  useEffect(() => {
    setReservationPage(1)
    setLicensePage(1)
  }, [memberId])

  if (!isOpen) return null

  const reservations = userDetails?.reservations ?? []
  // Licences waiting for a validation first, so that they are not missed.
  const licenses = [...(userDetails?.licenses ?? [])].sort((a, b) => Number(isPending(b)) - Number(isPending(a)))
  const pendingCount = licenses.filter(isPending).length

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
            <Badge variant="outline">{roleLabel(userDetails.role?.role_name) ?? t("users.noRole")}</Badge>
          </span>
        ) : (
          t("users.details.title")
        )
      }
      description={userDetails ? userDetails.email : t("users.details.description")}
      footer={
        userDetails && (onEdit || onAddLicense) ? (
          <>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:actions.close")}
            </Button>
            {onAddLicense && (
              <Button type="button" variant="outline" onClick={() => onAddLicense(userDetails.id)}>
                <BadgeCheck className="h-4 w-4" />
                {t("users.licence.add")}
              </Button>
            )}
            {onEdit && (
              <Button type="button" onClick={() => onEdit(userDetails.id)}>
                <Pencil className="h-4 w-4" />
                {t("common:actions.edit")}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {userDetails ? (
        <Tabs key={`${userDetails.id}-${initialTab}`} defaultValue={initialTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal-info">{t("users.details.tabs.info")}</TabsTrigger>
            <TabsTrigger value="reservations">
              {t("users.details.tabs.bookings", { total: reservations.length })}
            </TabsTrigger>
            <TabsTrigger value="licenses">
              {t("users.details.tabs.licences", { total: licenses.length })}
              {pendingCount > 0 && <span className="sr-only">{t("users.licence.pendingCount", { count: pendingCount })}</span>}
              {pendingCount > 0 && <span className="ml-1.5 h-2 w-2 rounded-full bg-warning" aria-hidden="true" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal-info" className="space-y-6 pt-4">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("users.details.contact")}</h3>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact label={t("common:labels.email")}>
                  <a href={`mailto:${userDetails.email}`} className="hover:underline">
                    {userDetails.email}
                  </a>
                </Fact>
                <Fact label={t("common:labels.phone")}>
                  {userDetails.phone_number ? (
                    <a href={`tel:${userDetails.phone_number}`} className="hover:underline">
                      {userDetails.phone_number}
                    </a>
                  ) : (
                    "—"
                  )}
                </Fact>
                <Fact label={t("users.details.postalAddress")}>
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
                <Fact label={t("users.fields.dateOfBirth")}>{formatDate(userDetails.date_of_birth)}</Fact>
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t("users.details.activity")}</h3>
              <dl className="grid grid-cols-2 gap-4">
                <Fact label={t("users.details.flightHours")}>
                  <span className="tabular-nums">{formatFlightDuration(userDetails.total_flight_hours ?? 0)}</span>
                </Fact>
                <Fact label={t("users.details.accountBalance")}>
                  <span className="tabular-nums">{formatMoney(userDetails.user_account_balance ?? 0)}</span>
                </Fact>
                <Fact label={t("users.details.lastSignIn")} className="col-span-2">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="tabular-nums">
                      {userDetails.lastSignInAt
                        ? formatDateTime(userDetails.lastSignInAt)
                        : t("users.details.neverSignedIn")}
                    </span>
                    <Link
                      href={`/administration/logins?member=${encodeURIComponent(userDetails.id)}`}
                      className="text-sm font-normal text-primary underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {t("users.details.signInHistory")}
                    </Link>
                  </span>
                </Fact>
              </dl>
              {onBalanceAdjusted && (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsBalancePanelOpen(true)}>
                    <Wallet className="h-4 w-4" />
                    {t("users.balance.action")}
                  </Button>
                  <AdjustBalancePanel
                    open={isBalancePanelOpen}
                    onOpenChange={setIsBalancePanelOpen}
                    member={userDetails}
                    onAdjusted={() => onBalanceAdjusted(userDetails.id)}
                  />
                </>
              )}
            </section>
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4 pt-4">
            {reservations.length > 0 ? (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("users.details.slot")}</TableHead>
                        <TableHead>{t("common:labels.aircraft")}</TableHead>
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
                  itemLabel={t("users.pagination.bookings", { count: reservations.length })}
                />
              </>
            ) : (
              <EmptyState
                icon={Plane}
                title={t("users.details.noBookings.title")}
                description={t("users.details.noBookings.description")}
              />
            )}
          </TabsContent>

          <TabsContent value="licenses" className="space-y-4 pt-4">
            {onValidateLicense &&
              licenses.filter(isPending).map((license) => (
                <div
                  key={`pending-${license.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {t("users.licence.pendingTitle", { type: license.license_type, number: license.license_number || "—" })}
                    </p>
                    <p className="text-muted-foreground">{t("users.licence.pendingHint")}</p>
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0 self-start sm:self-auto"
                    onClick={() => onValidateLicense(license, userDetails.id)}
                    disabled={validatingLicenseId === String(license.id)}
                    aria-label={t("users.licence.validateLabel", { type: license.license_type })}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    {t("users.licence.validate")}
                  </Button>
                </div>
              ))}
            {licenses.length > 0 ? (
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("users.details.licence")}</TableHead>
                        <TableHead>{t("users.details.authority")}</TableHead>
                        <TableHead>{t("users.details.issued")}</TableHead>
                        <TableHead>{t("users.details.expiry")}</TableHead>
                        <TableHead>{t("common:labels.status")}</TableHead>
                        <TableHead>{t("users.licence.documents")}</TableHead>
                        {onLicenseAction && (
                          <TableHead>
                            <span className="sr-only">{t("common:labels.actions")}</span>
                          </TableHead>
                        )}
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
                            <Badge variant={licenseStatus(license).variant} className="whitespace-nowrap">
                              {licenseStatus(license).label}
                            </Badge>
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
                                    {t("users.details.document", { number: index + 1 })}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          {onLicenseAction && (
                            <TableCell className="text-right">
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={t("users.licence.actions", { type: license.license_type })}
                                    title={t("users.licence.actions", { type: license.license_type })}
                                  >
                                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {onValidateLicense && isPending(license) && (
                                    <DropdownMenuItem onSelect={() => onValidateLicense(license, userDetails.id)}>
                                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                                      {t("users.licence.validate")}
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onSelect={() => onLicenseAction("edit", license, userDetails.id)}>
                                    <Pencil className="h-4 w-4" aria-hidden="true" />
                                    {t("users.licence.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => onLicenseAction("renew", license, userDetails.id)}>
                                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                                    {t("users.licence.renew")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => onLicenseAction("delete", license, userDetails.id)}
                                  >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    {t("users.licence.delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
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
                  itemLabel={t("users.pagination.licences", { count: licenses.length })}
                />
              </>
            ) : (
              <EmptyState
                icon={Shield}
                title={t("users.details.noLicences")}
                action={
                  onAddLicense && (
                    <Button variant="outline" onClick={() => onAddLicense(userDetails.id)}>
                      <BadgeCheck className="h-4 w-4" />
                      {t("users.licence.add")}
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
