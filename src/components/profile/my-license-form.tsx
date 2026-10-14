"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation } from "@apollo/client"
import { useTranslation } from "react-i18next"
import { Info } from "lucide-react"
import { SidePanel } from "@/components/layout/SidePanel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/hooks/use-toast"
import { ADD_MY_LICENSE, MY_LICENSES, UPDATE_MY_LICENSE } from "@/graphql/licences"
import { calendarDayToISOString } from "@/lib/datetime"
import { apiRefusal } from "@/lib/api-refusal"
import type { License } from "./license-card"

// The types an administrator offers too (administration:users.licence.types).
const LICENSE_TYPES = ["PPL", "CPL", "ATPL", "FI"]

const toDate = (value: License["issue_date"] | null | undefined) => (value ? new Date(value) : undefined)

type Errors = Partial<Record<"type" | "number" | "issueDate" | "expirationDate", string>>

const Required = () => (
  <span className="text-destructive" aria-hidden="true">
    {" *"}
  </span>
)

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-sm text-destructive">{message}</p> : null

interface MyLicenseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The licence changed; absent to add one. */
  license?: License | null
}

/**
 * A member adds one of their licences or corrects it, with its documents. The API keeps it
 * pending until an administrator validates it: the panel says so before it is sent.
 */
export function MyLicenseForm({ open, onOpenChange, license = null }: MyLicenseFormProps) {
  const { t } = useTranslation("profile")
  const { toast } = useToast()
  const editing = license !== null
  const [addLicense, { loading: adding }] = useMutation(ADD_MY_LICENSE, { refetchQueries: [{ query: MY_LICENSES }] })
  const [updateLicense, { loading: updating }] = useMutation(UPDATE_MY_LICENSE, {
    refetchQueries: [{ query: MY_LICENSES }],
  })
  const saving = adding || updating

  const [type, setType] = useState("")
  const [number, setNumber] = useState("")
  const [authority, setAuthority] = useState("")
  const [issueDate, setIssueDate] = useState<Date | undefined>()
  const [expirationDate, setExpirationDate] = useState<Date | undefined>()
  const [errors, setErrors] = useState<Errors>({})
  const documentsRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setType(license?.license_type ?? "")
    setNumber(license?.license_number ?? "")
    setAuthority(license?.certification_authority ?? "")
    setIssueDate(toDate(license?.issue_date))
    setExpirationDate(toDate(license?.expiration_date))
    setErrors({})
  }, [open, license])

  const handleSubmit = async () => {
    const next: Errors = {}
    if (!type) next.type = t("licenses.form.errors.type")
    if (!number.trim()) next.number = t("licenses.form.errors.number")
    if (!issueDate) next.issueDate = t("licenses.form.errors.issueDate")
    if (issueDate && expirationDate && expirationDate < issueDate) {
      next.expirationDate = t("licenses.form.errors.expirationBeforeIssue")
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    const files = Array.from(documentsRef.current?.files ?? []).filter((file) => file.size > 0)
    const fields = {
      license_type: type,
      license_number: number.trim(),
      issue_date: calendarDayToISOString(issueDate),
      expiration_date: calendarDayToISOString(expirationDate) ?? null,
      certification_authority: authority.trim() || null,
    }
    try {
      if (editing) {
        await updateLicense({
          variables: {
            input: { id: Number(license.id), ...fields },
            // Without new files the documents already sent are kept.
            documents: files.length > 0 ? files : null,
          },
        })
      } else {
        await addLicense({ variables: { input: fields, documents: files.length > 0 ? files : null } })
      }
      toast({
        title: t(editing ? "licenses.toast.updated" : "licenses.toast.added"),
        description: t("licenses.toast.pending"),
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("licenses.toast.failed"),
        description: apiRefusal(error, t("licenses.toast.failedDescription")),
      })
    }
  }

  const keptDocuments = license?.documents_url?.length ?? 0

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => (next || !saving) && onOpenChange(next)}
      title={t(editing ? "licenses.form.editTitle" : "licenses.form.addTitle")}
      description={t("licenses.form.description")}
      onSubmit={handleSubmit}
      submitLabel={t(editing ? "licenses.form.submitEdit" : "licenses.form.submitAdd")}
      submitting={saving}
    >
      <div className="space-y-5">
        <Alert>
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{t("licenses.form.validationNotice")}</AlertDescription>
        </Alert>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="my_license_type">
              {t("licenses.form.type")}
              <Required />
            </Label>
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value)
                setErrors((current) => ({ ...current, type: undefined }))
              }}
            >
              <SelectTrigger id="my_license_type" aria-invalid={errors.type ? true : undefined}>
                <SelectValue placeholder={t("licenses.form.typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_TYPES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`administration:users.licence.types.${code}`)}
                  </SelectItem>
                ))}
                {/* A type recorded by the club under another name stays readable. */}
                {type && !LICENSE_TYPES.includes(type) && <SelectItem value={type}>{type}</SelectItem>}
              </SelectContent>
            </Select>
            <FieldError message={errors.type} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="my_license_number">
              {t("licenses.facts.number")}
              <Required />
            </Label>
            <Input
              id="my_license_number"
              value={number}
              onChange={(event) => {
                setNumber(event.target.value)
                setErrors((current) => ({ ...current, number: undefined }))
              }}
              aria-required="true"
              aria-invalid={errors.number ? true : undefined}
              placeholder="FRA.FCL.PA00123456"
            />
            <FieldError message={errors.number} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="my_license_authority">{t("licenses.facts.authority")}</Label>
          <Input
            id="my_license_authority"
            value={authority}
            onChange={(event) => setAuthority(event.target.value)}
            placeholder="DGAC"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {t("licenses.facts.issuedOn")}
              <Required />
            </Label>
            <DatePicker
              date={issueDate}
              onSelect={(date) => {
                setIssueDate(date)
                setErrors((current) => ({ ...current, issueDate: undefined }))
              }}
              placeholder={t("licenses.form.chooseDate")}
              toDate={new Date()}
            />
            <FieldError message={errors.issueDate} />
          </div>
          <div className="space-y-2">
            <Label>{t("licenses.facts.expiresOn")}</Label>
            <DatePicker
              date={expirationDate}
              onSelect={(date) => {
                setExpirationDate(date)
                setErrors((current) => ({ ...current, expirationDate: undefined }))
              }}
              placeholder={t("licenses.form.noExpiration")}
              fromDate={issueDate}
              clearable
            />
            <FieldError message={errors.expirationDate} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="my_license_documents">{t("licenses.form.documents")}</Label>
          <Input
            ref={documentsRef}
            id="my_license_documents"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
          />
          <p className="text-xs text-muted-foreground">
            {keptDocuments > 0
              ? t("licenses.form.documentsKept", { count: keptDocuments })
              : t("licenses.form.documentsHint")}
          </p>
        </div>
      </div>
    </SidePanel>
  )
}
