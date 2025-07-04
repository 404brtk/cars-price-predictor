import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import favicon from '../../public/favicon.ico';
import Header from '@/components/layout/Header';
import { AuthProvider } from '@/context/AuthContext';
import Footer from '@/components/layout/Footer';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'cars-price-predictor',
  description: 'predict the price of a used car in seconds.',
  icons: {
    icon: favicon.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased font-sans`} suppressHydrationWarning>
        <div className="flex flex-col min-h-screen">
          <AuthProvider>
            <Header />
            <main className="flex-grow">
              {children}
            </main>
          </AuthProvider>
          <Footer />
        </div>
      </body>
    </html>
  );
}
