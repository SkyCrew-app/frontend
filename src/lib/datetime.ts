// A `datetime-local` input yields "yyyy-MM-dd'T'HH:mm" in the browser's
// timezone, without offset. Sent as is, the server would read it in its own
// timezone: convert it to a full ISO string. An empty field yields undefined
// so that it is left out of the request.
export const datetimeLocalToISOString = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

// A day picked in a calendar is midnight in the browser's timezone. Converted
// to UTC it can fall on the previous day: send noon UTC of the picked day, so
// the date is the same wherever it is read.
export const calendarDayToISOString = (day: Date | null | undefined): string | undefined => {
  if (!day || Number.isNaN(day.getTime())) return undefined
  return new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), 12)).toISOString()
}
