// app/layout.js
import './globals.css';
import { ThemeProvider } from '@/lib/hooks/useTheme';
import { DeviceProvider } from '@/app/context/DeviceContext';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  // ✅ العنوان: "منصة محمد رضوان"
  title: 'منصة محمد رضوان',
  
  // ✅ الوصف: "منصة تعليم اللغة الإنجليزية بطريقة سهلة ومبسطة"
  description: 'منصة تعليم اللغة الإنجليزية بطريقة سهلة ومبسطة',
  
  keywords: 'تعليم, منصة تعليمية, محمد رضوان, كورسات, فيديوهات, امتحانات, إنجليزي, تعلم إنجليزي',
  
  authors: [{ name: 'محمد رضوان' }],
  
  // ✅ Open Graph – مع تحديث الصورة إلى Absolute URL باستخدام الدومين الجديد
  openGraph: {
    title: 'منصة محمد رضوان',
    description: 'منصة تعليم اللغة الإنجليزية بطريقة سهلة ومبسطة',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'منصة محمد رضوان',
    url: 'https://mrmohamedradwan.com', // ✅ إضافة URL الدومين الجديد
    images: [
      {
        url: 'https://mrmohamedradwan.com/images/logo.png', // ✅ مسار مطلق للوجو
        width: 512,
        height: 512,
        alt: 'لوجو منصة محمد رضوان',
      },
    ],
  },
  
  // ✅ إعدادات تويتر – مع تحديث الصورة إلى Absolute URL
  twitter: {
    card: 'summary_large_image',
    title: 'منصة محمد رضوان',
    description: 'منصة تعليم اللغة الإنجليزية بطريقة سهلة ومبسطة',
    images: ['https://mrmohamedradwan.com/images/logo.png'], // ✅ مسار مطلق للوجو
  },
  
  // ✅ إعدادات الأيقونة
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
    shortcut: '/images/logo.png',
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  
  viewport: {
    width: 'device-width',
    initialScale: 1.0,
    maximumScale: 5.0,
    userScalable: true,
  },
  
  themeColor: '#0b0e1a',
  
  // ✅ تعيين اللغة والاتجاه – مع تحديث الدومين الجديد
  alternates: {
    canonical: 'https://mrmohamedradwan.com', // ✅ الدومين الجديد
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script src="https://upload-widget.cloudinary.com/global/all.js" async />
        <link rel="icon" href="/images/logo.png" sizes="any" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="theme-color" content="#0b0e1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="font-cairo antialiased min-h-screen bg-[#0b0e1a] text-white overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <DeviceProvider>
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
          </DeviceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}