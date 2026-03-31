import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/app/components/Sidebar';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { ThemeProvider } from '@/components/theme-provider';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Neo & Trinity Dashboard',
  description: 'Operating system for Thomaz',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="bg-bg text-fg antialiased min-h-screen font-sans">
        <ThemeProvider defaultTheme="system">
          <div className="min-h-screen flex relative">
            {/* Animated mesh gradient background */}
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-purple-500/5 animate-pulse" />
            </div>

            {/* Sidebar (includes mobile toggle) */}
            <Sidebar />

            {/* Main content */}
            <main className="flex-1 min-h-screen relative z-10">
              <div className="p-4 lg:p-8 pt-16 lg:pt-8">
                <div className="max-w-7xl mx-auto">
                  <Header />
                  {children}
                  <Footer />
                </div>
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
