// ================================================================
// 📁 components/WaveBorderCard.jsx
// ✅ نسخة محسّنة – تدعم الموبايل بكفاءة عالية
// ✅ استخدام requestAnimationFrame مع تقليل التحديثات على الموبايل
// ✅ إضافة خاصية تعطيل كامل للتأثير على الأجهزة الصغيرة جداً
// ================================================================

'use client';

import { useState, useEffect, useRef, memo } from 'react';

// ================================================================
// ألوان البطاقات – نفس الألوان السابقة
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
// المكون الرئيسي – مع تحسينات الأداء للموبايل
// ================================================================
const WaveBorderCard = ({
  children,
  className = '',
  initialColor = 'blue',
  onColorChange,
  // 🆕 خاصية لتعطيل التأثير على الموبايل (اختياري)
  disableMobile = true,
}) => {
  const [color, setColor] = useState(
    CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]
  );
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);
  const rafRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // ================================================================
  // كشف الجهاز المحمول
  // ================================================================
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // تحديث المرجع عند تغير اللون
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  // ================================================================
  // حلقة الأنيميشن – متكيفة مع الموبايل
  // ================================================================
  useEffect(() => {
    // إذا كان الموبايل والتعطيل مفعلاً، لا نبدأ الأنيميشن
    if (disableMobile && isMobile) {
      return;
    }

    // عدد الدرجات التي تزيد كل إطار – أبطأ على الموبايل
    const step = isMobile ? 1 : 2; // 1 درجة على الموبايل، 2 درجة على الديسكتوب
    const frameInterval = isMobile ? 2 : 1; // كل إطارين على الموبايل (أبطأ)

    let frameCount = 0;

    const animate = () => {
      if (!isMounted.current) return;

      frameCount++;
      // تخطي بعض الإطارات على الموبايل لتقليل الحمل
      if (frameCount % frameInterval === 0) {
        setRotation(prev => {
          const newRot = prev + step;
          if (newRot >= 360) {
            const newColor = getRandomColor([colorRef.current.name]);
            setColor(newColor);
            if (onColorChange) onColorChange(newColor);
            return 0;
          }
          return newRot;
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      isMounted.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [onColorChange, isMobile, disableMobile]);

  // ================================================================
  // التدرج اللوني للحدود
  // ================================================================
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

  // ================================================================
  // العرض – مع تعطيل backdrop-blur على الموبايل
  // ================================================================
  return (
    <div className={`relative rounded-2xl overflow-hidden group ${className}`}>
      {/* طبقة الحدود المتدرجة – تُخفى على الموبايل إذا طُلب ذلك */}
      {(!disableMobile || !isMobile) && (
        <div className="absolute inset-0 rounded-2xl" style={gradientStyle} />
      )}

      {/* المحتوى الداخلي – مع backdrop-blur شرطي */}
      <div
        className={`relative z-10 h-full w-full rounded-2xl border border-[var(--border-color)] ${
          // على الموبايل نستخدم خلفية صلبة بدلاً من التأثير الزجاجي
          isMobile
            ? 'bg-[var(--bg-card)]'
            : 'backdrop-blur-sm bg-[var(--bg-card)]'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

// ================================================================
// تصدير المكون مع React.memo لمنع إعادة الرسم غير الضرورية
// ================================================================
export default memo(WaveBorderCard);