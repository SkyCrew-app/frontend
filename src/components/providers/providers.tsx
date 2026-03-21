'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { ApolloProvider } from '@apollo/client';
import { I18nextProvider } from 'react-i18next';
import client from '@/lib/apollo-client';
import i18n from '@/lib/i18n';
import { Toaster } from '../ui/toaster';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ApolloProvider client={client}>
          {children}
          <Toaster />
        </ApolloProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
