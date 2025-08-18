import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import Providers from '@/components/providers/providers';
import { NextIntlClientProvider } from 'next-intl';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'SkyCrew',
  description: 'SkyCrew is a comprehensive web-based application designed to streamline the management of an aeroclub. It offers real-time tracking of aircraft, reservation management, pilot certifications, maintenance tracking, and much more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className='dark:bg-gray-900 bg-gray-100'>
            <NextIntlClientProvider>{children}</NextIntlClientProvider>
          </div>
        </Providers>
      </body>
    </html>
  );
}
