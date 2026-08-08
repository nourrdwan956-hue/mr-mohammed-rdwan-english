// ================================================================
// 📁 المسار: app/watch/[id]/page.js
// ✅ إصلاح نهائي: سلوك YouTube بالضبط (الزر المركزي + الشريط السفلي)
// ✅ عند التشغيل → كل شيء يختفي بعد 2.5 ثانية
// ✅ عند الإيقاف → الزر المركزي يظهر فوراً والأزرار تبقى ظاهرة
// ✅ عند التفاعل (ماوس/لمس) → تظهر الأزرار، ثم تختفي بعد 2.5 ثانية لو الفيديو شغال
// ================================================================

'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import * as Icons from 'lucide-react';
import { checkCourseAccess } from '@/lib/course-access';
import { useTheme } from '@/lib/hooks/useTheme';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

// ================================================================
// 0. دالة دمج الفترات الزمنية (Utility)
// ================================================================
function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= prev[1]) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

// ================================================================
// 1. دوال مساعدة
// ================================================================
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeDetailed = (seconds) => {
  if (!seconds || isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getYoutubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&?]+)/,
    /(?:youtu\.be\/)([^&?]+)/,
    /(?:youtube\.com\/embed\/)([^&?]+)/,
    /(?:youtube\.com\/v\/)([^&?]+)/,
    /(?:youtube\.com\/shorts\/)([^&?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) return url[1];
  return null;
};

const parseDurationToSeconds = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

// ================================================================
// 2. ألوان البطاقات (نظام Wave Border)
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
// 3. مكون Wave Border
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
// 4. خلفية متحركة فاخرة
// ================================================================
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a10] via-[#0b0e1a] to-[#0a0a10]" />
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="absolute top-0 right-0 w-[800px] h-[800px] bg-yellow-500/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ x: ['0%', '3%', '0%'], y: ['0%', '3%', '0%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl"
      />
      <div className="absolute inset-0 opacity-20">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
              y: [Math.random() * 100 - 50, Math.random() * 100 - 50],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 10 + Math.random() * 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute w-1 h-1 bg-yellow-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ================================================================
// 5. مكون تايمر تفاعلي
// ================================================================
const InteractiveTimer = ({ currentTime, duration, progress }) => {
  const [mode, setMode] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => setMode((prev) => (prev + 1) % 3);

  const getDisplayText = () => {
    const remaining = Math.max(0, duration - currentTime);
    const watchedPercent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    switch (mode) {
      case 0: return `-${formatTime(remaining)}`;
      case 1: return `${watchedPercent}%`;
      case 2: return formatTime(currentTime);
      default: return formatTime(currentTime);
    }
  };

  const getIcon = () => {
    switch (mode) {
      case 0: return <Icons.Clock className="h-3 w-3" />;
      case 1: return <Icons.PieChart className="h-3 w-3" />;
      case 2: return <Icons.Play className="h-3 w-3" />;
      default: return <Icons.Clock className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      className="flex items-center gap-1.5 cursor-pointer select-none group relative"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      title={mode === 0 ? 'المدة المتبقية' : mode === 1 ? 'نسبة المشاهدة' : 'المدة المشاهدة'}
    >
      <motion.span animate={{ rotate: isHovered ? 15 : 0 }} transition={{ duration: 0.2 }} className="text-yellow-400">
        {getIcon()}
      </motion.span>
      <motion.span
        className="text-[10px] sm:text-xs font-mono font-bold text-white/90 hover:text-yellow-400 transition-colors"
        animate={{ color: isHovered ? '#FACC15' : 'rgba(255,255,255,0.9)' }}
      >
        {getDisplayText()}
      </motion.span>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isHovered ? 1 : 0 }}
        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-yellow-400/50 rounded-full origin-left"
      />
    </motion.div>
  );
};

// ================================================================
// 6. دالة مساعدة لتوليد لون متدرج حسب النسبة المئوية
// ================================================================
const getGradientColor = (percent) => {
  if (percent <= 0.33) {
    const t = percent / 0.33;
    const r = 255;
    const g = Math.round(255 * t);
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else if (percent <= 0.66) {
    const t = (percent - 0.33) / 0.33;
    const r = Math.round(255 * (1 - t));
    const g = 255;
    const b = 0;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (percent - 0.66) / 0.34;
    const r = 0;
    const g = 255;
    const b = Math.round(255 * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// ================================================================
// 7. المكون الرئيسي للصفحة
// ================================================================
export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { theme, styles, language } = useTheme();
  const isDark = theme === 'dark';

  // ---- حالات البيانات ----
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState('');

  // ---- شاشة البداية ----
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // ---- حالات المشغل ----
  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [bufferProgress, setBufferProgress] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showCenterButton, setShowCenterButton] = useState(true);

  // ---- كشف الموبايل ----
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ===== نظام التتبع الذكي =====
  const [watchIntervals, setWatchIntervals] = useState([]);
  const [totalWatchedUnique, setTotalWatchedUnique] = useState(0);
  const lastSaveTimeRef = useRef(Date.now());
  const saveIntervalRef = useRef(null);

  // ---- المراجع ----
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const progressRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const isPlayingRef = useRef(false);

  // ---- استخراج معلومات YouTube ----
  const youtubeId = useMemo(() => (video ? getYoutubeId(video.video_url) : null), [video]);
  const isValidYoutube = youtubeId !== null;
  const displayMode = video?.display_mode || 'platform';
  const isYoutubeOnly = displayMode === 'youtube';

  // ================================================================
  // 7. التوجيه إلى YouTube إذا كان الوضع 'youtube'
  // ================================================================
  useEffect(() => {
    if (!video || !isValidYoutube) return;
    if (isYoutubeOnly) {
      window.location.href = `https://www.youtube.com/watch?v=${youtubeId}`;
    }
  }, [video, isValidYoutube, isYoutubeOnly, youtubeId]);

  // ================================================================
  // 8. جلب البيانات الأساسية + تاريخ المشاهدة
  // ================================================================
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const fingerprint = await getDeviceFingerprint();
        console.log('🖥️ Device fingerprint:', fingerprint);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          setUserRole(profile?.role || 'student');
        }

        const { data, error } = await supabase.from('videos').select('*').eq('id', id).single();
        if (error) throw error;
        if (!data) throw new Error('الفيديو غير موجود');

        if (user && data.course_id) {
          const { data: course, error: courseError } = await supabase
            .from('courses')
            .select('is_free, price, max_devices')
            .eq('id', data.course_id)
            .single();

          if (!courseError && course && !course.is_free && course.price > 0) {
            const accessResult = await checkCourseAccess(data.course_id, user.id);
            console.log('🔍 Access check result:', accessResult);

            if (!accessResult.allowed) {
              setAccessDenied(true);
              setAccessReason(accessResult.reason);
              setLoading(false);
              
              if (accessResult.reason === 'no_subscription') {
                toast.error('هذا الكورس مدفوع، يرجى الاشتراك أولاً');
              } else if (accessResult.reason === 'max_devices') {
                const maxDev = accessResult.maxDevices || 2;
                toast.error(`تم تجاوز الحد الأقصى للأجهزة (${maxDev})، هذا الجهاز غير مسموح. يرجى حذف جهاز آخر من صفحة إدارة الأجهزة.`);
              } else if (accessResult.reason === 'expired') {
                toast.error('انتهت صلاحية اشتراكك في هذا الكورس');
              } else {
                toast.error('لا يمكنك الوصول إلى هذا الفيديو');
              }
              return;
            }
          }
        }

        setVideo(data);

        if (data.display_mode === 'youtube') {
          setLoading(false);
          return;
        }

        await supabase.from('videos').update({ views: (data.views || 0) + 1 }).eq('id', id);

        if (!getYoutubeId(data.video_url)) {
          setError('رابط YouTube غير صحيح');
          setLoading(false);
          return;
        }

        if (data.duration) {
          const parsed = parseDurationToSeconds(data.duration);
          if (parsed > 0) setDuration(parsed);
        }

        if (data?.id && user?.id) {
          const { data: history, error: historyError } = await supabase
            .from('watch_history')
            .select('intervals, watched_seconds')
            .eq('video_id', data.id)
            .eq('student_id', user.id)
            .maybeSingle();

          if (!historyError && history?.intervals && Array.isArray(history.intervals)) {
            const validIntervals = history.intervals.filter(
              (interval) => Array.isArray(interval) && interval.length === 2 && typeof interval[0] === 'number' && typeof interval[1] === 'number'
            );
            if (validIntervals.length > 0) {
              const merged = mergeIntervals(validIntervals);
              setWatchIntervals(merged);
              const total = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
              setTotalWatchedUnique(total);
            }
          }
        }

        const started = sessionStorage.getItem(`watch_started_${id}`) === 'true';
        if (!started) setShowIntro(true);
        else setShowIntro(false);
        setIntroChecked(true);

      } catch (err) {
        setError(err.message);
        toast.error('فشل تحميل الفيديو');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ================================================================
  // 9. دالة بدء المشاهدة
  // ================================================================
  const handleStartWatching = () => {
    sessionStorage.setItem(`watch_started_${id}`, 'true');
    window.location.reload();
  };

  // ================================================================
  // 10. إنشاء مشغل YouTube (مع منع تفاعل المستخدم مع عناصر YouTube)
  // ================================================================
  useEffect(() => {
    if (isYoutubeOnly || !isValidYoutube || !video) return;
    if (showIntro) return;

    let playerInstance = null;
    let cancelled = false;
    let retries = 0;
    const maxRetries = 10;

    const createPlayer = () => {
      if (cancelled || playerInstance) return;

      const container = document.getElementById('youtube-player');
      if (!container) {
        if (retries < maxRetries) {
          retries++;
          setTimeout(createPlayer, 500);
          return;
        }
        setPlayerError(true);
        setPlayerLoading(false);
        return;
      }

      if (!window.YT || !window.YT.Player) {
        if (retries < maxRetries) {
          retries++;
          setTimeout(createPlayer, 500);
          return;
        }
        setPlayerError(true);
        setPlayerLoading(false);
        return;
      }

      try {
        const originUrl = window.location.origin;

        playerInstance = new window.YT.Player('youtube-player', {
          videoId: youtubeId,
          playerVars: {
            modestbranding: 1,
            showinfo: 0,
            rel: 0,
            iv_load_policy: 3,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            autoplay: 0,
            mute: 0,
            cc_load_policy: 0,
            autohide: 1,
            origin: originUrl,
            widget_referrer: originUrl,
          },
          events: {
            onReady: () => {
              setPlayerReady(true);
              setPlayerError(false);
              setPlayerLoading(false);
              if (playerInstance) {
                const dur = playerInstance.getDuration();
                if (dur > 0) setDuration(dur);
              }
              console.log('✅ YouTube Player ready');
              startProgressTracking();
            },
            onStateChange: (e) => {
              if (e.data === 1) {
                // ▶️ تشغيل
                setIsPlaying(true);
                isPlayingRef.current = true;
                setBuffering(false);
                setShowCenterButton(false);
                clearTimeout(controlsTimerRef.current);
                controlsTimerRef.current = setTimeout(() => {
                  if (isPlayingRef.current) {
                    setControlsVisible(false);
                  }
                }, 2500);
              } else if (e.data === 2) {
                // ⏸️ إيقاف مؤقت
                clearTimeout(controlsTimerRef.current); // مهم جداً
                setIsPlaying(false);
                isPlayingRef.current = false;
                setShowCenterButton(true);
                setControlsVisible(true);
              } else if (e.data === 3) {
                setBuffering(true);
              } else if (e.data === 0) {
                // 🏁 انتهى الفيديو
                clearTimeout(controlsTimerRef.current);
                setIsPlaying(false);
                isPlayingRef.current = false;
                setBuffering(false);
                setShowCenterButton(true);
                setControlsVisible(true);
              }
            },
            onError: (e) => {
              console.error('YouTube Player error:', e);
              setPlayerError(true);
              setPlayerReady(false);
              setPlayerLoading(false);
              let msg = 'خطأ في تشغيل الفيديو';
              if (e.data === 2) msg = 'معرف الفيديو غير صحيح';
              else if (e.data === 5) msg = 'الطلب غير صالح';
              else if (e.data === 100) msg = 'الفيديو غير متاح';
              else if (e.data === 101 || e.data === 150) msg = 'تم حظر الفيديو';
              toast.error(msg);
            },
          },
        });
        playerRef.current = playerInstance;
      } catch (error) {
        console.error('Error creating YouTube player:', error);
        setPlayerError(true);
        setPlayerLoading(false);
      }
    };

    const startProgressTracking = () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = setInterval(() => {
        const player = playerRef.current;
        if (player && playerReady && typeof player.getCurrentTime === 'function') {
          try {
            const current = player.getCurrentTime() || 0;
            const total = player.getDuration() || 0;
            if (total > 0) {
              setCurrentTime(current);
              setDuration(total);
              setProgress((current / total) * 100);
            }
          } catch (e) {}
        }
      }, 200);
    };

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }

      if (document.querySelector('#youtube-iframe-api')) {
        const check = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(check);
            createPlayer();
          }
        }, 300);
        setTimeout(() => clearInterval(check), 10000);
        return;
      }

      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.onload = () => {
        setTimeout(() => {
          if (window.YT && window.YT.Player) {
            createPlayer();
          }
        }, 500);
      };
      script.onerror = () => {
        setPlayerError(true);
        setPlayerLoading(false);
        toast.error('فشل تحميل مشغل الفيديو');
      };
      document.body.appendChild(script);
    };

    loadAPI();

    return () => {
      cancelled = true;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      clearTimeout(controlsTimerRef.current);
      if (playerInstance) {
        try { playerInstance.destroy(); } catch (e) {}
      }
      playerRef.current = null;
    };
  }, [isYoutubeOnly, isValidYoutube, youtubeId, video, id, showIntro, playerReady]);

  // ================================================================
  // 11. دوال التحكم (المعدلة لحل مشكلة الزر المركزي)
  // ================================================================

  const togglePlay = useCallback(() => {
    if (!playerRef.current || !playerReady) {
      toast.error('المشغل غير جاهز');
      return;
    }

    try {
      const player = playerRef.current;
      const state = player.getPlayerState();

      // ✅ نمسح أي تايمر قديم أولاً
      clearTimeout(controlsTimerRef.current);

      if (state === 1 || state === 3) {
        // 🟡 إيقاف الفيديو
        player.pauseVideo();
        setIsPlaying(false);
        isPlayingRef.current = false;
        setShowCenterButton(true);   // ⭐ نظهر الزر المركزي
        setControlsVisible(true);    // ⭐ نظهر الأزرار كلها
        // منحطش تايمر عشان الأزرار تفضل ظاهرة (الفيديو واقف)
      } else {
        // ▶️ تشغيل الفيديو
        const doPlay = () => {
          player.playVideo();
          setIsPlaying(true);
          isPlayingRef.current = true;
          setShowCenterButton(false); // نخفي الزر المركزي
          setControlsVisible(true);    // نضهر الأزرار

          // بعد 2.5 ثانية نخفي الأزرار لو الفيديو لسه شغال
          controlsTimerRef.current = setTimeout(() => {
            if (isPlayingRef.current) {
              setControlsVisible(false);
            }
          }, 2500);
        };

        if (isMobile) {
          setTimeout(doPlay, 100);
        } else {
          doPlay();
        }
      }
    } catch (error) {
      console.error('TogglePlay error:', error);
      toast.error('تعذر تشغيل الفيديو');
    }
  }, [playerReady, isMobile]);

  const skipForward = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    try {
      const player = playerRef.current;
      const current = player.getCurrentTime();
      const total = player.getDuration();
      const newTime = Math.min(current + 10, total);
      player.seekTo(newTime, true);
      setControlsVisible(true);
      clearTimeout(controlsTimerRef.current);
      if (isPlayingRef.current) {
        controlsTimerRef.current = setTimeout(() => {
          if (isPlayingRef.current) setControlsVisible(false);
        }, 2500);
      }
    } catch (e) {
      console.warn('Skip forward error:', e);
    }
  }, [playerReady]);

  const skipBackward = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    try {
      const player = playerRef.current;
      const current = player.getCurrentTime();
      const newTime = Math.max(0, current - 10);
      player.seekTo(newTime, true);
      setControlsVisible(true);
      clearTimeout(controlsTimerRef.current);
      if (isPlayingRef.current) {
        controlsTimerRef.current = setTimeout(() => {
          if (isPlayingRef.current) setControlsVisible(false);
        }, 2500);
      }
    } catch (e) {
      console.warn('Skip backward error:', e);
    }
  }, [playerReady]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    try {
      const player = playerRef.current;
      if (muted) {
        player.unMute();
        setMuted(false);
      } else {
        player.mute();
        setMuted(true);
      }
    } catch (e) {}
  }, [playerReady, muted]);

  const handleVolumeChange = useCallback((e) => {
    if (!playerRef.current || !playerReady) return;
    try {
      const val = parseFloat(e.target.value);
      setVolume(val);
      const player = playerRef.current;
      player.setVolume(val * 100);
      setMuted(val === 0);
    } catch (e) {}
  }, [playerReady]);

  const handleProgressClick = useCallback((e) => {
    if (!playerRef.current || !playerReady || !progressRef.current) return;
    try {
      const rect = progressRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = (x / rect.width) * 100;
      const player = playerRef.current;
      const total = player.getDuration();
      if (total > 0) {
        const target = (percent / 100) * total;
        player.seekTo(target, true);
        setProgress(percent);
        setCurrentTime(target);
        setControlsVisible(true);
        clearTimeout(controlsTimerRef.current);
        if (isPlayingRef.current) {
          controlsTimerRef.current = setTimeout(() => {
            if (isPlayingRef.current) setControlsVisible(false);
          }, 2500);
        }
      }
    } catch (e) {}
  }, [playerReady]);

  const changePlaybackRate = useCallback((rate) => {
    if (!playerRef.current || !playerReady) return;
    try {
      const player = playerRef.current;
      player.setPlaybackRate(rate);
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      toast.success(`سرعة التشغيل: ${rate}x`);
    } catch (e) { toast.error('تعذر تغيير السرعة'); }
  }, [playerReady]);

  const changeQuality = useCallback((quality) => {
    if (!playerRef.current || !playerReady) return;
    try {
      const player = playerRef.current;
      player.setPlaybackQuality(quality);
      setCurrentQuality(quality);
      setShowQualityMenu(false);
      toast.success(`الجودة: ${quality}`);
    } catch (e) { toast.error('تعذر تغيير الجودة'); }
  }, [playerReady]);

  const toggleFullscreen = useCallback(() => {
    if (isYoutubeOnly) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    } catch (e) {}
  }, [isYoutubeOnly]);

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => {
      const newState = !prev;
      toast.success(newState ? '🎯 وضع التركيز نشط' : 'تم إلغاء وضع التركيز');
      return newState;
    });
  }, []);

  const toggleCaptions = useCallback(() => {
    if (!playerRef.current || !playerReady) {
      toast.error(language === 'ar' ? 'المشغل غير جاهز' : 'Player not ready');
      return;
    }
    try {
      const player = playerRef.current;
      if (captionsEnabled) {
        player.setOption('captions', 'track', { languageCode: '' });
        setCaptionsEnabled(false);
        toast.success(language === 'ar' ? '✅ تم إيقاف الترجمة' : '✅ Captions disabled');
      } else {
        player.loadModule('captions');
        setTimeout(() => {
          try {
            player.setOption('captions', 'track', {});
            setCaptionsEnabled(true);
            toast.success(language === 'ar' ? '✅ تم إظهار الترجمة' : '✅ Captions enabled');
          } catch (innerErr) {
            console.error('Failed to show captions:', innerErr);
            toast.error(language === 'ar' ? 'تعذر إظهار الترجمة' : 'Could not show captions');
          }
        }, 300);
      }
    } catch (e) {
      toast.error(language === 'ar' ? 'فشل التحكم بالترجمة' : 'Failed to toggle captions');
      console.error('Captions toggle error:', e);
    }
  }, [playerReady, captionsEnabled, language]);

  // ================================================================
  // 12. تأثير إخفاء الأزرار تلقائياً (مع دعم الموبايل)
  // ================================================================
  useEffect(() => {
    if (isYoutubeOnly) return;

    const handleMouseMove = () => {
      setControlsVisible(true);
      clearTimeout(controlsTimerRef.current);
      if (isPlayingRef.current) {
        controlsTimerRef.current = setTimeout(() => {
          if (isPlayingRef.current) setControlsVisible(false);
        }, 2500);
      }
    };

    const handleMouseLeave = () => {
      if (isPlayingRef.current) {
        setControlsVisible(false);
        clearTimeout(controlsTimerRef.current);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
      clearTimeout(controlsTimerRef.current);
    };
  }, [isYoutubeOnly]);

  // ================================================================
  // 13. حماية ضد تسريب الفيديو
  // ================================================================
  useEffect(() => {
    if (isYoutubeOnly) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error('🚫 النقر الأيمن غير متاح');
    };

    const handleKeyDown = (e) => {
      const forbiddenCombos = [
        e.ctrlKey && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U'),
        e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'N'),
        e.metaKey && e.altKey && e.key === 'i',
        e.key === 'F12',
        e.key === 'PrintScreen',
        e.ctrlKey && e.key === 'p',
      ];
      if (forbiddenCombos.some(combo => combo)) {
        e.preventDefault();
        toast.error('🚫 هذه الميزة غير متاحة');
      }
    };

    const handleDragStart = (e) => e.preventDefault();

    const container = containerRef.current;
    if (container) {
      container.addEventListener('contextmenu', handleContextMenu);
      container.addEventListener('dragstart', handleDragStart);
    }
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (container) {
        container.removeEventListener('contextmenu', handleContextMenu);
        container.removeEventListener('dragstart', handleDragStart);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isYoutubeOnly]);

  // ================================================================
  // 14. اختصارات لوحة المفاتيح
  // ================================================================
  useEffect(() => {
    if (isYoutubeOnly) return;
    const handleKey = (e) => {
      if (!playerRef.current || !playerReady) return;
      if (e.target.tagName === 'INPUT' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey) return;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': e.preventDefault(); skipForward(); break;
        case 'ArrowLeft': e.preventDefault(); skipBackward(); break;
        case 'm': case 'M': toggleMute(); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'z': case 'Z': toggleFocusMode(); break;
        case 'c': case 'C': e.preventDefault(); toggleCaptions(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playerReady, togglePlay, skipForward, skipBackward, toggleMute, toggleFullscreen, toggleFocusMode, toggleCaptions, isYoutubeOnly]);

  // ================================================================
  // 15. نظام التتبع الذكي للمشاهدة
  // ================================================================

  // 15.1 تتبع التقدم الحقيقي
  useEffect(() => {
    if (!playerReady || !isPlaying || !playerRef.current) return;

    let lastTime = 0;
    try {
      const player = playerRef.current;
      if (typeof player.getCurrentTime === 'function') {
        lastTime = player.getCurrentTime() || 0;
      } else {
        return;
      }
    } catch (e) {
      return;
    }

    const interval = setInterval(() => {
      try {
        const player = playerRef.current;
        if (!player || !playerReady || !isPlayingRef.current) return;
        if (typeof player.getCurrentTime !== 'function') return;

        const now = player.getCurrentTime();
        const delta = now - lastTime;
        if (delta > 0 && delta <= 2.0) {
          setWatchIntervals(prev => {
            const newInterval = [lastTime, now];
            const merged = mergeIntervals([...prev, newInterval]);
            const unique = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
            setTotalWatchedUnique(unique);
            return merged;
          });
        }
        lastTime = now;
      } catch (e) {}
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, playerReady]);

  // 15.2 الحفظ الدوري الصامت
  useEffect(() => {
    if (!video?.id || !playerReady) return;

    const saveProgress = async () => {
      if (watchIntervals.length === 0) return;
      try {
        const watchedSeconds = totalWatchedUnique;
        const duration = playerRef.current?.getDuration?.() || 0;
        const progress = duration > 0 ? (watchedSeconds / duration) * 100 : 0;

        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        if (accessToken) {
          await fetch('/api/watch-progress', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              videoId: video.id,
              courseId: video.course_id || null,
              intervals: watchIntervals,
              watchedSeconds,
              progress: Math.min(progress, 100),
            }),
            keepalive: true,
          }).catch(() => {});
        }
        lastSaveTimeRef.current = Date.now();
      } catch (e) {}
    };

    const initialTimeout = setTimeout(saveProgress, 5000);
    saveIntervalRef.current = setInterval(saveProgress, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(saveIntervalRef.current);
    };
  }, [video?.id, playerReady, watchIntervals, totalWatchedUnique]);

  // 15.3 الحفظ عند الخروج
  useEffect(() => {
    const handleExit = () => {
      if (!video?.id || watchIntervals.length === 0) return;
      const watchedSeconds = totalWatchedUnique;
      const duration = playerRef.current?.getDuration?.() || 0;
      const progress = duration > 0 ? (watchedSeconds / duration) * 100 : 0;
      const payload = {
        videoId: video.id,
        courseId: video.course_id || null,
        intervals: watchIntervals,
        watchedSeconds,
        progress: Math.min(progress, 100),
      };

      supabase.auth.getSession().then(({ data: { session } }) => {
        const accessToken = session?.access_token;
        const headers = {
          'Content-Type': 'application/json',
        };
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
        fetch('/api/watch-progress', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      });
    };

    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);
    return () => {
      window.removeEventListener('beforeunload', handleExit);
      window.removeEventListener('pagehide', handleExit);
    };
  }, [video?.id, watchIntervals, totalWatchedUnique]);

  // ================================================================
  // 16. عرض الصفحة
  // ================================================================

  if (isYoutubeOnly) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-yellow-400/80 text-sm font-medium">جاري التوجيه إلى YouTube...</p>
        </div>
      </div>
    );
  }

  if (showIntro && introChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 max-w-2xl w-full mx-4">
          <WaveBorderCard initialColor="yellow" className="shadow-2xl shadow-yellow-400/20">
            <div className="p-8 md:p-12 text-center">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-yellow-400/20 flex items-center justify-center border-4 border-yellow-400/30">
                  <Icons.Play className="h-12 w-12 text-yellow-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
                  {language === 'ar' ? '📖 استعن بالله وابدأ' : 'Start Learning'}
                </h1>
                <p className="text-lg text-gray-300 mb-6">
                  {language === 'ar' ? 'أنت على وشك مشاهدة' : 'You are about to watch'}:
                </p>
                <p className="text-2xl font-bold text-yellow-400 mb-8 line-clamp-2">
                  {video?.title || ''}
                </p>
                <button
                  onClick={handleStartWatching}
                  className="px-10 py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-2xl text-lg hover:scale-105 transition shadow-2xl shadow-yellow-400/30 flex items-center gap-3 mx-auto"
                >
                  <Icons.Play className="h-6 w-6" />
                  {language === 'ar' ? 'ابدأ الآن 🚀' : 'Start Now 🚀'}
                </button>
                <p className="text-xs text-gray-400 mt-6">
                  {language === 'ar' ? 'سيتم فتح المشغل فوراً بعد الضغط' : 'The player will open immediately after clicking'}
                </p>
              </motion.div>
            </div>
          </WaveBorderCard>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        <p className="text-yellow-400/80 text-sm font-medium">جاري تحميل الفيديو...</p>
      </div>
    </div>
  );

  if (error || !video) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] text-red-400 p-4">
      <div className="text-center max-w-md">
        <Icons.AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <p className="text-lg">{error || 'غير موجود'}</p>
        <Link href={userRole === 'teacher' ? '/dashboard/teacher/videos' : '/dashboard/student/videos'} className="mt-4 inline-block px-6 py-2 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition">
          العودة
        </Link>
      </div>
    </div>
  );

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] text-white p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/30">
            <Icons.Lock className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-3">🚫 وصول ممنوع</h2>
          <p className="text-gray-400 mb-6">
            {accessReason === 'no_subscription' && 'هذا الكورس مدفوع. يرجى الاشتراك أولاً للوصول إلى المحتوى.'}
            {accessReason === 'max_devices' && (
              <>
                <span>لقد تجاوزت الحد الأقصى للأجهزة المسموح بها.</span>
                <span className="block mt-2 text-yellow-400 text-sm">
                  👈 الكود يسمح بجهاز واحد، والدفع يسمح بجهازين.
                </span>
                <span className="block mt-1 text-gray-500 text-xs">
                  يمكنك حذف جهاز قديم من صفحة إدارة الأجهزة.
                </span>
              </>
            )}
            {accessReason === 'expired' && 'انتهت صلاحية اشتراكك في هذا الكورس.'}
            {!['no_subscription', 'max_devices', 'expired'].includes(accessReason) && 'لا يمكنك الوصول إلى هذا المحتوى.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={video?.course_id ? `/dashboard/student/courses/${video.course_id}` : '/dashboard/student/videos'} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition">
              العودة
            </Link>
            {accessReason === 'no_subscription' && video?.course_id && (
              <Link href={`/dashboard/student/courses/${video.course_id}/payment`} className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-yellow-400/30">
                الاشتراك الآن
              </Link>
            )}
            {accessReason === 'max_devices' && video?.course_id && (
              <Link href={`/dashboard/student/courses/${video.course_id}/devices`} className="px-6 py-2.5 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-blue-400/30">
                إدارة الأجهزة
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getBackLink = () => {
    if (userRole === 'teacher') return '/dashboard/teacher/videos';
    if (video?.course_id) return `/dashboard/student/courses/${video.course_id}`;
    return '/dashboard/student/videos';
  };

  // ================================================================
  // 17. التصميم النهائي (مع طبقة حماية كاملة لمنع التفاعل مع YouTube)
  // ================================================================
  return (
    <div className={`min-h-screen text-white transition-all duration-500 relative ${focusMode ? 'fixed inset-0 z-50 p-0 flex items-center justify-center bg-black' : ''}`}>
      <AnimatedBackground />

      <div className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 ${focusMode ? 'w-full h-full' : ''}`}>
        {!focusMode && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <Link href={getBackLink()} className="text-gray-400 hover:text-yellow-400 transition flex items-center gap-2 group">
              <Icons.ArrowRight className="h-5 w-5 group-hover:-translate-x-1 transition" />
              <span className="text-sm font-medium">العودة</span>
            </Link>
            <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent truncate max-w-[40%]">
              {video.title}
            </h1>
            <div className="flex items-center gap-3">
              {duration > 0 && (
                <div className="relative">
                  <InteractiveTimer currentTime={currentTime} duration={duration} progress={progress} />
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-xs text-gray-300 font-medium">🎥 جودة عالية</span>
              </div>
            </div>
          </motion.div>
        )}

        <div className={`${focusMode ? 'h-full w-full' : ''}`}>
          <WaveBorderCard initialColor="yellow" className={`${focusMode ? 'h-full w-full rounded-none' : 'aspect-video'} shadow-2xl shadow-yellow-400/10`}>
            <div
              ref={containerRef}
              className={`relative ${focusMode ? 'h-screen w-screen' : 'aspect-video'} overflow-hidden bg-black group`}
              onDoubleClick={toggleFullscreen}
            >
              {!isValidYoutube ? (
                <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-3">
                  <Icons.VideoOff className="h-16 w-16 opacity-50" />
                  <p>رابط YouTube غير صحيح</p>
                </div>
              ) : (
                <>
                  {/* مشغل YouTube (في الخلفية) */}
                  <div id="youtube-player" className="w-full h-full absolute inset-0 z-0" />
                  
                  {/* ✅ طبقة شفافة قوية تمنع أي تفاعل مع iframe */}
                  <div 
                    className="absolute inset-0 z-5" 
                    style={{ 
                      pointerEvents: 'auto',
                      backgroundColor: 'transparent',
                      cursor: 'default',
                    }}
                  />
                  
                  {/* منع أي تفاعل مع iframe عبر CSS */}
                  <style dangerouslySetInnerHTML={{
                    __html: `
                      #youtube-player iframe {
                        pointer-events: none !important;
                      }
                      #youtube-player iframe * {
                        pointer-events: none !important;
                      }
                    `
                  }} />
                  
                  <div className="absolute inset-0 z-10 pointer-events-none" />

                  <AnimatePresence>
                    {playerLoading && !playerReady && !playerError && (
                      <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-black flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <div className="w-16 h-16 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-yellow-400/20 rounded-full blur-sm" />
                            </motion.div>
                          </div>
                          <p className="text-yellow-400/80 text-sm font-medium">جاري تجهيز المشغل...</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* زر التشغيل المركزي الأصفر - يظهر حسب الحالة */}
                  {playerReady && controlsVisible && showCenterButton && (
                    <div
                      className="absolute inset-0 z-30 flex items-center justify-center pb-8 sm:pb-0"
                      onClick={togglePlay}
                    >
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative"
                      >
                        <div className="absolute inset-0 bg-yellow-400/20 rounded-full blur-xl scale-150 group-hover:scale-200 transition-transform duration-300" />
                        <div className="relative w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-yellow-400/90 flex items-center justify-center shadow-2xl shadow-yellow-400/40 group-hover:shadow-yellow-400/60 transition-shadow">
                          <Icons.Play className="h-6 w-6 sm:h-10 sm:w-10 md:h-12 md:w-12 text-black ml-1" />
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* أزرار التخطي الجانبية (تظهر فقط عند تشغيل الفيديو وتكون الأزرار ظاهرة) */}
                  <AnimatePresence>
                    {isPlaying && controlsVisible && playerReady && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 pointer-events-none">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300" onClick={skipBackward}>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 border border-white/10 shadow-lg group">
                            <Icons.RotateCcw className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:text-yellow-400 transition-colors" />
                            <span className="absolute text-[8px] -bottom-4 text-white/70 group-hover:text-yellow-400">10s</span>
                          </div>
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300" onClick={skipForward}>
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 border border-white/10 shadow-lg group">
                            <Icons.RotateCw className="h-5 w-5 sm:h-6 sm:w-6 text-white group-hover:text-yellow-400 transition-colors" />
                            <span className="absolute text-[8px] -bottom-4 text-white/70 group-hover:text-yellow-400">10s</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* شريط التحكم السفلي المخصص */}
                  {playerReady && (
                    <div
                      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 sm:p-4 flex flex-col gap-1 sm:gap-2 pointer-events-auto z-40 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
                      onMouseEnter={() => {
                        setControlsVisible(true);
                        clearTimeout(controlsTimerRef.current);
                      }}
                    >
                      <div
                        ref={progressRef}
                        className="relative w-full h-1.5 sm:h-2.5 bg-white/15 rounded-full cursor-pointer group/progress"
                        onClick={handleProgressClick}
                      >
                        <div className="absolute top-0 left-0 h-full bg-white/20 rounded-full" style={{ width: `${bufferProgress}%` }} />
                        <div
                          className="absolute top-0 left-0 h-full rounded-full shadow-lg shadow-yellow-500/30"
                          style={{
                            width: `${progress}%`,
                            background: `linear-gradient(to right, ${getGradientColor(0)}, ${getGradientColor(progress / 100)})`
                          }}
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-5 sm:h-5 bg-white rounded-full shadow-2xl opacity-0 group-hover/progress:opacity-100 transition-all duration-200"
                          style={{ left: `${progress}%`, marginLeft: '-6px' }}
                        >
                          <div className="absolute inset-1 bg-yellow-400 rounded-full scale-0 group-hover/progress:scale-100 transition-transform duration-200" />
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 sm:gap-2 text-white flex-wrap">
                        <button
                          onClick={togglePlay}
                          className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors"
                        >
                          {isPlaying ? <Icons.Pause className="h-4 w-4 sm:h-6 sm:w-6" /> : <Icons.Play className="h-4 w-4 sm:h-6 sm:w-6" />}
                        </button>
                        <button onClick={skipBackward} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors">
                          <Icons.SkipBack className="h-3 w-3 sm:h-5 sm:w-5" />
                        </button>
                        <button onClick={skipForward} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors">
                          <Icons.SkipForward className="h-3 w-3 sm:h-5 sm:w-5" />
                        </button>
                        <span className="text-[8px] sm:text-xs text-gray-300 font-mono min-w-[40px] sm:min-w-[80px]">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        <button onClick={toggleMute} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors">
                          {muted ? <Icons.VolumeX className="h-3 w-3 sm:h-5 sm:w-5" /> : <Icons.Volume2 className="h-3 w-3 sm:h-5 sm:w-5" />}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={muted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-12 sm:w-20 h-0.5 sm:h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 sm:[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-2 sm:[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          style={{
                            backgroundImage: `linear-gradient(to right, ${getGradientColor(muted ? 0 : volume)}, ${getGradientColor(muted ? 0 : volume)})`,
                            backgroundColor: muted ? '#4a4a4a' : undefined,
                          }}
                        />

                        <button
                          onClick={toggleCaptions}
                          className={`p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors ${captionsEnabled ? 'text-yellow-400' : ''}`}
                          title={captionsEnabled ? (language === 'ar' ? 'إخفاء الترجمة' : 'Hide Captions') : (language === 'ar' ? 'إظهار الترجمة' : 'Show Captions')}
                        >
                          <Icons.ClosedCaption className="h-3 w-3 sm:h-5 sm:w-5" />
                        </button>

                        <div className="relative">
                          <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }} className="px-1 sm:px-2 py-0.5 rounded-lg hover:bg-white/10 transition-colors text-[8px] sm:text-xs font-bold">
                            {playbackRate}x
                          </button>
                          {showSpeedMenu && (
                            <div className="absolute bottom-full mb-2 left-0 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl py-1 shadow-2xl z-50 w-16 sm:w-20">
                              {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                <button key={rate} onClick={() => changePlaybackRate(rate)} className={`block w-full text-left px-2 sm:px-3 py-1 text-[8px] sm:text-xs hover:bg-white/10 transition-colors ${rate === playbackRate ? 'text-yellow-400' : 'text-white'}`}>
                                  {rate}x
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {qualities.length > 0 && (
                          <div className="relative">
                            <button onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors">
                              <Icons.Settings className="h-3 w-3 sm:h-5 sm:w-5" />
                            </button>
                            {showQualityMenu && (
                              <div className="absolute bottom-full mb-2 left-0 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-xl py-1 shadow-2xl z-50 w-20 sm:w-24">
                                <button onClick={() => changeQuality('auto')} className={`block w-full text-left px-2 sm:px-3 py-1 text-[8px] sm:text-xs hover:bg-white/10 transition-colors ${currentQuality === 'auto' ? 'text-yellow-400' : 'text-white'}`}>تلقائي</button>
                                {qualities.map(q => (
                                  <button key={q} onClick={() => changeQuality(q)} className={`block w-full text-left px-2 sm:px-3 py-1 text-[8px] sm:text-xs hover:bg-white/10 transition-colors ${currentQuality === q ? 'text-yellow-400' : 'text-white'}`}>{q}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <button onClick={toggleFocusMode} className={`p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors ${focusMode ? 'text-yellow-400' : ''}`} title="وضع التركيز (Z)">
                          <Icons.Eye className="h-3 w-3 sm:h-5 sm:w-5" />
                        </button>
                        <button onClick={toggleFullscreen} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 transition-colors ml-auto">
                          <Icons.Maximize className="h-3 w-3 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </WaveBorderCard>
        </div>

        {!focusMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400/90 mb-3 flex items-center gap-2">
                <Icons.FileText className="h-5 w-5" /> تفاصيل الدرس
              </h3>
              {video.description ? (
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{video.description}</p>
              ) : (
                <p className="text-gray-500 italic">لا يوجد وصف لهذا الفيديو.</p>
              )}
            </div>

            <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Icons.Calendar className="h-4 w-4 text-yellow-500" />
                  <span>{new Date(video.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {userRole === 'teacher' && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Icons.Eye className="h-4 w-4 text-blue-400" />
                    <span>{video.views || 0} مشاهدة</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Icons.Clock className="h-4 w-4 text-yellow-400" />
                  <span>المدة: {duration > 0 ? formatTimeDetailed(duration) : 'غير محددة'}</span>
                </div>
                {duration > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Icons.PieChart className="h-4 w-4 text-emerald-400" />
                    <span>شاهدت: {Math.round((currentTime / duration) * 100)}%</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Icons.Tv className="h-4 w-4 text-emerald-400" />
                  <span>جودة عالية</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-start gap-2">
                <Icons.AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  يمكنك التحكم بالفيديو باستخدام الأزرار أو اختصارات لوحة المفاتيح.
                  <span className="block text-yellow-400/60 mt-1">⏱ اضغط على التايمر لتغيير العرض (متبقي / نسبة / مشاهدة)</span>
                  <span className="block text-yellow-400/60 mt-0.5">🔤 اضغط C لتشغيل/إيقاف الترجمة</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}