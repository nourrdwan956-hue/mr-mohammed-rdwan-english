'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import WatermarkOverlay from './WatermarkOverlay';

// استيراد react-player بطريقة ديناميكية (بدون SSR)
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function VideoPlayer({ videoId, studentId, courseId, userId, onProgressUpdate }) {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const updateIntervalRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const playerRef = useRef(null);

  if (!videoId) return <p className="text-gray-400">لا يوجد فيديو</p>;

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // ================================================================
  // دالة تحديث وقت المشاهدة في قاعدة البيانات
  // ================================================================
  const updateWatchTime = useCallback(async (seconds, force = false) => {
    // منع التحديث المتزامن
    if (isUpdatingRef.current) return;
    
    // إذا لم يتم توفير studentId أو userId، لا نقوم بالتحديث
    if (!studentId && !userId) return;
    
    const student_id = studentId || userId;
    if (!student_id) return;

    // منع التحديث المتكرر (كل 10 ثوانٍ على الأقل ما لم يكن force = true)
    if (!force && (seconds - lastUpdateTime < 10)) {
      return;
    }

    isUpdatingRef.current = true;

    try {
      // حساب النسبة المئوية
      const percent = duration > 0 ? Math.min((seconds / duration) * 100, 100) : 0;
      const watchedSecondsInt = Math.floor(Math.min(seconds, duration));
      const progressInt = Math.round(percent);
      const completed = percent >= 90;

      // تحديث قاعدة البيانات
      const { error } = await supabase
        .from('watch_history')
        .upsert({
          student_id: student_id,
          video_id: videoId,
          watched_seconds: watchedSecondsInt,
          progress: progressInt,
          completed: completed,
          watched_at: new Date().toISOString(),
        }, {
          onConflict: 'student_id, video_id'
        });

      if (error) {
        console.error('❌ خطأ في تحديث watch_history:', error);
      } else {
        setLastUpdateTime(seconds);
        // استدعاء دالة التحديث من الأب إذا وجدت
        if (onProgressUpdate) {
          onProgressUpdate({
            videoId,
            watchedSeconds: watchedSecondsInt,
            progress: progressInt,
            completed,
          });
        }
      }
    } catch (err) {
      console.error('⚠️ خطأ غير متوقع في updateWatchTime:', err);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [videoId, studentId, userId, duration, lastUpdateTime, onProgressUpdate]);

  // ================================================================
  // دوال react-player
  // ================================================================
  const handleReady = (playerInstance) => {
    console.log('✅ مشغل الفيديو جاهز');
    setPlayer(playerInstance);
    playerRef.current = playerInstance;
    
    // بدء التتبع بعد 3 ثوانٍ
    setTimeout(() => {
      if (playerRef.current && isPlaying) {
        const currentSeconds = playerRef.current.getCurrentTime() || 0;
        updateWatchTime(currentSeconds, true);
      }
    }, 3000);

    // تحديث التقدم كل 10 ثوانٍ أثناء التشغيل
    if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    updateIntervalRef.current = setInterval(() => {
      if (playerRef.current && isPlaying) {
        const currentSeconds = playerRef.current.getCurrentTime() || 0;
        updateWatchTime(currentSeconds);
      }
    }, 10000);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    // تحديث فوري عند بدء التشغيل
    setTimeout(() => {
      if (playerRef.current) {
        const currentSeconds = playerRef.current.getCurrentTime() || 0;
        updateWatchTime(currentSeconds, true);
      }
    }, 1000);
  };

  const handlePause = () => {
    setIsPlaying(false);
    // تحديث عند الإيقاف المؤقت
    if (playerRef.current) {
      const currentSeconds = playerRef.current.getCurrentTime() || 0;
      updateWatchTime(currentSeconds, true);
    }
  };

  const handleSeek = (seconds) => {
    // تحديث عند التخطي
    setTimeout(() => {
      if (playerRef.current) {
        const currentSeconds = playerRef.current.getCurrentTime() || 0;
        updateWatchTime(currentSeconds, true);
      }
    }, 500);
  };

  const handleProgress = (state) => {
    setPlayedSeconds(state.playedSeconds);
    // تحديث التقدم في الوقت الفعلي (نستخدمه فقط لتحديث الواجهة)
    // التحديث الفعلي لقاعدة البيانات يتم عبر setInterval
  };

  const handleDuration = (durationSeconds) => {
    setDuration(durationSeconds);
  };

  const handleEnded = () => {
    // تحديث فوري عند انتهاء الفيديو
    if (playerRef.current) {
      const currentSeconds = playerRef.current.getCurrentTime() || duration;
      updateWatchTime(currentSeconds, true);
    }
    setIsPlaying(false);
  };

  // تنظيف المؤقتات عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return (
    <WatermarkOverlay>
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-yellow-400/10 aspect-video relative bg-black">
        <ReactPlayer
          ref={playerRef}
          url={youtubeUrl}
          playing={false} // تشغيل يدوي
          muted={false}
          controls={true}
          width="100%"
          height="100%"
          config={{
            youtube: {
              playerVars: {
                modestbranding: 1, // إخفاء شعار يوتيوب
                rel: 0, // إخفاء الفيديوهات المقترحة
                showinfo: 0, // إخفاء معلومات الفيديو
                iv_load_policy: 3, // إخفاء الإعلانات الداخلية
                controls: 1, // عرض عناصر التحكم
                disablekb: 0, // السماح باختصارات لوحة المفاتيح
                playsinline: 1, // تشغيل داخل الصفحة
                origin: typeof window !== 'undefined' ? window.location.origin : '',
                widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
                autoplay: 0,
                mute: 0,
                cc_load_policy: 0,
                autohide: 1, // إخفاء عناصر التحكم تلقائياً
              },
            },
          }}
          onReady={handleReady}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onProgress={handleProgress}
          onDuration={handleDuration}
          onEnded={handleEnded}
          onError={(e) => console.error('Video error:', e)}
        />
        
        {/* CSS إضافي لإخفاء عناصر يوتيوب بشكل كامل */}
        <style jsx>{`
          .react-player iframe {
            pointer-events: auto !important;
          }
          /* إخفاء أي عناصر طافية من يوتيوب */
          .react-player iframe + * {
            display: none !important;
          }
        `}</style>
        
        {/* طبقة CSS إضافية لإخفاء عناصر يوتيوب المتبقية */}
        <style dangerouslySetInnerHTML={{
          __html: `
            #youtube-player iframe {
              pointer-events: auto !important;
            }
            .ytp-logo, .ytp-logo-link { display: none !important; }
            .ytp-subscribe-button, .ytp-subscribe-button-container { display: none !important; }
            .ytp-watch-on-youtube, .ytp-watch-on-youtube-link { display: none !important; }
            .ytp-panel-header, .ytp-panel-menu, .ytp-panel { display: none !important; }
            .ytp-tooltip, .ytp-tooltip-text-wrapper { display: none !important; }
            .ytp-iv-player-content, .ytp-cards-teaser, .ytp-ce-element { display: none !important; }
            .ytp-watermark { display: none !important; }
            .ytp-chrome-top, .ytp-chrome-bottom { display: block !important; }
          `
        }} />
      </div>
    </WatermarkOverlay>
  );
}