import { ApolloLink, execute, gql, Observable } from "@apollo/client"

const mockPurge = jest.fn().mockResolvedValue(undefined)
const mockPause = jest.fn()
const mockResume = jest.fn()

jest.mock("apollo3-cache-persist", () => ({
  CachePersistor: jest.fn().mockImplementation(() => ({
    restore: jest.fn().mockResolvedValue(undefined),
    purge: (...args: unknown[]) => mockPurge(...args),
    pause: (...args: unknown[]) => mockPause(...args),
    resume: (...args: unknown[]) => mockResume(...args),
  })),
  LocalStorageWrapper: jest.fn(),
}))

jest.mock("apollo-upload-client", () => ({
  createUploadLink: () => {
    const { ApolloLink } = jest.requireActual("@apollo/client")
    return new ApolloLink(() => null)
  },
}))

import client, { clearSessionCache, languageLink } from "../apollo-client"
import i18n from "../i18n"

const ME = gql`
  query Me {
    me {
      id
      email
    }
  }
`

describe("clearSessionCache", () => {
  it("empties the memory cache and the copy kept in the browser", async () => {
    client.writeQuery({ query: ME, data: { me: { __typename: "User", id: 3, email: "p@example.com" } } })
    expect(client.readQuery({ query: ME })).not.toBeNull()

    await clearSessionCache()

    expect(client.readQuery({ query: ME })).toBeNull()
    expect(mockPurge).toHaveBeenCalledTimes(1)
    // Persistence is suspended while clearing, then restarted for the next session.
    expect(mockPause.mock.invocationCallOrder[0]).toBeLessThan(mockPurge.mock.invocationCallOrder[0])
    expect(mockResume).toHaveBeenCalledTimes(1)
  })
})

describe("languageLink", () => {
  const headersSent = (contextHeaders?: Record<string, string>) =>
    new Promise<Record<string, string>>((resolve) => {
      const terminating = new ApolloLink((operation) => {
        resolve(operation.getContext().headers)
        return Observable.of({ data: {} })
      })
      execute(languageLink.concat(terminating), { query: ME, context: { headers: contextHeaders } }).subscribe({})
    })

  afterEach(async () => {
    await i18n.changeLanguage("fr")
  })

  it("tells the API which language the interface is shown in", async () => {
    await expect(headersSent()).resolves.toEqual({ "Accept-Language": "fr" })

    await i18n.changeLanguage("en")

    await expect(headersSent()).resolves.toEqual({ "Accept-Language": "en" })
  })

  it("keeps the headers a request already carries", async () => {
    await expect(headersSent({ "X-Test": "1" })).resolves.toEqual({ "X-Test": "1", "Accept-Language": "fr" })
  })
})
