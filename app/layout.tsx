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
        <a 
          href="https://wa.me/919059868788" 
          target="_blank" 
          rel="noopener noreferrer"
          className="whatsapp-float"
          style={{
            position: 'fixed',
            bottom: '25px',
            right: '25px',
            backgroundColor: '#25D366',
            color: 'white',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            zIndex: 9999,
          }}
          aria-label="Chat with us on WhatsApp"
        >
          <style dangerouslySetInnerHTML={{ __html: `
            .whatsapp-float {
              transition: transform 0.3s ease;
            }
            .whatsapp-float:hover {
              transform: scale(1.1);
            }
          `}} />
          <svg width="35" height="35" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.52 3.44C18.24 1.15 15.18 0 12.04 0 5.46 0 .11 5.34.1 11.91c0 2.05.53 4.05 1.55 5.82L0 23.97l6.4-1.67c1.7.94 3.63 1.44 5.61 1.44h.01c6.58 0 11.93-5.35 11.94-11.92 0-3.17-1.23-6.17-3.44-8.38zM12.03 21.75c-1.73 0-3.41-.46-4.88-1.33l-.35-.21-3.63.95.97-3.53-.23-.37c-.96-1.53-1.47-3.3-1.47-5.11 0-5.46 4.45-9.91 9.92-9.91 2.65 0 5.15 1.03 7.02 2.91 1.88 1.88 2.91 4.38 2.91 7.03-.01 5.48-4.46 9.57-9.91 9.57zM17.47 14.3c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-1.13-.1-1.27-.47-1.47-.82-.2-.35-.02-.54.13-.69.15-.15.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.09 4.49 2.99 1.29 2.99.86 3.54.81.55-.05 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.17-.57-.32z" />
          </svg>
        </a>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
