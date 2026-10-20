// Older notifications point to addresses the site no longer has: they lead to the page that replaced them.
const MOVED: Record<string, string> = {
  "/maintenance": "/fleet/maintenance",
  "/incidents": "/fleet/incidents",
  "/invoices": "/profile/money_account",
  "/e-learning": "/instruction/e-learning",
}

/** Where a notification's action leads, or null when it has none. */
export function notificationLink(actionUrl: string | null | undefined): string | null {
  const url = actionUrl?.trim()
  if (!url) return null
  const [path, rest = ""] = url.split(/(?=[?#])/, 2)
  const moved = MOVED[path.replace(/\/+$/, "")]
  return moved ? moved + rest : url
}
