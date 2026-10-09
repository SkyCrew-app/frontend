import { ApolloClient, InMemoryCache } from '@apollo/client';
import { onError } from "@apollo/client/link/error";
import { createUploadLink } from 'apollo-upload-client';
import { CachePersistor, LocalStorageWrapper } from 'apollo3-cache-persist';
import { getGraphqlUrl } from './runtime-config';

const uploadLink = createUploadLink({
  uri: getGraphqlUrl(),
  credentials: 'include',
  headers: {
    "Apollo-Require-Preflight": "true",
  }
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }
  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
  }
});

const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        paginatedData: {
          keyArgs: ["filter"],
          merge(existing, incoming) {
            return {
              ...incoming,
              data: existing ? [...existing.data, ...incoming.data] : incoming.data,
            };
          },
        },
      },
    },
  },
});

// Persist cache to localStorage for offline support
if (typeof window !== 'undefined') {
  const persistor = new CachePersistor({
    cache,
    storage: new LocalStorageWrapper(window.localStorage),
    maxSize: 1048576 * 5, // 5MB
    key: 'skycrew-apollo-cache',
  });
  persistor.restore();
}

const client = new ApolloClient({
  link: errorLink.concat(uploadLink),
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    // Mutations keep the default error policy: a refused mutation rejects, so
    // the calling screen reports the failure instead of announcing a success.
  },
});

export default client;
