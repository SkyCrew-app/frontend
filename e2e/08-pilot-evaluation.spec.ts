import { test, expect, confirmAlert } from "./support/test"
import { sessionFile } from "./support/accounts"

test.use({ storageState: sessionFile("pilot") })

// An attempt cannot be deleted: each run adds one result to the pilot's evaluations.
// The last choice is wrong for every question of the demo data, so the evaluation is
// never passed and stays available for the next run.
test("le pilote passe une évaluation jusqu'à l'écran de résultat", async ({ page }) => {
  await page.goto("/instruction/evaluation")
  await expect(page.getByRole("heading", { level: 1, name: "Mes évaluations" })).toBeVisible()
  await expect(page.getByRole("heading", { level: 2, name: "À passer" })).toBeVisible()

  await page.getByRole("link", { name: /^(Passer|Repasser) l'évaluation$/ }).first().click()
  await expect(page).toHaveURL(/\/instruction\/evaluation\/\d+$/)

  const title = page.getByRole("heading", { level: 1, name: /^Évaluation : / })
  await expect(title).toBeVisible()
  const moduleName = (await title.innerText()).replace(/^Évaluation : /, "").trim()

  const position = page.getByText(/^Question \d+ sur \d+$/)
  await expect(position).toBeVisible()
  const total = Number((await position.innerText()).match(/sur (\d+)/)![1])
  await expect(page.getByText(`Réponses données : 0 sur ${total}`)).toBeVisible()

  for (let number = 1; number <= total; number++) {
    await expect(position).toHaveText(`Question ${number} sur ${total}`)
    const choice = page.getByRole("radiogroup").getByRole("radio").last()
    await choice.click()
    await expect(choice).toBeChecked()
    await expect(page.getByText(`Réponses données : ${number} sur ${total}`)).toBeVisible()
    if (number < total) await page.getByRole("button", { name: "Suivante" }).click()
  }

  await page.getByRole("button", { name: "Terminer l'évaluation" }).click()
  await expect(page.getByRole("alertdialog")).toContainText("Envoyer vos réponses ?")
  await confirmAlert(page, "Envoyer mes réponses")

  await expect(page.getByRole("heading", { level: 2, name: "Évaluation non réussie" })).toBeVisible()
  await expect(page.getByLabel("Votre score : 0 %")).toBeVisible()
  await expect(page.getByRole("main")).toContainText("Score requis")

  await page.getByRole("button", { name: "Voir mes évaluations" }).or(page.getByRole("link", { name: "Voir mes évaluations" })).click()
  await expect(page).toHaveURL(/\/instruction\/evaluation$/)
  const latest = page.getByRole("table").getByRole("row").nth(1)
  await expect(latest).toContainText(moduleName)
  await expect(latest).toContainText("0 %")
  await expect(latest).toContainText("Non réussie")
})
