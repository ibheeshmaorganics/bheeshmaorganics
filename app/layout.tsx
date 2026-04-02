import type { Metadata } from 'next';
import './globals.css';
import ConditionalLayout from '@/components/ConditionalLayout';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Bheeshma Organics | Natural Herbal & Ayurvedic Wellness',
  description: 'India\'s Trusted Herbal & Sea Buckthorn Wellness Brand. Natural wellness brand focused on herbal and Ayurvedic health products.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
