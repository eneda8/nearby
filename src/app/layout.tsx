import './globals.css';
import React from 'react';
import { Analytics } from '@vercel/analytics/next';

export const metadata = { title: 'Nearby', description: 'Find places near any address' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon_io/apple-touch-icon.png"></link>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon_io/favicon-32x32.png"></link>
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon_io/favicon-16x16.png"></link>
        <link rel="manifest" href="/site.webmanifest"></link>
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
