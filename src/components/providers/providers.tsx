// components/Providers.tsx

'use client';

import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apollo-client';
import React from 'react';

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
