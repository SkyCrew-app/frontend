import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import SkipLink from "@/components/navigation/SkipLink"
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/components/providers/providers';
import { getBasePath } from '@/lib/runtime-config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const basePath = getBasePath();

export const metadata: Metadata = {
  title: 'SkyCrew',
  description: 'SkyCrew is a comprehensive web-based application designed to streamline the management of an aeroclub. It offers real-time tracking of aircraft, reservation management, pilot certifications, maintenance tracking, and much more.',
  manifest: `${basePath || ''}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SkyCrew',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Set by the proxy for each request. Reading it also renders every page on
  // request, which the Content-Security-Policy needs: a page built ahead of
  // time could not carry the nonce on its scripts.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers nonce={nonce}>
          <SkipLink />
          <div className='bg-background'>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
