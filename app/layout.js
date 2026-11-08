import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const metadata = {
  title: 'AURA – Catat uang lewat WhatsApp',
  description: 'Kirim pengeluaran lewat WhatsApp, tersimpan di Google Sheets milikmu, dan dapat saran keuangan dari AI.',
  robots: { index: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={font.className}>{children}</body>
    </html>
  );
}
