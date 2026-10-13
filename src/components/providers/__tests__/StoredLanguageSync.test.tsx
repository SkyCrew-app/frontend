import { render } from "@testing-library/react"

import StoredLanguageSync from "../StoredLanguageSync"
import { syncStoredLanguage } from "@/lib/stored-language"

jest.mock("@/lib/stored-language", () => ({
  syncStoredLanguage: jest.fn().mockResolvedValue(undefined),
}))

describe("StoredLanguageSync", () => {
  it("aligns the stored language once when the signed-in area opens", () => {
    const { container, rerender } = render(<StoredLanguageSync />)
    rerender(<StoredLanguageSync />)

    expect(syncStoredLanguage).toHaveBeenCalledTimes(1)
    expect(container).toBeEmptyDOMElement()
  })
})
