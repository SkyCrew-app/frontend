import type { Page } from "@playwright/test"
import { expect } from "./test"

/**
 * Opens the reservation calendar on a day two months ahead and returns its label
 * ("mardi 15 décembre 2026"). Days the club is closed are disabled in the picker,
 * so the first open day from the 15th is taken.
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
  await next.click()
  await next.click()

  if (knownDay) {
    await picker.getByRole("gridcell", { name: knownDay, exact: true }).click()
  } else {
    const open = picker.locator("[role=gridcell]:not([disabled]):not(.day-outside)").filter({ hasText: /^(1[5-9]|2[0-8])$/ })
    await open.first().click()
  }
  await expect(picker).toBeHidden()
  return (await navigator.innerText()).trim()
}
