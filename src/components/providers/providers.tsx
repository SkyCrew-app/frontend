'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { ApolloProvider } from '@apollo/client';
import { I18nextProvider } from 'react-i18next';
import client from '@/lib/apollo-client';
import i18n, { applyLanguage, preferredLanguage } from '@/lib/i18n';
import { Toaster } from '../ui/toaster';

export default function Providers({ children }: { children: ReactNode }) {
  // The member's language is only known in the browser: nothing is shown
  // until it is applied, so no screen appears in the wrong language first.
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    // Whatever happens, the page must show: French stays if the language cannot be applied.
    applyLanguage(preferredLanguage())
      .catch(() => undefined)
      .then(() => setLanguageReady(true));
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ApolloProvider client={client}>
          {languageReady ? children : null}
          <Toaster />
        </ApolloProvider>
      </ThemeProvider>
    </I18nextProvider>
  );
}
