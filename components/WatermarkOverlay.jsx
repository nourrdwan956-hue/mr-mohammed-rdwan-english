// components/WatermarkOverlay.jsx
// ============================================================
// طبقة البصمة المائية الديناميكية
// تعرض اسم الطالب، رقم هاتفه، ورقم ولي أمره على الفيديو
// مع حركة عشوائية كل 5 ثواني لصعوبة الإزالة
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function WatermarkOverlay({ children }) {
  // بيانات المستخدم الافتراضية (في حال عدم تسجيل الدخول)
  const [userData, setUserData] = useState({
    name: 'طالب غير مسجل',
    phone: '٠١٢٣٤٥٦٧٨٩',
    parentPhone: '٠١٢٣٤٥٦٧٨٩',
  });

  // جلب بيانات المستخدم من Supabase عند تحميل المكون
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. الحصول على المستخدم الحالي
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn('⚠️ No user logged in, using default watermark data.');
          return;
        }

        // 2. جلب بيانات الملف الشخصي من جدول profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, phone, parent_phone')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.warn('⚠️ Could not fetch profile:', profileError.message);
          return;
        }

        // 3. تحديث البيانات إذا وجدت
        if (profile) {
          setUserData({
            name: profile.full_name || 'طالب',
            phone: profile.phone || '٠١٢٣٤٥٦٧٨٩',
            parentPhone: profile.parent_phone || '٠١٢٣٤٥٦٧٨٩',
          });
        }
      } catch (error) {
        console.error('❌ Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  // حركة عشوائية للبصمة كل 5 ثواني (لجعل إزالتها صعبة)
  useEffect(() => {
    const interval = setInterval(() => {
      const watermark = document.getElementById('watermark-text');
      if (watermark) {
        // نطاق الحركة: 5% إلى 85% من عرض/ارتفاع الحاوية
        const x = Math.random() * 80 + 5;
        const y = Math.random() * 80 + 5;
        watermark.style.left = `${x}%`;
        watermark.style.top = `${y}%`;
      }
    }, 5000); // كل 5 ثواني

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* محتوى الفيديو (الأبناء) */}
      {children}

      {/* طبقة البصمة المائية الشفافة */}
      <div
        className="absolute inset-0 pointer-events-none select-none"
        style={{ zIndex: 10 }}
      >
        <div
          id="watermark-text"
          className="absolute bottom-4 left-4 text-white/30 text-xs font-mono bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 transition-all duration-1000 ease-in-out"
          style={{
            textShadow: '0 0 10px rgba(0,0,0,0.8)',
          }}
        >
          <div className="flex flex-col gap-0.5">
            <span>👤 {userData.name}</span>
            <span>📱 {userData.phone}</span>
            <span>👪 {userData.parentPhone}</span>
          </div>
        </div>
        {/* يمكن إضافة نسخة ثانية من البصمة هنا (مكررة) لزيادة الصعوبة */}
        {/* <div className="absolute top-4 right-4 text-white/20 text-[8px] font-mono bg-black/20 backdrop-blur-sm px-2 py-1 rounded border border-white/5">
          {userData.name} | {userData.phone}
        </div> */}
      </div>
    </div>
  );
}