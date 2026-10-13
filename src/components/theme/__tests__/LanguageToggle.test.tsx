import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import LanguageToggle from "../LanguageToggle"
import { chooseLanguage } from "@/lib/i18n"
import { saveLanguage } from "@/lib/stored-language"

jest.mock("@/lib/i18n", () => ({
  __esModule: true,
  ...jest.requireActual("@/lib/i18n"),
  chooseLanguage: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/stored-language", () => ({
  saveLanguage: jest.fn().mockResolvedValue(true),
}))

describe("LanguageToggle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const open = async () => {
    const user = userEvent.setup()
    render(<LanguageToggle />)
    await user.click(screen.getByRole("button", { name: "Changer de langue" }))
    return user
  }

  it("stores the chosen language on the server before the page reloads", async () => {
    const user = await open()

    await user.click(screen.getByRole("menuitem", { name: "English" }))

    expect(saveLanguage).toHaveBeenCalledWith("en")
    expect(chooseLanguage).toHaveBeenCalledWith("en")
    expect((saveLanguage as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (chooseLanguage as jest.Mock).mock.invocationCallOrder[0],
    )
  })

  it("does nothing when the current language is chosen again", async () => {
    const user = await open()

    await user.click(screen.getByRole("menuitem", { name: /Français/ }))

    expect(saveLanguage).not.toHaveBeenCalled()
    expect(chooseLanguage).not.toHaveBeenCalled()
  })
})
