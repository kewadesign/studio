import type {Metadata} from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Savannah Chase',
  description: 'Ein lustiges Brettspiel in der Savanne!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${nunito.variable} font-sans antialiased`}> {/* Apply Nunito variable */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
