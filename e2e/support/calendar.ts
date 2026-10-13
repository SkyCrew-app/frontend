import type { Page } from "@playwright/test"
import { expect } from "./test"

// A booking whose flight is closed stays on the calendar for good. Each run therefore
// works on a month and a day drawn at random, far enough ahead, so runs do not collide.
// Drawn from the clock: any spread will do, this is not a secret.
// Not further than four months: the API refuses a booking beyond the expiry of the pilot's
// licence, and the demo pilot's licence is valid for 365 days from the day the data is seeded.
const STARTED = Date.now()
const MONTHS_AHEAD = 2 + (STARTED % 3)
const DAY_DRAW = (Math.floor(STARTED / 10) % 100) / 100

/**
 * Opens the reservation calendar on a day several months ahead and returns its label
 * ("mardi 15 décembre 2026"). Days the club is closed are disabled in the picker,
 * so an open day between the 15th and the 28th is taken.
 */
export async function openCalendarAhead(page: Page, knownDay?: string) {
  await page.goto("/reservations")
  await expect(page.getByRole("heading", { level: 1, name: "Calendrier des réservations" })).toBeVisible()
  // The grid comes with the club settings: the picker greys closed days out only once they are loaded.
  await expect(page.getByRole("columnheader", { name: "Avion" })).toBeVisible()

  const navigator = page.getByRole("main").getByRole("button", { name: /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \d/ })
  await navigator.click()
  const picker = page.getByRole("dialog")
  const next = picker.getByRole("button", { name: "Go to next month" })
  for (let month = 0; month < MONTHS_AHEAD; month++) await next.click()

  if (knownDay) {
    // The grid also shows the last days of the previous month and the first of the next.
    await picker
      .locator("[role=gridcell]:not(.day-outside)")
      .filter({ hasText: new RegExp(`^${knownDay}$`) })
      .click()
  } else {
    const open = picker.locator("[role=gridcell]:not([disabled]):not(.day-outside)").filter({ hasText: /^(1[5-9]|2[0-8])$/ })
    await expect(open.first()).toBeVisible()
    await open.nth(Math.floor(DAY_DRAW * (await open.count()))).click()
  }
  await expect(picker).toBeHidden()
  return (await navigator.innerText()).trim()
}
