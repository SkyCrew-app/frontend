import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import Providers from '@/components/providers/providers';

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

export const metadata: Metadata = {
  title: 'SkyCrew',
  description: 'SkyCrew is a comprehensive web-based application designed to streamline the management of an aeroclub. It offers real-time tracking of aircraft, reservation management, pilot certifications, maintenance tracking, and much more.',
  manifest: '/manifest.json',
  themeColor: '#1e3a5f',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SkyCrew',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
          >
            Aller au contenu principal
          </a>
          <div className='bg-background'>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
