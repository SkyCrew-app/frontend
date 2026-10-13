import fs from "node:fs"
import type { Browser, Page } from "@playwright/test"
import { test, expect, sidePanel, toast, asRole, uniqueName, prepareContext, signIn } from "./support/test"
import { ACCOUNTS, DEMO_PASSWORD, sessionFile } from "./support/accounts"
import { ensureAircraft, type TestAircraft } from "./support/aircraft"
import { openCalendarAhead } from "./support/calendar"
import { euros, findMember, openMemberActions, openMemberSheet } from "./support/members"

test.use({ storageState: sessionFile("admin") })

// The member who leaves is the student of the demo data set: nobody else books with her session.
// Deactivating an account closes its sessions: once the account is reactivated the journey signs
// her in again and saves the new session, for a retry of this journey and for the next run.
const MEMBER = ACCOUNTS.student
const aircraft: TestAircraft = { registration: "F-EEEE", model: "E2E avion des tests" }
// An hour of its own on the test aircraft (08:00 and 10:00 belong to the pilot, 14:00 to the instruction flight).
const HOUR = "16:00"

const freeCell = (page: Page) => page.getByRole("cell", { name: `Réserver ${aircraft.registration} à ${HOUR}` })

let deactivated = false
let sessionClosed = false

async function reactivate(page: Page) {
  const row = await findMember(page, MEMBER.email)
  await openMemberActions(page, row, MEMBER.name)
  await page.getByRole("menuitem", { name: "Réactiver le compte" }).click()
  await expect(toast(page, "Compte réactivé")).toBeVisible()
  await expect(row.getByRole("cell", { name: "Activé", exact: true })).toBeVisible()
  deactivated = false
}

test.beforeAll(async ({ browser }) => {
  await asRole(browser, "admin", (page) => ensureAircraft(page, aircraft, "0.01"))
})

/** Signs the member in again and saves the session, as auth.setup.ts does. */
async function renewSession(browser: Browser) {
  const context = await browser.newContext({ ...test.info().project.use, storageState: undefined })
  try {
    await prepareContext(context, test.info().project.use.baseURL)
    const page = await context.newPage()
    await signIn(page, "student")
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toContainText(MEMBER.name)
    await context.storageState({ path: sessionFile("student") })
    sessionClosed = false
  } finally {
    await context.close()
  }
}

test.afterEach(async ({ page, browser }) => {
  // A member left deactivated, or a saved session the API no longer accepts, would fail later runs.
  if (deactivated) await reactivate(page)
  if (sessionClosed) await renewSession(browser)
})

test("désactiver un membre qui a une réservation à venir l'annule et le rembourse", async ({ page, browser }) => {
  const purpose = uniqueName("E2E départ")

  const day = await test.step("le membre réserve un avion avec un instructeur", async () => {
    // An earlier run that stopped halfway may have left no usable session.
    if (!fs.existsSync(sessionFile("student"))) await renewSession(browser)
    return asRole(browser, "student", async (memberPage) => {
      const dayLabel = await openCalendarAhead(memberPage)
      await freeCell(memberPage).click()
      const panel = sidePanel(memberPage, "Créer une réservation")
      await panel.getByLabel("But de la réservation").fill(purpose)
      await panel.getByRole("combobox", { name: "Avec un instructeur" }).click()
      await memberPage.getByRole("option", { name: ACCOUNTS.instructor.name, exact: true }).click()
      await panel.getByRole("button", { name: "Créer la réservation" }).click()
      await expect(toast(memberPage, "Réservation créée")).toBeVisible()
      await expect(memberPage.getByRole("button", { name: new RegExp(`^${purpose}`) })).toBeVisible()
      return dayLabel.match(/\d+/)![0]
    })
  })

  // The booking has been charged: this is the balance the refund is added to.
  const before = await test.step("solde du membre avant son départ", async () => {
    const row = await findMember(page, MEMBER.email)
    const { sheet, balance } = await openMemberSheet(page, row, MEMBER.name)
    await sheet.getByRole("button", { name: "Fermer" }).first().click()
    await expect(sheet).toBeHidden()
    return balance
  })

  const refund = await test.step("la désactivation annonce ce qui reste à venir et propose de l'annuler", async () => {
    const row = await findMember(page, MEMBER.email)
    await openMemberActions(page, row, MEMBER.name)
    await page.getByRole("menuitem", { name: "Désactiver le compte" }).click()
    const dialog = page.getByRole("alertdialog", { name: `Désactiver le compte de ${MEMBER.name} ?` })
    await expect(dialog.getByRole("heading", { name: /^\d+ réservations? à venir$/ })).toBeVisible()
    // The booking just made is listed with what was paid for it: one hour at one cent.
    const line = dialog.getByRole("listitem").filter({ hasText: `à ${HOUR} · ${aircraft.registration}` })
    await expect(line).toHaveCount(1)
    await expect(line).toContainText(/0,01\s€/)

    // Nothing is cancelled unless the administrator asks for it.
    const cancel = dialog.getByRole("checkbox", { name: /^Annuler ces réservations et rembourser le membre/ })
    await expect(cancel).not.toBeChecked()
    await expect(dialog.getByRole("button", { name: "Désactiver", exact: true })).toBeVisible()
    await cancel.check()
    const total = euros(await dialog.getByText(/^Annuler ces réservations et rembourser le membre/).first().innerText())
    expect(total).toBeGreaterThanOrEqual(0.01)

    await dialog.getByRole("button", { name: "Désactiver et annuler les réservations" }).click()
    deactivated = true
    sessionClosed = true
    await expect(dialog).toBeHidden()
    await expect(toast(page, "Compte désactivé")).toBeVisible()
    await expect(page.getByText(/\d+ réservations? annulées?, .*€ remboursés\./).first()).toBeVisible()
    await expect(row.getByRole("cell", { name: "Désactivé", exact: true })).toBeVisible()
    return total
  })

  await test.step("le membre est remboursé de ce qu'il avait payé", async () => {
    const row = await findMember(page, MEMBER.email)
    const { sheet, balance } = await openMemberSheet(page, row, MEMBER.name)
    expect(balance).toBeCloseTo(before + refund, 2)
    await sheet.getByRole("button", { name: "Fermer" }).first().click()
  })

  await test.step("le créneau est de nouveau libre au planning", async () => {
    await openCalendarAhead(page, day)
    await expect(freeCell(page)).toBeVisible()
    await expect(page.getByRole("button", { name: new RegExp(`^${purpose}`) })).toHaveCount(0)
  })

  await test.step("le membre ne peut plus se connecter", async () => {
    const context = await browser.newContext({ ...test.info().project.use, storageState: undefined })
    try {
      await prepareContext(context, test.info().project.use.baseURL)
      const visitor = await context.newPage()
      await visitor.goto("/")
      await visitor.getByLabel("Adresse e-mail").fill(MEMBER.email)
      await visitor.getByLabel("Mot de passe").fill(DEMO_PASSWORD)
      await visitor.getByRole("button", { name: "Se connecter" }).click()
      await expect(toast(visitor, "Erreur de connexion")).toBeVisible()
      await expect(visitor).toHaveURL(/\/$/)
    } finally {
      await context.close()
    }
  })

  await test.step("le journal des actions retient la désactivation, les annulations et le remboursement", async () => {
    await page.goto("/administration/actions")
    await page.getByRole("combobox", { name: "Type d'action" }).click()
    await page.getByRole("option", { name: "Compte désactivé", exact: true }).click()
    const line = page.getByRole("table").getByRole("row").filter({ hasText: `Membre : ${MEMBER.name}` }).first()
    await expect(line).toContainText("Demo Admin")
    await expect(line).toContainText(/Réservations annulées : \d+/)
    await expect(line).toContainText(/Remboursé : .*€/)
  })

  await test.step("le compte est réactivé et le membre se connecte de nouveau", async () => {
    await reactivate(page)
    await renewSession(browser)
  })
})
