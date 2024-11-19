'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { ApolloProvider } from '@apollo/client';
import client from '@/lib/apollo-client';
import { Toaster } from '../ui/toaster';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ApolloProvider client={client}>
        {children}
        <Toaster />
      </ApolloProvider>
    </ThemeProvider>
  );
}
