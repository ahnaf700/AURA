import { Sora, Plus_Jakarta_Sans, Montserrat } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';

// Sora: huruf geometris untuk judul dan angka (sejiwa dengan logo). Plus Jakarta Sans: teks bacaan.
const display = Sora({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body', display: 'swap' });

// Huruf "AURA" = font sungguhan hasil penelusuran logo (brand/make_wordmark_font.py), bukan gambar.
const aura = localFont({ src: './fonts/AuraWordmark.woff', weight: '400', style: 'normal', variable: '--font-aura', display: 'swap' });
// Tagline logo memakai sans geometris tipis; Montserrat Light paling mendekati.
const tagline = Montserrat({ subsets: ['latin'], weight: ['300'], variable: '--font-tagline', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'AURA – Catat uang lewat WhatsApp', template: '%s · AURA' },
  description: 'Kirim pengeluaran lewat WhatsApp, tersimpan di Google Sheets milikmu, dan dapat saran keuangan dari AI.',
  robots: { index: false },
};

export const viewport = { themeColor: '#1F2836', colorScheme: 'dark' };

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${display.variable} ${body.variable} ${aura.variable} ${tagline.variable}`}>
      <body>{children}</body>
    </html>
  );
}
