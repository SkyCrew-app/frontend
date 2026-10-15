import type { ReactNode } from "react"
import { renderHook, waitFor } from "@testing-library/react"
import { MockedProvider, type MockedResponse } from "@apollo/client/testing"
import { GET_PLAN } from "@/graphql/plan"
import type { ClubPlan } from "@/lib/plan"
import { usePlanRoom } from "../usePlanRoom"

const club = (activeMembers: number): MockedResponse => ({
  request: { query: GET_PLAN },
  result: {
    data: {
      plan: {
        plan: "CLUB",
        features: [],
        maxAircraft: null,
        aircraftInService: 4,
        maxMembers: 3,
        activeMembers,
      } satisfies ClubPlan,
    },
  },
})

const wrapperWith = (mocks: MockedResponse[]) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  )
  return Wrapper
}

describe("usePlanRoom", () => {
  it("says the member places are all used, and asks again once the list of members changes", async () => {
    const { result, rerender } = renderHook(({ watch }: { watch?: string }) => usePlanRoom("members", watch), {
      wrapper: wrapperWith([club(3), club(2)]),
      initialProps: { watch: undefined as string | undefined },
    })

    await waitFor(() => expect(result.current).toBe(3))
    // The list loads: nothing changed since the plan was counted.
    rerender({ watch: "1:1,2:1,3:1" })
    expect(result.current).toBe(3)

    // A member is deactivated: the plan is read again and has room.
    rerender({ watch: "1:1,2:1,3:0" })
    await waitFor(() => expect(result.current).toBeNull())
  })

  it("leaves the decision to the API when the plan cannot be read", async () => {
    const { result } = renderHook(() => usePlanRoom("aircraft"), {
      wrapper: wrapperWith([{ request: { query: GET_PLAN }, error: new Error("network") }]),
    })

    await waitFor(() => expect(result.current).toBeNull())
  })
})
