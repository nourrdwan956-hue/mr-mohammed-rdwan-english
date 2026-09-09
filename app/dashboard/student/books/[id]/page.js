'use client';

import { useState, useEffect, useRef } from 'react'; // ✅ تمت إضافة useRef
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// ألوان البطاقات المتغيرة (نفس نظام الرئيسية)
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// 🌊 مكون الحدود الموجية (Wave Border)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + 2;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange]);

  const waveColors = [
    `rgba(59, 130, 246, 0.6)`,
    `rgba(37, 99, 235, 0.3)`,
    `rgba(96, 165, 250, 0.5)`,
    `rgba(59, 130, 246, 0.7)`,
    `rgba(37, 99, 235, 0.2)`,
  ];

  const gradientStyle = {
    background: `conic-gradient(from ${rotation}deg, ${waveColors.join(', ')})`,
    borderRadius: '1.5rem',
    padding: '3px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// دوال مساعدة لاستخراج ومعالجة روابط Google Drive
// ================================================================
function extractGoogleDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{25,})$/,
  ];
  for (const regex of patterns) {
    const match = url.match(regex);
    if (match) return match[1];
  }
  return null;
}

function getGoogleDrivePreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function getGoogleDriveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// ================================================================
// مكون صفحة تفاصيل الكتاب – نسخة فاخرة مع Wave Border
// ================================================================
export default function StudentBookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id;
  const { theme, language, styles } = useTheme();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ألوان متغيرة للرأس والمعاينة
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [previewColor, setPreviewColor] = useState(CARD_COLORS[2]);

  const fetchBook = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError || !bookData) {
        setError(language === 'ar' ? 'الكتاب غير موجود' : 'Book not found');
        setLoading(false);
        return;
      }

      if (!bookData.is_published) {
        setError(language === 'ar' ? 'الكتاب غير متاح حالياً' : 'Book is not available');
        setLoading(false);
        return;
      }

      supabase
        .from('books')
        .update({ views: (bookData.views || 0) + 1 })
        .eq('id', bookId)
        .then(() => {});

      setBook(bookData);
    } catch (err) {
      console.error(err);
      setError(language === 'ar' ? 'حدث خطأ أثناء تحميل الكتاب' : 'Error loading book');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookId) fetchBook();
  }, [bookId]);

  const rawUrl = book?.file_url || book?.external_url || null;
  const googleDriveId = rawUrl ? extractGoogleDriveId(rawUrl) : null;
  const previewUrl = googleDriveId ? getGoogleDrivePreviewUrl(googleDriveId) : rawUrl;
  const downloadUrl = googleDriveId ? getGoogleDriveDownloadUrl(googleDriveId) : rawUrl;

  const isPreviewable = previewUrl && (
    googleDriveId ||
    rawUrl?.toLowerCase().endsWith('.pdf') ||
    rawUrl?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)
  );

  const handleDownload = () => {
    if (downloadUrl) {
      supabase
        .from('books')
        .update({ downloads: (book.downloads || 0) + 1 })
        .eq('id', bookId)
        .then(() => {
          setBook((prev) => prev ? { ...prev, downloads: (prev.downloads || 0) + 1 } : prev);
        });

      window.open(downloadUrl, '_blank');
      toast.success(language === 'ar' ? 'جاري التحميل...' : 'Downloading...');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-md w-full p-8 rounded-3xl ${styles.card} border ${styles.border} text-center space-y-4 shadow-2xl`}
        >
          <div className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.XCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className={`text-xl font-bold ${styles.text}`}>{error}</h2>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-blue-500/30"
          >
            {language === 'ar' ? 'العودة' : 'Go back'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* ===== زر الرجوع ===== */}
        <button
          onClick={() => router.back()}
          className={`text-base ${styles.subtext} hover:text-blue-500 transition flex items-center gap-2 font-bold`}
        >
          <Icons.ArrowLeft className="h-5 w-5" />
          {language === 'ar' ? 'العودة للكورس' : 'Back to Course'}
        </button>

        {/* ===== رأس الكتاب مع Wave Border ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1">
              <h1 className={`text-3xl sm:text-4xl font-black ${styles.text} leading-tight`}>
                {book.title}
              </h1>
              {book.description && (
                <p className={`text-lg ${styles.subtext} mt-3 leading-relaxed`}>{book.description}</p>
              )}
              <div className="flex items-center gap-5 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Icons.Eye className="h-5 w-5 text-blue-500" /> {book.views || 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <Icons.Download className="h-5 w-5 text-green-500" /> {book.downloads || 0}
                </span>
                {book.created_at && (
                  <span className="flex items-center gap-1.5">
                    <Icons.Calendar className="h-5 w-5 text-purple-500" />
                    {new Date(book.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </div>
            {downloadUrl && (
              <button
                onClick={handleDownload}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-xl hover:scale-105 transition shadow-2xl shadow-blue-500/30 flex items-center gap-3 self-start flex-shrink-0"
              >
                <Icons.Download className="h-6 w-6" />
                {language === 'ar' ? 'تحميل الكتاب' : 'Download Book'}
              </button>
            )}
          </div>
        </WaveBorderCard>

        {/* ===== صورة الغلاف (إن وجدت) مع Wave Border ===== */}
        {book.cover_image && (
          <WaveBorderCard initialColor={CARD_COLORS[4].name}>
            <div className="overflow-hidden rounded-3xl">
              <motion.img
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                src={book.cover_image}
                alt={book.title}
                className="w-full max-h-96 object-cover"
              />
            </div>
          </WaveBorderCard>
        )}

        {/* ===== معاينة أو تحميل الملف مع Wave Border ===== */}
        <WaveBorderCard initialColor={previewColor.name} onColorChange={setPreviewColor}>
          <div className="rounded-3xl overflow-hidden">
            {isPreviewable ? (
              <iframe
                src={previewUrl}
                className="w-full h-[80vh]"
                title={book.title}
                frameBorder="0"
                allowFullScreen
              />
            ) : (
              <div className={`p-12 text-center ${styles.card}`}>
                <Icons.FileText className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                <p className={`text-xl ${styles.text} mb-4`}>
                  {language === 'ar'
                    ? 'المحتوى غير متاح للمعاينة'
                    : 'Content not available for preview'}
                </p>
                {downloadUrl && (
                  <button
                    onClick={handleDownload}
                    className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-lg rounded-xl hover:scale-105 transition shadow-2xl shadow-yellow-400/30"
                  >
                    {language === 'ar' ? 'تحميل الملف' : 'Download File'}
                  </button>
                )}
              </div>
            )}
          </div>
        </WaveBorderCard>

        {/* ===== روابط سريعة للتنقل ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[
            { href: '/dashboard/student', icon: Icons.Home, label: language === 'ar' ? 'الرئيسية' : 'Home' },
            { href: '/dashboard/student/courses', icon: Icons.Book, label: language === 'ar' ? 'الكورسات' : 'Courses' },
            { href: '/dashboard/student/books', icon: Icons.BookOpen, label: language === 'ar' ? 'الكتب' : 'Books' },
            { href: '/dashboard/student/profile', icon: Icons.User, label: language === 'ar' ? 'حسابي' : 'Profile' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
            >
              <item.icon className="h-6 w-6 text-blue-500 group-hover:scale-110 transition" />
              <span className={`text-xs font-bold ${styles.text}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}