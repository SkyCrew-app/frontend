import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import Providers from '@/components/providers/providers';

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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className='absolute top-4 right-4'>
          </div>
          {children}
        </Providers>
      </body>
    </html>
  );
}
