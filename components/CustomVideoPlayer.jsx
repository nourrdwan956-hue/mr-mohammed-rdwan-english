// ============================================================
// components/CustomVideoPlayer.jsx
// مشغل فيديو مخصص – النسخة المُصلحة V2
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import * as Icons from 'lucide-react';

export default function CustomVideoPlayer({ src, title, userData }) {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [player, setPlayer] = useState(null);

  // تحميل Plyr ديناميكياً (لتجنب مشاكل SSR)
  useEffect(() => {
    let plyrInstance = null;
    let isMounted = true;

    const loadPlyr = async () => {
      if (!videoRef.current || !src) return;

      try {
        // تحميل Plyr ديناميكياً
        const Plyr = (await import('plyr')).default;
        await import('plyr/dist/plyr.css');

        if (!isMounted) return;

        plyrInstance = new Plyr(videoRef.current, {
          controls: [
            'play',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'settings',
            'fullscreen',
          ],
          settings: ['speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          autoplay: false,
          tooltips: { controls: false, seek: true },
          keyboard: { focused: true, global: false },
          i18n: {
            restart: 'إعادة التشغيل',
            play: 'تشغيل',
            pause: 'إيقاف',
            currentTime: 'الوقت الحالي',
            duration: 'المدة',
            volume: 'مستوى الصوت',
            mute: 'كتم الصوت',
            unmute: 'إلغاء الكتم',
            settings: 'الإعدادات',
            speed: 'السرعة',
            normal: 'عادي',
            fullscreen: 'ملء الشاشة',
            exitFullscreen: 'الخروج من ملء الشاشة',
          },
        });

        if (isMounted) {
          setPlayer(plyrInstance);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading Plyr:', err);
        if (isMounted) {
          setError('فشل تحميل مشغل الفيديو');
          setIsLoading(false);
        }
      }
    };

    loadPlyr();

    return () => {
      isMounted = false;
      if (plyrInstance) {
        plyrInstance.destroy();
      }
    };
  }, [src]);

  // تحديث المصدر عند تغير الرابط
  useEffect(() => {
    if (player && src) {
      try {
        player.source = {
          type: 'video',
          sources: [{ src, type: 'video/mp4' }],
        };
      } catch (err) {
        console.error('Error setting video source:', err);
        setError('فشل تحميل الفيديو');
      }
    }
  }, [src, player]);

  // منع النقر الأيمن
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    const video = videoRef.current;
    if (video) {
      video.addEventListener('contextmenu', handleContextMenu);
    }
    return () => {
      if (video) {
        video.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="aspect-video bg-black rounded-2xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Icons.AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>{error}</p>
          <p className="text-xs text-gray-500 mt-2">يرجى المحاولة مرة أخرى</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-yellow-400/10 border border-white/10">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">جاري تحميل الفيديو...</p>
          </div>
        </div>
      )}

      {/* عنصر الفيديو */}
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        crossOrigin="anonymous"
        preload="metadata"
        onError={() => {
          setError('حدث خطأ أثناء تحميل الفيديو');
          setIsLoading(false);
        }}
        onLoadedData={() => setIsLoading(false)}
      >
        <source src={src} type="video/mp4" />
        متصفحك لا يدعم تشغيل الفيديو.
      </video>

      {/* بصمة مائية */}
      <div className="absolute inset-0 pointer-events-none select-none z-10 flex items-center justify-center opacity-10">
        <div className="text-4xl font-bold text-white transform -rotate-12">
          {userData?.name || 'طالب'}
        </div>
      </div>
      <div className="absolute bottom-4 right-4 pointer-events-none select-none z-10 text-white/20 text-xs font-mono">
        {userData?.name || ''} | {userData?.phone || ''}
      </div>
    </div>
  );
}