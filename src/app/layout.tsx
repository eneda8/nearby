import './globals.css';
import React from 'react';
import { Analytics } from '@vercel/analytics/next';

export const metadata = { title: 'Nearby', description: 'Find places near any address' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
