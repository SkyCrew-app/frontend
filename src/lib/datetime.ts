// A `datetime-local` input yields "yyyy-MM-dd'T'HH:mm" in the browser's
// timezone, without offset. Sent as is, the server would read it in its own
// timezone: convert it to a full ISO string. An empty field yields undefined
// so that it is left out of the request.
export const datetimeLocalToISOString = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
