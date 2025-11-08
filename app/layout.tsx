import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/next';
import { LeagueProvider } from '../lib/context/league-context';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppLayout } from '@/components/app-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <LeagueProvider>
          <SidebarProvider
            defaultOpen={true}
            style={
              {
                '--sidebar-width': '12rem',
                '--sidebar-width-icon': '3rem',
              } as React.CSSProperties
            }
          >
            <AppLayout>{children}</AppLayout>
          </SidebarProvider>
        </LeagueProvider>
        <Analytics />
      </body>
    </html>
  );
}
