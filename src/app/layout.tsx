import type {Metadata} from 'next';
import { Nunito } from 'next/font/google'; // Changed from Geist_Sans to Nunito
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Instantiate Nunito
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito', // Define a CSS variable for Nunito
  weight: ['400', '600', '700'], // Specify needed weights
});

export const metadata: Metadata = {
  title: 'Savannah Chase',
  description: 'A fun board game set in the savannah!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} font-sans antialiased`}> {/* Apply Nunito variable */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
