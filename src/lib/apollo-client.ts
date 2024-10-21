import { ApolloClient, InMemoryCache } from '@apollo/client';
import { createUploadLink } from 'apollo-upload-client';
import { setContext } from '@apollo/client/link/context';

const uploadLink = createUploadLink({
  uri: process.env.NEXT_PUBLIC_API_URL,
  credentials: 'include',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-apollo-operation-name': 'MyOperation',
      'apollo-require-preflight': 'true',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(uploadLink),
  cache: new InMemoryCache(),
});

export default client;
