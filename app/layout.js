import './globals.css';
import { Cairo } from 'next/font/google';
import Link from 'next/link';

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '600', '700', '800', '900'],
  variable: '--font-cairo',
});

export const metadata = {
  title: 'منصة محمد رضوان | تعليم الإنجليزية',
  description: 'أقوى منصة تعليمية لتعلم الإنجليزية باحترافية',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-cairo bg-[#0b0e1a] text-white antialiased">
        {children}
      </body>
    </html>
  );
}