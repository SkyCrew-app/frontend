import { act, renderHook } from "@testing-library/react"
import { MockedProvider } from "@apollo/client/testing"
import type { ReactNode } from "react"
import { LOGOUT_MUTATION } from "@/graphql/system"
import { useLogout } from "../useLogout"

const mockPush = jest.fn()
const mockClearSessionCache = jest.fn().mockResolvedValue(undefined)

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock("@/lib/apollo-client", () => ({ clearSessionCache: () => mockClearSessionCache() }))

const wrapperWith = (mocks: any[]) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MockedProvider mocks={mocks} addTypename={false}>
        {children}
      </MockedProvider>
    )
  }

describe("useLogout", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, "error").mockImplementation(() => {})
  })

  it("ends the session, forgets its cached data, then returns to the sign-in page", async () => {
    const wrapper = wrapperWith([{ request: { query: LOGOUT_MUTATION }, result: { data: { logout: true } } }])
    const { result } = renderHook(() => useLogout(), { wrapper })

    await act(async () => {
      await result.current()
    })

    expect(mockClearSessionCache).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith("/")
  })

  it("stays on the page when the server could not end the session", async () => {
    const wrapper = wrapperWith([{ request: { query: LOGOUT_MUTATION }, error: new Error("offline") }])
    const { result } = renderHook(() => useLogout(), { wrapper })

    await act(async () => {
      await result.current()
    })

    expect(mockClearSessionCache).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
