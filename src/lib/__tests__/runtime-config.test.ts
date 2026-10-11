import { getBackendBaseUrl, getGraphqlUrl, getServerGraphqlUrl } from "../runtime-config"

const ENV = { ...process.env }

describe("runtime-config", () => {
  beforeEach(() => {
    process.env = { ...ENV }
    delete process.env.NEXT_PUBLIC_GRAPHQL_URL
    delete process.env.NEXT_PUBLIC_BACKEND_URL
    delete process.env.NEXT_PUBLIC_API_URL
    delete process.env.INTERNAL_GRAPHQL_URL
  })

  afterAll(() => {
    process.env = ENV
  })

  it("defaults to the local API", () => {
    expect(getGraphqlUrl()).toBe("http://localhost:3000/graphql")
    expect(getBackendBaseUrl()).toBe("http://localhost:3000")
  })

  it("keeps relative addresses for a reverse proxy serving both on one address", () => {
    process.env.NEXT_PUBLIC_GRAPHQL_URL = "/graphql"
    process.env.NEXT_PUBLIC_BACKEND_URL = "/"

    expect(getGraphqlUrl()).toBe("/graphql")
    // Files are addressed as `${base}/uploads/...`: the base is empty.
    expect(getBackendBaseUrl()).toBe("")
  })

  it("gives the server the internal address of the API when there is one", () => {
    process.env.NEXT_PUBLIC_GRAPHQL_URL = "/graphql"
    process.env.INTERNAL_GRAPHQL_URL = " http://backend:3000/graphql "

    expect(getServerGraphqlUrl()).toBe("http://backend:3000/graphql")
  })

  it("lets the server use the public address otherwise", () => {
    process.env.NEXT_PUBLIC_GRAPHQL_URL = "https://api.example.com/graphql"

    expect(getServerGraphqlUrl()).toBe("https://api.example.com/graphql")
  })
})
