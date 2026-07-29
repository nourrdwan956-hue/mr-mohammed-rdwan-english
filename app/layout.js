// app/layout.js
import './globals.css';
import { ThemeProvider } from '@/lib/hooks/useTheme';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'منصة محمد رضوان التعليمية',
  description: 'منصة تعليمية متكاملة تجمع بين أحدث التقنيات وأعلى معايير الجودة',
  keywords: 'تعليم, منصة تعليمية, محمد رضوان, كورسات, فيديوهات, امتحانات',
  authors: [{ name: 'محمد رضوان' }],
  openGraph: {
    title: 'منصة محمد رضوان التعليمية',
    description: 'منصة تعليمية متكاملة',
    type: 'website',
    locale: 'ar_EG',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* ✅ Cloudinary Upload Widget */}
        <script src="https://upload-widget.cloudinary.com/global/all.js" async></script>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* ✅ تحسين viewport ليكون متجاوباً مع السماح بالتكبير على الأجهزة الصغيرة */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="theme-color" content="#0b0e1a" />
        {/* ✅ إعدادات إضافية للأجهزة المحمولة */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-cairo antialiased min-h-screen bg-[#0b0e1a] text-white overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider>
          {/* ✅ حاوية رئيسية بمرونة كاملة مع حواف داخلية متجاوبة */}
          <div className="min-h-screen w-full max-w-full overflow-x-hidden">
            {children}
          </div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1a1f2e',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '16px 20px',
                fontSize: '14px',
                maxWidth: '90vw',
              },
              success: {
                icon: '✅',
                style: {
                  background: '#1a1f2e',
                  color: '#4ade80',
                  border: '1px solid rgba(74, 222, 128, 0.2)',
                },
              },
              error: {
                icon: '❌',
                style: {
                  background: '#1a1f2e',
                  color: '#f87171',
                  border: '1px solid rgba(248, 113, 113, 0.2)',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}